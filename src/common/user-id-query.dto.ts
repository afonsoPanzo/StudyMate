import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UserIdQueryDto {
  /** Defaults to the logged-in user. */
  @IsOptional() @IsString() @IsNotEmpty() userId?: string;
}
