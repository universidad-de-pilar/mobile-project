import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// The authenticated user's id (JWT `sub`).
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => context.switchToHttp().getRequest().user.sub,
);
