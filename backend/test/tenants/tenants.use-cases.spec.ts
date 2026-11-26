import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateTenantUseCase } from 'src/tenants/application/create.use-case';
import { GetAllTenantsUseCase } from 'src/tenants/application/get-all.use-case';
import { UpdateTenantUseCase } from 'src/tenants/application/update.use-case';
import { SetTenantActiveUseCase } from 'src/tenants/application/set-active.use-case';

const row = { tenant_id: 't1', name: 'Acme', slug: 'acme', is_active: true, created_at: new Date() };

describe('Tenants use cases', () => {
  const tenantRepository = { list: jest.fn(), update: jest.fn(), createWithOwner: jest.fn() };
  const userRepository = { getByEmail: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('GetAll lista los tenants', async () => {
    tenantRepository.list.mockResolvedValue([row]);
    await expect(new GetAllTenantsUseCase(tenantRepository as any).execute()).resolves.toEqual([row]);
  });

  describe('Create', () => {
    const useCase = () => new CreateTenantUseCase(tenantRepository as any, userRepository as any);
    const input = { name: ' Acme ', slug: 'acme', store: { name: 'Centro', slug: 'centro' }, owner_email: 'dueno@acme.com' };

    it('crea tenant, local y vinculo con el dueno, y devuelve las URLs', async () => {
      userRepository.getByEmail.mockResolvedValue({ user_id: 'u1' });
      tenantRepository.createWithOwner.mockResolvedValue({
        tenant: row,
        store: { store_id: 's1', name: 'Centro', slug: 'centro', address: null },
      });

      const result: any = await useCase().execute(input);

      expect(tenantRepository.createWithOwner).toHaveBeenCalledWith({
        name: 'Acme', slug: 'acme', store: { name: 'Centro', slug: 'centro', address: null }, ownerId: 'u1',
      });
      expect(result.tenant_id).toBe('t1');
      expect(result.web_origin).toContain('acme');
      expect(result.store.self_order_url).toMatch(/acme.*\/centro$/);
    });

    it('404 USER_NOT_FOUND si el dueno no esta registrado', async () => {
      userRepository.getByEmail.mockResolvedValue(null);

      const error = await useCase().execute(input).catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.getResponse()).toMatchObject({ code: 'USER_NOT_FOUND' });
      expect(tenantRepository.createWithOwner).not.toHaveBeenCalled();
    });

    it.each(['admin', 'www', 'api', 'app', 'Bad_Slug'])('400 INVALID_SLUG con el slug %s', async (slug) => {
      userRepository.getByEmail.mockResolvedValue({ user_id: 'u1' });

      const error = await useCase().execute({ ...input, slug }).catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse()).toMatchObject({ code: 'INVALID_SLUG' });
      expect(tenantRepository.createWithOwner).not.toHaveBeenCalled();
    });
  });

  describe('Update', () => {
    const useCase = () => new UpdateTenantUseCase(tenantRepository as any);

    it('actualiza nombre y estado', async () => {
      tenantRepository.update.mockResolvedValue({ ...row, name: 'Globex', is_active: false });

      await useCase().execute('t1', { name: ' Globex ', is_active: false });

      expect(tenantRepository.update).toHaveBeenCalledWith('t1', { name: 'Globex', is_active: false });
    });

    it('400 EMPTY_UPDATE sin campos', async () => {
      const error = await useCase().execute('t1', {}).catch((e) => e);

      expect(error.getResponse()).toMatchObject({ code: 'EMPTY_UPDATE' });
      expect(tenantRepository.update).not.toHaveBeenCalled();
    });

    it('404 TENANT_NOT_FOUND si no existe', async () => {
      tenantRepository.update.mockResolvedValue(null);

      const error = await useCase().execute('t1', { is_active: true }).catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.getResponse()).toMatchObject({ code: 'TENANT_NOT_FOUND' });
    });
  });

  describe('SetActive (suspend / reactivate)', () => {
    const useCase = () => new SetTenantActiveUseCase(tenantRepository as any);

    it.each([[false], [true]])('sets is_active = %s', async (active) => {
      tenantRepository.update.mockResolvedValue({ ...row, is_active: active });

      const result = await useCase().execute('t1', active);

      expect(tenantRepository.update).toHaveBeenCalledWith('t1', { is_active: active });
      expect(result.is_active).toBe(active);
    });

    it('404 TENANT_NOT_FOUND si no existe', async () => {
      tenantRepository.update.mockResolvedValue(null);

      const error = await useCase().execute('t1', false).catch((e) => e);

      expect(error.getResponse()).toMatchObject({ code: 'TENANT_NOT_FOUND' });
    });
  });
});
