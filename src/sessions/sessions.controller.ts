import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { UserIdQueryDto } from '../common/user-id-query.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { RespondDto } from './dto/respond.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.service.create(dto);
  }

  @Get()
  list(@Query() query: UserIdQueryDto) {
    return this.service.listForUser(query.userId);
  }

  @Post(':id/respond')
  @HttpCode(200)
  respond(@Param('id') id: string, @Body() dto: RespondDto) {
    return this.service.respond(id, dto.userId, dto.response);
  }
}
