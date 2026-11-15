import { IsEmail, IsString, Length } from 'class-validator';

export class RequestLinkDto {
  @IsEmail() email!: string;
}

export class VerifyDto {
  @IsString() @Length(20, 200) token!: string;
}
