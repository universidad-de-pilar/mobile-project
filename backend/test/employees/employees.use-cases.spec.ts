import { CreateEmployeeUseCase } from 'src/employees/application/create.use-case';
import { ListEmployeesUseCase } from 'src/employees/application/list.use-case';
import { SetEmployeeStoresUseCase } from 'src/employees/application/set-stores.use-case';
import { UpdateEmployeeUseCase } from 'src/employees/application/update.use-case';

const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error: any) {
    return error.getResponse().code;
  }
  return undefined;
};

const employee = (overrides = {}) => ({
  user_id: 'u2', email: 'e@acme.com', first_name: 'Ana', last_name: 'Paz',
  role: 'employee', is_active: true, store_ids: ['s1'], ...overrides,
});

describe('Employees use cases', () => {
  const repo = {
    list: jest.fn(), findMember: jest.fn(), create: jest.fn(), update: jest.fn(),
    replaceStores: jest.fn(), areActiveStoresOfTenant: jest.fn(),
  };
  const users = { getByEmail: jest.fn() };
  const hasher = { hash: jest.fn(), compare: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    repo.areActiveStoresOfTenant.mockResolvedValue(true);
  });

  it('List devuelve los miembros del tenant', async () => {
    repo.list.mockResolvedValue([employee()]);
    await expect(new ListEmployeesUseCase(repo as any).execute('t1')).resolves.toEqual([employee()]);
    expect(repo.list).toHaveBeenCalledWith('t1');
  });

  describe('Create', () => {
    const useCase = () => new CreateEmployeeUseCase(repo as any, users as any, hasher as any);
    const input = { email: 'e@acme.com', first_name: 'Ana', last_name: 'Paz', password: 'Secret123', store_ids: ['s1', 's1'] };

    it('hashea la clave, deduplica locales y crea el empleado', async () => {
      users.getByEmail.mockResolvedValue(null);
      hasher.hash.mockResolvedValue('hash');
      repo.create.mockResolvedValue(employee());

      await expect(useCase().execute('t1', input)).resolves.toEqual(employee());

      expect(repo.areActiveStoresOfTenant).toHaveBeenCalledWith('t1', ['s1']);
      expect(repo.create).toHaveBeenCalledWith('t1', {
        email: 'e@acme.com', first_name: 'Ana', last_name: 'Paz', password_hash: 'hash', store_ids: ['s1'],
      });
    });

    it('email existente -> EMAIL_TAKEN', async () => {
      users.getByEmail.mockResolvedValue({ user_id: 'u9' });
      expect(await code(useCase().execute('t1', input))).toBe('EMAIL_TAKEN');
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('sin locales -> INVALID_STORES', async () => {
      users.getByEmail.mockResolvedValue(null);
      expect(await code(useCase().execute('t1', { ...input, store_ids: [] }))).toBe('INVALID_STORES');
    });

    it('local ajeno o inactivo -> INVALID_STORES', async () => {
      users.getByEmail.mockResolvedValue(null);
      repo.areActiveStoresOfTenant.mockResolvedValue(false);
      expect(await code(useCase().execute('t1', input))).toBe('INVALID_STORES');
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('Update', () => {
    const useCase = () => new UpdateEmployeeUseCase(repo as any);

    it('actualiza nombres y estado de un empleado', async () => {
      repo.findMember.mockResolvedValue(employee());
      repo.update.mockResolvedValue(employee({ is_active: false }));

      const result = await useCase().execute('t1', 'u1', 'u2', { first_name: 'Eva', is_active: false });

      expect(repo.update).toHaveBeenCalledWith('t1', 'u2', { first_name: 'Eva', is_active: false });
      expect(result.is_active).toBe(false);
    });

    it('no miembro -> EMPLOYEE_NOT_FOUND', async () => {
      repo.findMember.mockResolvedValue(null);
      expect(await code(useCase().execute('t1', 'u1', 'u2', { is_active: false }))).toBe('EMPLOYEE_NOT_FOUND');
    });

    it('owner -> EMPLOYEE_NOT_EDITABLE', async () => {
      repo.findMember.mockResolvedValue(employee({ role: 'owner' }));
      expect(await code(useCase().execute('t1', 'u1', 'u2', { is_active: false }))).toBe('EMPLOYEE_NOT_EDITABLE');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('desactivarse a si mismo -> CANNOT_DEACTIVATE_SELF', async () => {
      expect(await code(useCase().execute('t1', 'u2', 'u2', { is_active: false }))).toBe('CANNOT_DEACTIVATE_SELF');
      expect(repo.findMember).not.toHaveBeenCalled();
    });
  });

  describe('SetStores', () => {
    const useCase = () => new SetEmployeeStoresUseCase(repo as any);

    it('reemplaza los locales validados', async () => {
      repo.findMember.mockResolvedValue(employee());
      repo.replaceStores.mockResolvedValue(employee({ store_ids: ['s2'] }));

      const result = await useCase().execute('t1', 'u2', ['s2']);

      expect(repo.replaceStores).toHaveBeenCalledWith('t1', 'u2', ['s2']);
      expect(result.store_ids).toEqual(['s2']);
    });

    it('no miembro -> EMPLOYEE_NOT_FOUND', async () => {
      repo.findMember.mockResolvedValue(null);
      expect(await code(useCase().execute('t1', 'u2', ['s2']))).toBe('EMPLOYEE_NOT_FOUND');
    });

    it('owner -> EMPLOYEE_NOT_EDITABLE', async () => {
      repo.findMember.mockResolvedValue(employee({ role: 'owner' }));
      expect(await code(useCase().execute('t1', 'u2', ['s2']))).toBe('EMPLOYEE_NOT_EDITABLE');
    });

    it('vacio o local invalido -> INVALID_STORES', async () => {
      repo.findMember.mockResolvedValue(employee());
      expect(await code(useCase().execute('t1', 'u2', []))).toBe('INVALID_STORES');
      repo.areActiveStoresOfTenant.mockResolvedValue(false);
      expect(await code(useCase().execute('t1', 'u2', ['x']))).toBe('INVALID_STORES');
      expect(repo.replaceStores).not.toHaveBeenCalled();
    });
  });
});
