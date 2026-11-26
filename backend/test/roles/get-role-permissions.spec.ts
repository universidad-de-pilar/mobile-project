import { NotFoundException } from '@nestjs/common';
import { GetRolePermissionsUseCase } from 'src/roles/application/get-role-permissions.use-case';

describe('GetRolePermissionsUseCase', () => {
  let useCase: GetRolePermissionsUseCase;

  const roleRepository = {
    getById: jest.fn(),
    getPermissionsByRoleId: jest.fn(),
  };

  const role = {
    role_id: 'role-1',
    name: 'TENANT_MANAGER',
    description: 'Administrador de una organización',
  };

  const createProduct = {
    permission_id: 'perm-1',
    code: 'products:create',
    description: 'Crear productos',
  };

  const readProduct = {
    permission_id: 'perm-2',
    code: 'products:read',
    description: 'Consultar productos',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetRolePermissionsUseCase(roleRepository as any);
  });

  it('debe devolver todos los permisos asociados a un rol', async () => {
    roleRepository.getById.mockResolvedValue(role);
    roleRepository.getPermissionsByRoleId.mockResolvedValue([
      createProduct,
      readProduct,
    ]);

    const result = await useCase.execute('role-1');

    expect(roleRepository.getById).toHaveBeenCalledWith('role-1');
    expect(roleRepository.getPermissionsByRoleId).toHaveBeenCalledWith(
      'role-1',
    );
    expect(result).toEqual([createProduct, readProduct]);
  });

  it('debe devolver una colección vacía si el rol existe pero no tiene permisos', async () => {
    roleRepository.getById.mockResolvedValue(role);
    roleRepository.getPermissionsByRoleId.mockResolvedValue([]);

    const result = await useCase.execute('role-1');

    expect(result).toEqual([]);
  });

  it('debe lanzar NotFoundException si el rol no existe', async () => {
    roleRepository.getById.mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(roleRepository.getPermissionsByRoleId).not.toHaveBeenCalled();
  });

  it('no debe devolver permisos duplicados', async () => {
    roleRepository.getById.mockResolvedValue(role);
    roleRepository.getPermissionsByRoleId.mockResolvedValue([
      createProduct,
      readProduct,
      { ...createProduct },
    ]);

    const result = await useCase.execute('role-1');

    expect(result).toHaveLength(2);
    expect(result).toEqual([createProduct, readProduct]);
  });
});
