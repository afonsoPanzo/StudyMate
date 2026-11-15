import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

/**
 * ISO-8601 timestamp that carries an explicit offset ("Z" or "+01:00").
 * Timestamps without an offset are ambiguous, so the API refuses them.
 */
export function IsOffsetDateString() {
  return applyDecorators(
    IsISO8601({ strict: true }),
    Matches(/T.*(Z|[+-]\d{2}:\d{2})$/, {
      message: '$property must be an ISO-8601 timestamp with an explicit offset, e.g. 2026-11-20T16:00:00+01:00',
    }),
  );
}
