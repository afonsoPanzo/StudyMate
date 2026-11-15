import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        timezone: dto.timezone,
      },
    });
  }

  /** Directory of students. Contact details stay private to each account. */
  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, timezone: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
