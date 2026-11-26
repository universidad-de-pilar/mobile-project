import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateOrderUseCase } from 'src/orders/application/create-order.use-case';

describe('CreateOrderUseCase', () => {
  const store = { store_id: 's1', name: 'Palermo', slug: 'palermo', whatsapp_number: '+5491112345678' };
  const createdAt = new Date('2026-11-02T15:30:00.000Z');
  const tx = {
    findProducts: jest.fn(),
    isActiveScreen: jest.fn(),
    nextOrderNumber: jest.fn(),
    insertOrder: jest.fn(),
    insertItems: jest.fn(),
  };
  const orderRepository = { findStoreBySlug: jest.fn(), transaction: jest.fn((work: any) => work(tx)) };
  const useCase = new CreateOrderUseCase(orderRepository as any);
  const agua = { product_id: 'p1', name: 'Agua 500 ml', price: '1500.00', is_available: true };
  const sandwich = { product_id: 'p2', name: 'Sándwich', price: '8500.00', is_available: true };

  beforeEach(() => {
    jest.clearAllMocks();
    orderRepository.findStoreBySlug.mockResolvedValue(store);
    tx.findProducts.mockResolvedValue([agua, sandwich]);
    tx.isActiveScreen.mockResolvedValue(true);
    tx.nextOrderNumber.mockResolvedValue(123);
    tx.insertOrder.mockResolvedValue({ order_id: 'o1', created_at: createdAt });
    tx.insertItems.mockResolvedValue(undefined);
  });

  const dto = (extra: object = {}) => ({
    items: [{ product_id: 'p1', quantity: 2 }, { product_id: 'p2', quantity: 1 }],
    customer_name: 'Ana', note: 'Sin hielo', source_screen_id: 'sc1', ...extra,
  });

  it('debe lanzar 404 STORE_NOT_FOUND si el local no existe', async () => {
    orderRepository.findStoreBySlug.mockResolvedValue(null);

    const error: any = await useCase.execute('t1', 'nope', dto()).catch((e) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.getResponse()).toMatchObject({ code: 'STORE_NOT_FOUND' });
    expect(orderRepository.transaction).not.toHaveBeenCalled();
  });

  it('debe registrar el pedido recalculando precios y total con los precios de la base', async () => {
    const result = await useCase.execute('t1', 'palermo', { ...dto(), price: '1', total: '1', items: [
      { product_id: 'p1', quantity: 2, price: '1' }, { product_id: 'p2', quantity: 1 },
    ] } as any);

    expect(tx.findProducts).toHaveBeenCalledWith('t1', 's1', ['p1', 'p2']);
    expect(tx.nextOrderNumber).toHaveBeenCalledWith('t1');
    expect(tx.insertOrder).toHaveBeenCalledWith('t1', {
      store_id: 's1', order_number: 123, source_screen_id: 'sc1', customer_name: 'Ana', note: 'Sin hielo', total: '11500.00',
    });
    expect(tx.insertItems).toHaveBeenCalledWith('t1', 'o1', [
      { line_number: 1, product_id: 'p1', product_name: 'Agua 500 ml', unit_price: '1500.00', quantity: 2 },
      { line_number: 2, product_id: 'p2', product_name: 'Sándwich', unit_price: '8500.00', quantity: 1 },
    ]);
    expect(result).toMatchObject({
      order_id: 'o1', order_number: 123, status: 'generada', store: { name: 'Palermo', slug: 'palermo' },
      customer_name: 'Ana', note: 'Sin hielo', total: '11500.00', created_at: createdAt,
    });
    expect(result.items).toEqual([
      { line_number: 1, product_id: 'p1', product_name: 'Agua 500 ml', unit_price: '1500.00', quantity: 2, line_total: '3000.00' },
      { line_number: 2, product_id: 'p2', product_name: 'Sándwich', unit_price: '8500.00', quantity: 1, line_total: '8500.00' },
    ]);
  });

  it('debe armar el mensaje de whatsapp con las mismas lineas y total guardados', async () => {
    const { whatsapp_parts } = await useCase.execute('t1', 'palermo', dto());

    expect(whatsapp_parts).toHaveLength(1);
    expect(whatsapp_parts[0].text).toBe(
      'Pedido #123\nLocal: Palermo\nCliente: Ana\nNota: Sin hielo\n\n2 x Agua 500 ml — $3.000,00\n1 x Sándwich — $8.500,00\n\nTotal: $11.500,00',
    );
    expect(whatsapp_parts[0].url).toMatch(/^https:\/\/wa\.me\/5491112345678\?text=/);
  });

  it('debe lanzar 409 PRODUCTS_UNAVAILABLE con details y no guardar nada', async () => {
    tx.findProducts.mockResolvedValue([{ ...sandwich, is_available: false }]);

    const error: any = await useCase.execute('t1', 'palermo', dto()).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({
      statusCode: 409, error: 'Conflict', code: 'PRODUCTS_UNAVAILABLE',
      details: [
        { product_id: 'p1', reason: 'not_found' },
        { product_id: 'p2', name: 'Sándwich', reason: 'unavailable' },
      ],
    });
    expect(error.getResponse().details[0]).not.toHaveProperty('name');
    expect(tx.nextOrderNumber).not.toHaveBeenCalled();
    expect(tx.insertOrder).not.toHaveBeenCalled();
    expect(tx.insertItems).not.toHaveBeenCalled();
  });

  it('debe guardar origen null si la pantalla no es valida y registrar igual', async () => {
    tx.isActiveScreen.mockResolvedValue(false);

    await useCase.execute('t1', 'palermo', dto());

    expect(tx.isActiveScreen).toHaveBeenCalledWith('t1', 's1', 'sc1');
    expect(tx.insertOrder).toHaveBeenCalledWith('t1', expect.objectContaining({ source_screen_id: null }));
  });

  it('debe guardar origen null sin consultar si no se envia source_screen_id', async () => {
    await useCase.execute('t1', 'palermo', dto({ source_screen_id: undefined, customer_name: undefined, note: undefined }));

    expect(tx.isActiveScreen).not.toHaveBeenCalled();
    expect(tx.insertOrder).toHaveBeenCalledWith('t1', expect.objectContaining({ source_screen_id: null, customer_name: null, note: null }));
  });

  it('debe registrar el pedido y devolver whatsapp_parts [] si el local no tiene numero', async () => {
    orderRepository.findStoreBySlug.mockResolvedValue({ ...store, whatsapp_number: null });

    const result = await useCase.execute('t1', 'palermo', dto());

    expect(tx.insertOrder).toHaveBeenCalled();
    expect(result.whatsapp_parts).toEqual([]);
  });
});
