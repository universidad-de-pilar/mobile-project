import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/auth/api/public.decorator';
import { type IRoleRepository, ROLE_REPOSITORY } from 'src/roles/domain/role.repository';
import { type ITenantRepository, TENANT_REPOSITORY } from '../domain/tenant.repository';

@Injectable()
export class MembershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TENANT_REPOSITORY) private readonly tenantRepository: ITenantRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) {
      return true;
    }

    const { user, tenant } = context.switchToHttp().getRequest();
    // Root administers every tenant and is the only user allowed in the admin context (no tenant).
    const allowed =
      user?.sub &&
      ((tenant && (await this.tenantRepository.isActiveMember(tenant.tenant_id, user.sub))) ||
        (await this.roleRepository.isRoot(user.sub)));
    if (!allowed) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Not an active member of this tenant',
        error: 'Forbidden',
        code: 'NOT_A_MEMBER',
      });
    }
    return true;
  }
}
