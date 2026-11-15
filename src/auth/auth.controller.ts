import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { RequestLinkDto, VerifyDto } from './dto/auth.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('request-link')
  @HttpCode(202)
  async requestLink(@Body() dto: RequestLinkDto) {
    const link = await this.auth.requestLink(dto.email);
    const message = 'If this email is registered, a login link has been sent.';
    // Local development without a mail server: hand the link back so it can be opened.
    const showLink = process.env.DEV_SHOW_LOGIN_LINK === 'true' && process.env.NODE_ENV !== 'production';
    return showLink && link ? { message, devLoginLink: link } : { message };
  }

  @Public()
  @Post('verify')
  @HttpCode(200)
  verify(@Body() dto: VerifyDto) {
    return this.auth.verify(dto.token);
  }

  /** Target of the emailed link until a frontend exists to receive it. */
  @Public()
  @Get('verify')
  verifyFromLink(@Query() dto: VerifyDto) {
    return this.auth.verify(dto.token);
  }

  @Get('me')
  me(@CurrentUser() userId: string) {
    return this.auth.me(userId);
  }
}
