import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateAvailabilityDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) throw new BadRequestException('endAt must be after startAt');

    return this.prisma.availability.create({
      data: { userId, startAt, endAt, status: dto.status, note: dto.note },
    });
  }

  list(userId: string) {
    return this.prisma.availability.findMany({ where: { userId }, orderBy: { startAt: 'asc' } });
  }
}
