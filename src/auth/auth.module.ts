import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { ACCESS_TOKEN_TTL_SECONDS, AuthService } from './auth.service';
import { MailService } from './mail.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET must be set to a random value of at least 32 characters');
        }
        return { secret, signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
