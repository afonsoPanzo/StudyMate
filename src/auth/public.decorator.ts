import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Marks a route as reachable without a login. Everything else requires one. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
