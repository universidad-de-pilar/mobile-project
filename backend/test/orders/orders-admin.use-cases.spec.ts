import { ConflictException, NotFoundException } from '@nestjs/common';
import { ChangeOrderStatusUseCase } from 'src/orders/application/change-order-status.use-case';
import { GetOrderUseCase } from 'src/orders/application/get-order.use-case';
import { ListOrdersUseCase } from 'src/orders/application/list-orders.use-case';

const expectCode = async (promise: Promise<unknown>, type: any, code: string) => {
  const error: any = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(type);
  expect(error.getResponse()).toMatchObject({ code });
};

describe('Orders admin use cases', () => {
  const orderRepository = { list: jest.fn(), findById: jest.fn(), changeStatus: jest.fn() };
  const tenantRepository = { isStoreOfTenant: jest.fn(), allowedStoreIds: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    tenantRepository.isStoreOfTenant.mockResolvedValue(true);
    tenantRepository.allowedStoreIds.mockResolvedValue(null);
  });

  describe('ListOrdersUseCase', () => {
    const useCase = () => new ListOrdersUseCase(orderRepository as any, tenantRepository as any);

    it('debe fallar con STORE_NOT_FOUND si el local no es del tenant', async () => {
      tenantRepository.isStoreOfTenant.mockResolvedValue(false);

      await expectCode(useCase().execute('t1', { store_id: 's1' }, 'u1'), NotFoundException, 'STORE_NOT_FOUND');
      expect(orderRepository.list).not.toHaveBeenCalled();
    });

    it('debe ocultar con STORE_NOT_FOUND un local no asignado al empleado', async () => {
      tenantRepository.allowedStoreIds.mockResolvedValue(['s2']);

      await expectCode(useCase().execute('t1', { store_id: 's1' }, 'u1'), NotFoundException, 'STORE_NOT_FOUND');
      expect(orderRepository.list).not.toHaveBeenCalled();
    });

    it('debe usar page 1 y limit 20 por defecto y devolver data con meta', async () => {
      orderRepository.list.mockResolvedValue({ rows: [{ order_id: 'o1' }], total: 1 });

      const result = await useCase().execute('t1', { store_id: 's1' }, 'u1');

      expect(orderRepository.list).toHaveBeenCalledWith('t1', {
        store_id: 's1', status: undefined, from: undefined, to: undefined, offset: 0, limit: 20,
      });
      expect(result).toEqual({ data: [{ order_id: 'o1' }], meta: { page: 1, limit: 20, total: 1 } });
    });

    it('debe pasar los filtros y calcular el offset de la pagina', async () => {
      orderRepository.list.mockResolvedValue({ rows: [], total: 0 });

      const result = await useCase().execute('t1', {
        store_id: 's1', status: 'lista', from: '2026-11-01T00:00:00.000Z', to: '2026-11-02T00:00:00.000Z', page: 3, limit: 10,
      }, 'u1');

      expect(orderRepository.list).toHaveBeenCalledWith('t1', {
        store_id: 's1', status: 'lista', from: '2026-11-01T00:00:00.000Z', to: '2026-11-02T00:00:00.000Z', offset: 20, limit: 10,
      });
      expect(result).toEqual({ data: [], meta: { page: 3, limit: 10, total: 0 } });
    });
  });

  describe('GetOrderUseCase', () => {
    const useCase = () => new GetOrderUseCase(orderRepository as any, tenantRepository as any);

    it('debe fallar con ORDER_NOT_FOUND si no existe o es de otro tenant', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await expectCode(useCase().execute('t1', 'o1', 'u1'), NotFoundException, 'ORDER_NOT_FOUND');
      expect(orderRepository.findById).toHaveBeenCalledWith('t1', 'o1');
    });

    it('debe ocultar con ORDER_NOT_FOUND la orden de un local no asignado al empleado', async () => {
      orderRepository.findById.mockResolvedValue({ order_id: 'o1', store_id: 's1', items: [] });
      tenantRepository.allowedStoreIds.mockResolvedValue(['s2']);

      await expectCode(useCase().execute('t1', 'o1', 'u1'), NotFoundException, 'ORDER_NOT_FOUND');
    });

    it('debe devolver el detalle de la orden', async () => {
      orderRepository.findById.mockResolvedValue({ order_id: 'o1', items: [] });

      await expect(useCase().execute('t1', 'o1', 'u1')).resolves.toEqual({ order_id: 'o1', items: [] });
    });
  });

  describe('ChangeOrderStatusUseCase', () => {
    const useCase = () => new ChangeOrderStatusUseCase(orderRepository as any, tenantRepository as any);

    it('debe fallar con ORDER_NOT_FOUND si no existe', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await expectCode(useCase().execute('t1', 'o1', 'u1', 'en_preparacion'), NotFoundException, 'ORDER_NOT_FOUND');
      expect(orderRepository.changeStatus).not.toHaveBeenCalled();
    });

    it('debe ocultar con ORDER_NOT_FOUND la orden de un local no asignado al empleado', async () => {
      orderRepository.findById.mockResolvedValue({ order_id: 'o1', store_id: 's1', status: 'generada' });
      tenantRepository.allowedStoreIds.mockResolvedValue(['s2']);

      await expectCode(useCase().execute('t1', 'o1', 'u1', 'en_preparacion'), NotFoundException, 'ORDER_NOT_FOUND');
      expect(orderRepository.changeStatus).not.toHaveBeenCalled();
    });

    it('debe rechazar una transicion invalida sin tocar la orden', async () => {
      orderRepository.findById.mockResolvedValue({ order_id: 'o1', status: 'entregada' });

      await expectCode(useCase().execute('t1', 'o1', 'u1', 'generada'), ConflictException, 'INVALID_STATUS_TRANSITION');
      expect(orderRepository.changeStatus).not.toHaveBeenCalled();
    });

    it('debe cambiar el estado registrando quien y devolver la orden actualizada', async () => {
      orderRepository.findById
        .mockResolvedValueOnce({ order_id: 'o1', status: 'generada' })
        .mockResolvedValueOnce({ order_id: 'o1', status: 'en_preparacion' });
      orderRepository.changeStatus.mockResolvedValue(true);

      const result = await useCase().execute('t1', 'o1', 'u1', 'en_preparacion');

      expect(orderRepository.changeStatus).toHaveBeenCalledWith('t1', 'o1', 'generada', 'en_preparacion', 'u1');
      expect(result).toEqual({ order_id: 'o1', status: 'en_preparacion' });
    });

    it('debe responder 409 con el estado actual si otro cambio gano la carrera', async () => {
      orderRepository.findById
        .mockResolvedValueOnce({ order_id: 'o1', status: 'generada' })
        .mockResolvedValueOnce({ order_id: 'o1', status: 'en_preparacion' });
      orderRepository.changeStatus.mockResolvedValue(false);

      const error: any = await useCase().execute('t1', 'o1', 'u1', 'en_preparacion').catch((e) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
        details: { from: 'en_preparacion', to: 'en_preparacion', allowed: ['lista', 'cancelada'] },
      });
    });
  });
});
