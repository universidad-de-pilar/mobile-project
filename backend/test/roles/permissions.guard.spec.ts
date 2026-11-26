import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from 'src/roles/api/permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  const reflector = { getAllAndOverride: jest.fn() };
  const roleRepository = { getPermissionCodesByUserId: jest.fn(), isRoot: jest.fn() };

  const buildContext = (user?: { sub: string }) => {
    const request: any = { user };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    } as any;
  };

  const mockMetadata = (isPublic: boolean, required?: string[]) =>
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === 'isPublic' ? isPublic : required,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    roleRepository.isRoot.mockResolvedValue(false);
    guard = new PermissionsGuard(reflector as any, roleRepository as any);
  });

  it('debe permitir una ruta publica sin consultar la base de datos', async () => {
    mockMetadata(true, ['users.read']);

    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    expect(roleRepository.getPermissionCodesByUserId).not.toHaveBeenCalled();
  });

  it('debe permitir cuando no se requieren permisos sin consultar la base de datos', async () => {
    mockMetadata(false, []);

    await expect(guard.canActivate(buildContext({ sub: 'u1' }))).resolves.toBe(true);
    expect(roleRepository.getPermissionCodesByUserId).not.toHaveBeenCalled();
  });

  it('debe fallar cuando falta request.user', async () => {
    mockMetadata(false, ['users.read']);

    await expect(guard.canActivate(buildContext())).rejects.toThrow(ForbiddenException);
  });

  it('debe fallar cuando al usuario le falta alguno de los permisos requeridos', async () => {
    mockMetadata(false, ['users.read', 'users.write']);
    roleRepository.getPermissionCodesByUserId.mockResolvedValue(['users.read']);

    await expect(guard.canActivate(buildContext({ sub: 'u1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('debe permitir cuando el usuario tiene todos los permisos requeridos', async () => {
    mockMetadata(false, ['users.read', 'users.write']);
    roleRepository.getPermissionCodesByUserId.mockResolvedValue(['users.write', 'users.read', 'x']);

    await expect(guard.canActivate(buildContext({ sub: 'u1' }))).resolves.toBe(true);
    expect(roleRepository.getPermissionCodesByUserId).toHaveBeenCalledWith('u1');
  });

  it('debe permitir a root cualquier permiso sin consultar los codigos', async () => {
    mockMetadata(false, ['anything:delete']);
    roleRepository.isRoot.mockResolvedValue(true);

    await expect(guard.canActivate(buildContext({ sub: 'root' }))).resolves.toBe(true);
    expect(roleRepository.getPermissionCodesByUserId).not.toHaveBeenCalled();
  });
});
