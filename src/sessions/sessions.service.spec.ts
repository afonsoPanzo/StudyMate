import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from './sessions.service';

const HOUR = 3_600_000;
const future = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

function buildPrismaMock() {
  const prisma = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    user: { findMany: jest.fn() },
    availability: { findFirst: jest.fn().mockResolvedValue(null) },
    studySession: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn().mockImplementation(({ data }) => ({ id: 's1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => ({ id: 's1', ...data })),
    },
    sessionParticipant: { findMany: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  return prisma;
}

describe('SessionsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: SessionsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new SessionsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    const dto = () => ({
      title: 'Cálculo II',
      startAt: future(24),
      endAt: future(26),
      creatorId: 'afonso',
      participantIds: ['sebastiana'],
    });

    beforeEach(() => prisma.user.findMany.mockResolvedValue([{ id: 'afonso' }, { id: 'sebastiana' }]));

    it('creates a proposal with the creator already accepted', async () => {
      await service.create(dto());

      const { data } = prisma.studySession.create.mock.calls[0][0];
      expect(data.participants.create).toEqual([
        expect.objectContaining({ userId: 'afonso', response: 'ACCEPTED' }),
        expect.objectContaining({ userId: 'sebastiana', response: 'PENDING', respondedAt: null }),
      ]);
    });

    it('locks every participant before checking conflicts', async () => {
      await service.create(dto());
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('rejects an interval that ends before it starts', async () => {
      await expect(service.create({ ...dto(), endAt: future(23) })).rejects.toThrow(BadRequestException);
    });

    it('rejects a session in the past', async () => {
      await expect(service.create({ ...dto(), startAt: future(-2), endAt: future(-1) })).rejects.toThrow(
        'must start in the future',
      );
    });

    it('rejects a session with nobody but the creator', async () => {
      await expect(service.create({ ...dto(), participantIds: ['afonso'] })).rejects.toThrow(BadRequestException);
    });

    it('rejects unknown users', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'afonso' }]);
      await expect(service.create(dto())).rejects.toThrow('do not exist');
    });

    it('rejects when a participant is marked unavailable', async () => {
      prisma.availability.findFirst.mockResolvedValue({ id: 'a1' });
      await expect(service.create(dto())).rejects.toThrow(ConflictException);
      expect(prisma.studySession.create).not.toHaveBeenCalled();
    });

    it('rejects when a participant has an overlapping confirmed session', async () => {
      prisma.studySession.findFirst.mockResolvedValue({ id: 'other' });
      await expect(service.create(dto())).rejects.toThrow(ConflictException);
      expect(prisma.studySession.create).not.toHaveBeenCalled();
    });
  });

  describe('respond', () => {
    const session = (overrides: Record<string, unknown> = {}) => ({
      id: 's1',
      status: 'PROPOSED',
      startAt: new Date(future(24)),
      endAt: new Date(future(26)),
      participants: [
        { userId: 'afonso', response: 'ACCEPTED' },
        { userId: 'sebastiana', response: 'PENDING' },
      ],
      ...overrides,
    });

    beforeEach(() => {
      prisma.sessionParticipant.findMany.mockResolvedValue([{ userId: 'afonso' }, { userId: 'sebastiana' }]);
      prisma.studySession.findUnique.mockResolvedValue(session());
    });

    const nextStatus = () => prisma.studySession.update.mock.calls[0][0].data.status;

    it('confirms once the last participant accepts', async () => {
      await service.respond('s1', 'sebastiana', 'ACCEPTED');
      expect(nextStatus()).toBe('CONFIRMED');
    });

    it('stays proposed while someone has not answered', async () => {
      prisma.sessionParticipant.findMany.mockResolvedValue([
        { userId: 'afonso' },
        { userId: 'sebastiana' },
        { userId: 'carla' },
      ]);
      prisma.studySession.findUnique.mockResolvedValue(
        session({
          participants: [
            { userId: 'afonso', response: 'ACCEPTED' },
            { userId: 'sebastiana', response: 'PENDING' },
            { userId: 'carla', response: 'PENDING' },
          ],
        }),
      );
      await service.respond('s1', 'sebastiana', 'ACCEPTED');
      expect(nextStatus()).toBe('PROPOSED');
    });

    it('rejects the proposal when anyone refuses', async () => {
      await service.respond('s1', 'sebastiana', 'REJECTED');
      expect(nextStatus()).toBe('REJECTED');
    });

    it('refuses to confirm over a conflicting confirmed session', async () => {
      prisma.studySession.findFirst.mockResolvedValue({ id: 'other' });
      await expect(service.respond('s1', 'sebastiana', 'ACCEPTED')).rejects.toThrow(ConflictException);
      expect(prisma.sessionParticipant.update).not.toHaveBeenCalled();
    });

    it('checks every participant for conflicts when confirming', async () => {
      await service.respond('s1', 'sebastiana', 'ACCEPTED');
      const { where } = prisma.studySession.findFirst.mock.calls[0][0];
      expect(where.participants.some.userId.in).toEqual(['afonso', 'sebastiana']);
      expect(where.id).toEqual({ not: 's1' });
    });

    it('refuses users who were not invited', async () => {
      await expect(service.respond('s1', 'intruso', 'ACCEPTED')).rejects.toThrow(ForbiddenException);
    });

    it('refuses to answer a proposal that is already closed', async () => {
      prisma.studySession.findUnique.mockResolvedValue(session({ status: 'CONFIRMED' }));
      await expect(service.respond('s1', 'sebastiana', 'ACCEPTED')).rejects.toThrow('no longer open');
    });

    it('returns 404 for an unknown session', async () => {
      prisma.sessionParticipant.findMany.mockResolvedValue([]);
      await expect(service.respond('nope', 'afonso', 'ACCEPTED')).rejects.toThrow(NotFoundException);
    });
  });
});
