import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateScreenUseCase } from 'src/screens/application/create-screen.use-case';
import { ListScreensUseCase } from 'src/screens/application/list-screens.use-case';
import { UpdateScreenUseCase } from 'src/screens/application/update-screen.use-case';

const expectCode = async (promise: Promise<unknown>, type: any, code: string) => {
  const error: any = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(type);
  expect(error.getResponse()).toMatchObject({ code });
};

describe('Screens use cases', () => {
  const tenant = { tenant_id: 't1', slug: 'local1' } as any;
  const screenRepository = { create: jest.fn(), listByStore: jest.fn(), update: jest.fn() };
  const tenantRepository = { isStoreOfTenant: jest.fn() };
  const row = (over: object = {}) => ({
    screen_id: 'sc1', store_id: 's1', name: 'Entrada', is_active: true,
    created_at: new Date(), updated_at: new Date(), ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WEB_ORIGIN_TEMPLATE = 'http://{slug}.localhost:8081';
    tenantRepository.isStoreOfTenant.mockResolvedValue(true);
    screenRepository.create.mockImplementation(async (_t, s) => row({ name: s.name, token: s.token }));
  });

  describe('CreateScreenUseCase', () => {
    const useCase = () => new CreateScreenUseCase(screenRepository as any, tenantRepository as any);

    it('debe fallar con STORE_NOT_FOUND si el local no es del tenant', async () => {
      tenantRepository.isStoreOfTenant.mockResolvedValue(false);

      await expectCode(useCase().execute(tenant, { store_id: 's1', name: 'Entrada' }), NotFoundException, 'STORE_NOT_FOUND');
      expect(screenRepository.create).not.toHaveBeenCalled();
    });

    it('debe generar un token base64url de 43 caracteres y el player_url del tenant', async () => {
      const screen = await useCase().execute(tenant, { store_id: 's1', name: 'Entrada' });

      expect(screen.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(screen.player_url).toBe(`http://local1.localhost:8081/screen/${screen.token}`);
      expect(screenRepository.create).toHaveBeenCalledWith('t1', expect.objectContaining({ store_id: 's1', token: screen.token }));
    });

    it('debe generar un token distinto en cada alta', async () => {
      const a = await useCase().execute(tenant, { store_id: 's1', name: 'A' });
      const b = await useCase().execute(tenant, { store_id: 's1', name: 'B' });

      expect(a.token).not.toBe(b.token);
    });

    it('debe guardar el nombre sin espacios en los extremos', async () => {
      await useCase().execute(tenant, { store_id: 's1', name: '  Entrada  ' });

      expect(screenRepository.create).toHaveBeenCalledWith('t1', expect.objectContaining({ name: 'Entrada' }));
    });
  });

  describe('ListScreensUseCase', () => {
    const useCase = () => new ListScreensUseCase(screenRepository as any, tenantRepository as any);

    it('debe fallar con STORE_NOT_FOUND si el local no es del tenant', async () => {
      tenantRepository.isStoreOfTenant.mockResolvedValue(false);

      await expectCode(useCase().execute(tenant, 's1'), NotFoundException, 'STORE_NOT_FOUND');
      expect(screenRepository.listByStore).not.toHaveBeenCalled();
    });

    it('debe listar las pantallas del tenant y local con su player_url', async () => {
      screenRepository.listByStore.mockResolvedValue([row({ token: 'abc' }), row({ screen_id: 'sc2', token: 'def', is_active: false })]);

      const result = await useCase().execute(tenant, 's1');

      expect(screenRepository.listByStore).toHaveBeenCalledWith('t1', 's1');
      expect(result.map((s) => s.player_url)).toEqual([
        'http://local1.localhost:8081/screen/abc',
        'http://local1.localhost:8081/screen/def',
      ]);
      expect(result[1].is_active).toBe(false);
    });
  });

  describe('UpdateScreenUseCase', () => {
    const useCase = () => new UpdateScreenUseCase(screenRepository as any);

    it('debe fallar con EMPTY_UPDATE sin campos, sin tocar el repositorio', async () => {
      await expectCode(useCase().execute(tenant, 'sc1', {}), BadRequestException, 'EMPTY_UPDATE');
      expect(screenRepository.update).not.toHaveBeenCalled();
    });

    it('debe fallar con SCREEN_NOT_FOUND si la pantalla no es del tenant', async () => {
      screenRepository.update.mockResolvedValue(null);

      await expectCode(useCase().execute(tenant, 'otra', { is_active: false }), NotFoundException, 'SCREEN_NOT_FOUND');
      expect(screenRepository.update).toHaveBeenCalledWith('t1', 'otra', { is_active: false });
    });

    it('debe guardar solo los campos enviados, con el nombre sin espacios, y devolver player_url', async () => {
      screenRepository.update.mockResolvedValue(row({ token: 'abc', name: 'Salida' }));

      const screen = await useCase().execute(tenant, 'sc1', { name: '  Salida  ' });

      expect(screenRepository.update).toHaveBeenCalledWith('t1', 'sc1', { name: 'Salida' });
      expect(screen.player_url).toBe('http://local1.localhost:8081/screen/abc');
    });

    it('debe permitir desactivar la pantalla', async () => {
      screenRepository.update.mockResolvedValue(row({ token: 'abc', is_active: false }));

      const screen = await useCase().execute(tenant, 'sc1', { is_active: false });

      expect(screenRepository.update).toHaveBeenCalledWith('t1', 'sc1', { is_active: false });
      expect(screen.is_active).toBe(false);
    });
  });
});
