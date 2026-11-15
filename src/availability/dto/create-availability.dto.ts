import { AvailabilityStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsOffsetDateString } from '../../common/is-offset-date-string.decorator';

export class CreateAvailabilityDto {
  @IsString() @IsNotEmpty() userId!: string;
  @IsOffsetDateString() startAt!: string;
  @IsOffsetDateString() endAt!: string;
  @IsOptional() @IsEnum(AvailabilityStatus) status?: AvailabilityStatus;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}
