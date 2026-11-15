import { IsIn } from 'class-validator';

export const RESPONSES = ['ACCEPTED', 'REJECTED'] as const;
export type SessionResponse = (typeof RESPONSES)[number];

export class RespondDto {
  @IsIn(RESPONSES) response!: SessionResponse;
}
