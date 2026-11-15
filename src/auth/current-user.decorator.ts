import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The id of the logged-in user, taken from the verified access token. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => ctx.switchToHttp().getRequest().user.id,
);
