import { GetRolesUseCase } from 'src/roles/application/get-roles.use-case';

describe('GetRolesUseCase', () => {
  let useCase: GetRolesUseCase;

  const roleRepository = {
    getAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetRolesUseCase(roleRepository as any);
  });

  it('debe devolver todos los roles registrados', async () => {
    const roles = [
      {
        role_id: 'role-1',
        name: 'PLATFORM_ADMIN',
        description: 'Administrador de la plataforma Mostrador',
      },
      {
        role_id: 'role-2',
        name: 'TENANT_OWNER',
        description: 'Propietario de una organización',
      },
    ];
    roleRepository.getAll.mockResolvedValue(roles);

    const result = await useCase.execute();

    expect(result).toEqual(roles);
  });

  it('debe devolver una colección vacía si no existen roles', async () => {
    roleRepository.getAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('debe invocar el repositorio una sola vez', async () => {
    roleRepository.getAll.mockResolvedValue([]);

    await useCase.execute();

    expect(roleRepository.getAll).toHaveBeenCalledTimes(1);
  });
});
