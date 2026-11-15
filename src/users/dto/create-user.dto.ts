import { IsEmail, IsOptional, IsString, IsTimeZone, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;

  @IsOptional() @IsEmail() email?: string;

  /** E.164, e.g. +36201234567 — the format the WhatsApp Cloud API uses. */
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'phone must be in E.164 format, e.g. +36201234567' })
  phone?: string;

  @IsOptional() @IsTimeZone() timezone?: string;
}
