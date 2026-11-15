import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter | null;

  constructor() {
    const smtpUrl = process.env.SMTP_URL;
    if (!smtpUrl && process.env.NODE_ENV === 'production') {
      throw new Error('SMTP_URL is required in production: login links must be emailed, never logged');
    }
    this.transport = smtpUrl ? createTransport(smtpUrl) : null;
  }

  async sendLoginLink(to: string, link: string, minutesValid: number) {
    if (!this.transport) {
      // Local development only: no mail server, so the link goes to the console.
      this.logger.warn(`SMTP_URL not set. Login link for ${to}: ${link}`);
      return;
    }
    await this.transport.sendMail({
      from: process.env.MAIL_FROM ?? 'StudyMate <no-reply@studymate.local>',
      to,
      subject: 'O teu link de acesso ao StudyMate',
      text:
        `Olá!\n\nUsa este link para entrar no StudyMate:\n${link}\n\n` +
        `O link é válido durante ${minutesValid} minutos e só pode ser usado uma vez.\n` +
        `Se não pediste este acesso, ignora este email.`,
    });
  }
}
