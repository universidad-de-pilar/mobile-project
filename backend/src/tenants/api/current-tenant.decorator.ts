import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Tenant } from '../domain/tenant.entity';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Tenant => context.switchToHttp().getRequest().tenant,
);
