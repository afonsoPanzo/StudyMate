import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SessionsModule } from './sessions/sessions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, AvailabilityModule, SessionsModule],
  controllers: [HealthController],
})
export class AppModule {}
