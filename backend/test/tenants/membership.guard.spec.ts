import { ForbiddenException } from '@nestjs/common';
import { MembershipGuard } from 'src/tenants/api/membership.guard';

describe('MembershipGuard', () => {
  let guard: MembershipGuard;

  const reflector = { getAllAndOverride: jest.fn() };
  const tenantRepository = { isActiveMember: jest.fn() };
  const roleRepository = { isRoot: jest.fn() };

  const buildContext = (user?: { sub: string }, tenant?: { tenant_id: string }, platformAdmin?: boolean) => {
    const request: any = { user, tenant, platformAdmin };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    } as any;
  };

  const expectNotAMember = async (context: any) => {
    const error = await guard.canActivate(context).catch((e) => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({ code: 'NOT_A_MEMBER' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
    roleRepository.isRoot.mockResolvedValue(false);
    guard = new MembershipGuard(reflector as any, tenantRepository as any, roleRepository as any);
  });

  it('debe permitir una ruta publica sin consultar la base de datos', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    expect(tenantRepository.isActiveMember).not.toHaveBeenCalled();
  });

  it('debe fallar con NOT_A_MEMBER cuando falta request.user', async () => {
    await expectNotAMember(buildContext(undefined, { tenant_id: 't1' }));
    expect(tenantRepository.isActiveMember).not.toHaveBeenCalled();
  });

  it('debe fallar con NOT_A_MEMBER cuando falta request.tenant', async () => {
    await expectNotAMember(buildContext({ sub: 'u1' }));
    expect(tenantRepository.isActiveMember).not.toHaveBeenCalled();
  });

  it('debe fallar con NOT_A_MEMBER cuando el usuario no es miembro activo del tenant', async () => {
    tenantRepository.isActiveMember.mockResolvedValue(false);

    await expectNotAMember(buildContext({ sub: 'u1' }, { tenant_id: 't1' }));
    expect(tenantRepository.isActiveMember).toHaveBeenCalledWith('t1', 'u1');
  });

  it('debe permitir cuando el usuario es miembro activo del tenant', async () => {
    tenantRepository.isActiveMember.mockResolvedValue(true);

    await expect(guard.canActivate(buildContext({ sub: 'u1' }, { tenant_id: 't1' }))).resolves.toBe(true);
    expect(tenantRepository.isActiveMember).toHaveBeenCalledWith('t1', 'u1');
  });

  it('debe permitir a root en cualquier tenant sin ser miembro', async () => {
    tenantRepository.isActiveMember.mockResolvedValue(false);
    roleRepository.isRoot.mockResolvedValue(true);

    await expect(guard.canActivate(buildContext({ sub: 'root' }, { tenant_id: 't1' }))).resolves.toBe(true);
  });

  it('debe permitir a root en el contexto admin (sin tenant)', async () => {
    roleRepository.isRoot.mockResolvedValue(true);

    await expect(guard.canActivate(buildContext({ sub: 'root' }, undefined, true))).resolves.toBe(true);
    expect(tenantRepository.isActiveMember).not.toHaveBeenCalled();
  });

  it('debe rechazar con NOT_A_MEMBER a un no-root en el contexto admin', async () => {
    await expectNotAMember(buildContext({ sub: 'u1' }, undefined, true));
  });
});
