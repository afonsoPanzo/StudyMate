import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AvailabilityStatus, ParticipantResponse, Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionResponse } from './dto/respond.dto';

type Tx = Prisma.TransactionClient;
type Interval = { startAt: Date; endAt: Date };

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSessionDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) throw new BadRequestException('endAt must be after startAt');
    if (startAt <= new Date()) throw new BadRequestException('A session must start in the future');

    const userIds = [...new Set([dto.creatorId, ...dto.participantIds])];
    if (userIds.length < 2) {
      throw new BadRequestException('A session needs at least one participant besides the creator');
    }

    return this.prisma.$transaction(async tx => {
      await this.lockUsers(tx, userIds);

      const users = await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true } });
      if (users.length !== userIds.length) throw new BadRequestException('One or more users do not exist');

      await this.assertNotUnavailable(tx, userIds, { startAt, endAt });
      await this.assertNoConfirmedConflict(tx, userIds, { startAt, endAt });

      const now = new Date();
      return tx.studySession.create({
        data: {
          title: dto.title.trim(),
          subject: dto.subject?.trim(),
          startAt,
          endAt,
          creatorId: dto.creatorId,
          participants: {
            create: userIds.map(userId => {
              const isCreator = userId === dto.creatorId;
              return {
                userId,
                response: isCreator ? ParticipantResponse.ACCEPTED : ParticipantResponse.PENDING,
                respondedAt: isCreator ? now : null,
              };
            }),
          },
        },
        include: { participants: true },
      });
    });
  }

  listForUser(userId: string) {
    return this.prisma.studySession.findMany({
      where: { participants: { some: { userId } } },
      include: { participants: true, creator: { select: { id: true, name: true } } },
      orderBy: { startAt: 'asc' },
    });
  }

  async respond(sessionId: string, userId: string, response: SessionResponse) {
    const invited = await this.prisma.sessionParticipant.findMany({
      where: { sessionId },
      select: { userId: true },
    });
    if (!invited.length) throw new NotFoundException('Session not found');
    const userIds = invited.map(p => p.userId);
    if (!userIds.includes(userId)) throw new ForbiddenException('User is not invited to this session');

    return this.prisma.$transaction(async tx => {
      // Lock first, then read: the state checked below cannot change under us.
      await this.lockUsers(tx, userIds);

      const session = await tx.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });
      if (!session) throw new NotFoundException('Session not found');
      if (session.status !== SessionStatus.PROPOSED) {
        throw new BadRequestException('This proposal is no longer open');
      }

      let nextStatus: SessionStatus = SessionStatus.REJECTED;
      if (response === 'ACCEPTED') {
        const everyoneAccepted = session.participants.every(
          p => p.userId === userId || p.response === ParticipantResponse.ACCEPTED,
        );
        nextStatus = everyoneAccepted ? SessionStatus.CONFIRMED : SessionStatus.PROPOSED;
        // On confirmation every participant is re-checked: someone who accepted
        // earlier may have had another session confirmed in the meantime.
        await this.assertNoConfirmedConflict(tx, everyoneAccepted ? userIds : [userId], session, sessionId);
      }

      await tx.sessionParticipant.update({
        where: { sessionId_userId: { sessionId, userId } },
        data: { response, respondedAt: new Date() },
      });
      return tx.studySession.update({
        where: { id: sessionId },
        data: { status: nextStatus },
        include: { participants: true },
      });
    });
  }

  /**
   * Serialises scheduling changes per user for the rest of the transaction, so two
   * concurrent requests cannot both pass the conflict check and double-book someone.
   * Sorted order keeps concurrent transactions from deadlocking.
   */
  private async lockUsers(tx: Tx, userIds: string[]) {
    for (const id of [...userIds].sort()) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    }
  }

  private async assertNoConfirmedConflict(
    tx: Tx,
    userIds: string[],
    window: Interval,
    excludeSessionId?: string,
  ) {
    const conflict = await tx.studySession.findFirst({
      where: {
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
        status: SessionStatus.CONFIRMED,
        startAt: { lt: window.endAt },
        endAt: { gt: window.startAt },
        participants: { some: { userId: { in: userIds } } },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('A participant already has a confirmed session in this time window');
    }
  }

  private async assertNotUnavailable(tx: Tx, userIds: string[], window: Interval) {
    const busy = await tx.availability.findFirst({
      where: {
        userId: { in: userIds },
        status: AvailabilityStatus.UNAVAILABLE,
        startAt: { lt: window.endAt },
        endAt: { gt: window.startAt },
      },
      select: { id: true },
    });
    if (busy) throw new ConflictException('A participant is marked as unavailable in this time window');
  }
}
