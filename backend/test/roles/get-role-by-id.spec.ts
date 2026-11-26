import { NotFoundException } from '@nestjs/common';
import { GetRoleByIdUseCase } from 'src/roles/application/get-role-by-id.use-case';

describe('GetRoleByIdUseCase', () => {
  let useCase: GetRoleByIdUseCase;

  const roleRepository = {
    getById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetRoleByIdUseCase(roleRepository as any);
  });

  it('debe devolver un rol existente por identificador', async () => {
    const role = {
      role_id: 'role-1',
      name: 'PLATFORM_ADMIN',
      description: 'Administrador de la plataforma Mostrador',
    };
    roleRepository.getById.mockResolvedValue(role);

    const result = await useCase.execute('role-1');

    expect(result).toEqual(role);
  });

  it('debe lanzar NotFoundException si el rol no existe', async () => {
    roleRepository.getById.mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('debe invocar el repositorio con el identificador correcto', async () => {
    roleRepository.getById.mockResolvedValue({
      role_id: 'role-1',
      name: 'PLATFORM_ADMIN',
      description: 'Administrador de la plataforma Mostrador',
    });

    await useCase.execute('role-1');

    expect(roleRepository.getById).toHaveBeenCalledTimes(1);
    expect(roleRepository.getById).toHaveBeenCalledWith('role-1');
  });
});
