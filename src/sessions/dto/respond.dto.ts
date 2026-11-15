import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const RESPONSES = ['ACCEPTED', 'REJECTED'] as const;
export type SessionResponse = (typeof RESPONSES)[number];

export class RespondDto {
  @IsString() @IsNotEmpty() userId!: string;
  @IsIn(RESPONSES) response!: SessionResponse;
}
