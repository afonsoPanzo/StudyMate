import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

export const LINK_TTL_MINUTES = 15;
export const MAX_LINKS_PER_WINDOW = 3;
export const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  /**
   * Emails a single-use login link. Never reveals whether the email is registered:
   * the caller always gets the same answer. Returns the link so that local development
   * can show it; the controller only exposes it when explicitly enabled.
   */
  async requestLink(email: string): Promise<string | undefined> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user?.email) return;

    const windowStart = new Date(Date.now() - LINK_TTL_MINUTES * 60_000);
    const recent = await this.prisma.loginToken.count({
      where: { userId: user.id, createdAt: { gt: windowStart } },
    });
    if (recent >= MAX_LINKS_PER_WINDOW) return;

    const token = randomBytes(32).toString('base64url');
    await this.prisma.loginToken.create({
      data: {
        userId: user.id,
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + LINK_TTL_MINUTES * 60_000),
      },
    });

    const base = process.env.APP_URL ?? 'http://localhost:3000';
    const link = `${base}/api/auth/verify?token=${token}`;
    try {
      await this.mail.sendLoginLink(user.email, link, LINK_TTL_MINUTES);
    } catch (error) {
      this.logger.error(`Could not send login link: ${(error as Error).message}`);
    }
    return link;
  }

  /** Exchanges a login-link token for an access token. Each link works once. */
  async verify(token: string) {
    const now = new Date();
    const record = await this.prisma.loginToken.findUnique({ where: { tokenHash: hash(token) } });
    if (!record) throw new UnauthorizedException('Invalid or expired login link');

    // Conditional update makes the "use once" rule hold even for simultaneous clicks.
    const { count } = await this.prisma.loginToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (count !== 1) throw new UnauthorizedException('Invalid or expired login link');

    return {
      accessToken: await this.jwt.signAsync({ sub: record.userId }),
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return user;
  }
}
