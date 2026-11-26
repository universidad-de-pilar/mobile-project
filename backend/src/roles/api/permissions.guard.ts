import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/auth/api/public.decorator';
import { type IRoleRepository, ROLE_REPOSITORY } from '../domain/role.repository';
import { PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, targets);
    if (!required?.length) return true;

    const userId = context.switchToHttp().getRequest().user?.sub;
    if (!userId) throw new ForbiddenException();

    if (await this.roleRepository.isRoot(userId)) return true;

    const owned = new Set(await this.roleRepository.getPermissionCodesByUserId(userId));
    if (!required.every((code) => owned.has(code))) throw new ForbiddenException();
    return true;
  }
}
