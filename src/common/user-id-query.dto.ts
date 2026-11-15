import { IsNotEmpty, IsString } from 'class-validator';

export class UserIdQueryDto {
  @IsString() @IsNotEmpty() userId!: string;
}
