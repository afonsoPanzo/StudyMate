import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserIdQueryDto } from '../common/user-id-query.dto';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Post()
  create(@Body() dto: CreateAvailabilityDto) {
    return this.service.create(dto);
  }

  @Get()
  list(@Query() query: UserIdQueryDto) {
    return this.service.list(query.userId);
  }
}
