import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService, MAX_LINKS_PER_WINDOW } from './auth.service';
import { MailService } from './mail.service';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('AuthService', () => {
  const user = { id: 'u1', email: 'afonso@example.com' };
  let prisma: any;
  let mail: { sendLoginLink: jest.Mock };
  let jwt: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      loginToken: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mail = { sendLoginLink: jest.fn().mockResolvedValue(undefined) };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt') };
    service = new AuthService(
      prisma as PrismaService,
      jwt as unknown as JwtService,
      mail as unknown as MailService,
    );
  });

  describe('requestLink', () => {
    it('emails a link and stores only the hash of its token', async () => {
      await service.requestLink('  Afonso@Example.com ');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'afonso@example.com' } });
      const [to, link] = mail.sendLoginLink.mock.calls[0];
      const token = new URL(link).searchParams.get('token')!;
      const stored = prisma.loginToken.create.mock.calls[0][0].data;

      expect(to).toBe(user.email);
      expect(token.length).toBeGreaterThanOrEqual(40);
      expect(stored.tokenHash).toBe(sha256(token));
      expect(stored.tokenHash).not.toContain(token);
      expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('does nothing, silently, for an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.requestLink('ghost@example.com')).resolves.toBeUndefined();
      expect(prisma.loginToken.create).not.toHaveBeenCalled();
      expect(mail.sendLoginLink).not.toHaveBeenCalled();
    });

    it('stops sending after too many requests in a short time', async () => {
      prisma.loginToken.count.mockResolvedValue(MAX_LINKS_PER_WINDOW);
      await service.requestLink(user.email);
      expect(mail.sendLoginLink).not.toHaveBeenCalled();
    });

    it('does not leak a mail failure to the caller', async () => {
      mail.sendLoginLink.mockRejectedValue(new Error('smtp down'));
      await expect(service.requestLink(user.email)).resolves.toBeUndefined();
    });
  });

  describe('verify', () => {
    beforeEach(() => prisma.loginToken.findUnique.mockResolvedValue({ id: 't1', userId: 'u1' }));

    it('exchanges a valid token for an access token', async () => {
      const result = await service.verify('raw-token');

      expect(prisma.loginToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: sha256('raw-token') } });
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1' });
      expect(result).toMatchObject({ accessToken: 'signed.jwt', tokenType: 'Bearer' });
    });

    it('only consumes tokens that are unused and not expired', async () => {
      await service.verify('raw-token');
      const { where } = prisma.loginToken.updateMany.mock.calls[0][0];
      expect(where).toMatchObject({ id: 't1', usedAt: null, expiresAt: { gt: expect.any(Date) } });
    });

    it('rejects an unknown token', async () => {
      prisma.loginToken.findUnique.mockResolvedValue(null);
      await expect(service.verify('nope')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token that was already used or has expired', async () => {
      prisma.loginToken.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.verify('raw-token')).rejects.toThrow(UnauthorizedException);
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });
  });
});
