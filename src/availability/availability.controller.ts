import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserIdQueryDto } from '../common/user-id-query.dto';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  /** Always records a window for the logged-in user. */
  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateAvailabilityDto) {
    return this.service.create(userId, dto);
  }

  /** Own windows by default; ?userId= shows a colleague's, to find common free time. */
  @Get()
  list(@CurrentUser() userId: string, @Query() query: UserIdQueryDto) {
    return this.service.list(query.userId ?? userId);
  }
}
