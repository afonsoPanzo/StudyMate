import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsOffsetDateString } from '../../common/is-offset-date-string.decorator';

export class CreateSessionDto {
  @IsString() @MinLength(2) @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(120) subject?: string;
  @IsOffsetDateString() startAt!: string;
  @IsOffsetDateString() endAt!: string;

  /** Everyone invited besides the logged-in user, who is the creator. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  participantIds!: string[];
}
