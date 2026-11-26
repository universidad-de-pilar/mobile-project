import { GetMeUseCase } from 'src/auth/application/get-me.use-case';

describe('GetMeUseCase', () => {
  const tenant = { tenant_id: 't1', name: 'Local Uno', slug: 'local1', is_active: true } as any;
  const userRepository = { getById: jest.fn() };
  const roleRepository = { getPermissionCodesByUserId: jest.fn(), isRoot: jest.fn() };
  const storeRepository = { list: jest.fn() };
  const tenantRepository = { allowedStoreIds: jest.fn() };
  const build = () => new GetMeUseCase(userRepository as any, roleRepository as any, storeRepository as any, tenantRepository as any);
  const store = (over: object = {}) => ({ store_id: 's1', name: 'Palermo', slug: 'palermo', is_active: true, address: null, ...over });

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.getById.mockResolvedValue({
      user_id: 'u1', email: 'juan@correo.com', first_name: 'Juan', last_name: 'Perez', created_at: 'x',
    });
    roleRepository.getPermissionCodesByUserId.mockResolvedValue(['orders:read', 'orders:update']);
    roleRepository.isRoot.mockResolvedValue(false);
    tenantRepository.allowedStoreIds.mockResolvedValue(null);
    storeRepository.list.mockResolvedValue([store(), store({ store_id: 's2', slug: 'centro', is_active: false })]);
  });

  it('debe devolver usuario, tenant, locales activos y permisos con el formato del contrato', async () => {
    const me = await build().execute(tenant, 'u1');

    expect(storeRepository.list).toHaveBeenCalledWith('t1');
    expect(roleRepository.getPermissionCodesByUserId).toHaveBeenCalledWith('u1');
    expect(me).toEqual({
      user: { user_id: 'u1', email: 'juan@correo.com', first_name: 'Juan', last_name: 'Perez' },
      tenant: { tenant_id: 't1', name: 'Local Uno', slug: 'local1' },
      stores: [{ store_id: 's1', name: 'Palermo', slug: 'palermo' }],
      permissions: ['orders:read', 'orders:update'],
      is_root: false,
    });
  });

  it('en el contexto admin (sin tenant) devuelve tenant null, sin locales y los permisos de root', async () => {
    roleRepository.isRoot.mockResolvedValue(true);
    roleRepository.getPermissionCodesByUserId.mockResolvedValue(['tenants:read']);

    const me = await build().execute(undefined, 'u1');

    expect(storeRepository.list).not.toHaveBeenCalled();
    expect(me).toMatchObject({ tenant: null, stores: [], permissions: ['tenants:read'], is_root: true });
  });

  it('un empleado solo ve los locales asignados', async () => {
    storeRepository.list.mockResolvedValue([store(), store({ store_id: 's2', slug: 'centro' })]);
    tenantRepository.allowedStoreIds.mockResolvedValue(['s2']);

    const me = await build().execute(tenant, 'u1');

    expect(tenantRepository.allowedStoreIds).toHaveBeenCalledWith('t1', 'u1');
    expect(me.stores).toEqual([{ store_id: 's2', name: 'Palermo', slug: 'centro' }]);
  });
});
