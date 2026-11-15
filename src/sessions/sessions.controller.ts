import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateSessionDto } from './dto/create-session.dto';
import { RespondDto } from './dto/respond.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateSessionDto) {
    return this.service.create(userId, dto);
  }

  /** Only the sessions the logged-in user takes part in. */
  @Get()
  list(@CurrentUser() userId: string) {
    return this.service.listForUser(userId);
  }

  @Post(':id/respond')
  @HttpCode(200)
  respond(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: RespondDto) {
    return this.service.respond(id, userId, dto.response);
  }
}
