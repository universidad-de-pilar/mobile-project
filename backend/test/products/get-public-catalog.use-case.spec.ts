import { NotFoundException } from '@nestjs/common';
import { GetPublicCatalogUseCase } from 'src/products/application/get-public-catalog.use-case';

const line = (extra: object = {}) => ({
  category_id: 'c1', category_name: 'Bebidas', product_id: 'p1', name: 'Agua', description: null,
  price: '1500.00', image_path: null, gluten_free: false, ...extra,
});

describe('GetPublicCatalogUseCase', () => {
  const productRepository = { findCatalog: jest.fn() };
  const tenantRepository = { findActiveStoreBySlug: jest.fn() };
  const tenant = { tenant_id: 't1', name: 'UNPILAR', slug: 'unpilar' };
  const store = { store_id: 's1', name: 'Palermo', slug: 'palermo' };
  const useCase = new GetPublicCatalogUseCase(productRepository as any, tenantRepository as any);

  beforeEach(() => {
    jest.clearAllMocks();
    tenantRepository.findActiveStoreBySlug.mockResolvedValue(store);
    productRepository.findCatalog.mockResolvedValue([]);
  });

  it('debe lanzar 404 STORE_NOT_FOUND si el local no existe, esta inactivo o es de otro tenant', async () => {
    tenantRepository.findActiveStoreBySlug.mockResolvedValue(null);

    const error: any = await useCase.execute(tenant, 'nope').catch((e) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.getResponse()).toMatchObject({ code: 'STORE_NOT_FOUND' });
    expect(productRepository.findCatalog).not.toHaveBeenCalled();
  });

  it('debe buscar el local y el catalogo acotados al tenant', async () => {
    await useCase.execute(tenant, 'palermo');

    expect(tenantRepository.findActiveStoreBySlug).toHaveBeenCalledWith('t1', 'palermo');
    expect(productRepository.findCatalog).toHaveBeenCalledWith('t1', 's1');
  });

  it('debe devolver categories [] con catalogo vacio', async () => {
    expect(await useCase.execute(tenant, 'palermo')).toEqual({ tenant: { name: 'UNPILAR', slug: 'unpilar' }, store, categories: [] });
  });

  it('debe agrupar por categoria conservando el orden recibido', async () => {
    productRepository.findCatalog.mockResolvedValue([
      line({ product_id: 'p1', name: 'Agua' }),
      line({ product_id: 'p2', name: 'Soda' }),
      line({ category_id: 'c2', category_name: 'Postres', product_id: 'p3', name: 'Flan' }),
    ]);

    const result = await useCase.execute(tenant, 'palermo');

    expect(result.categories.map((c) => c.category_id)).toEqual(['c1', 'c2']);
    expect(result.categories[0].products.map((p) => p.product_id)).toEqual(['p1', 'p2']);
    expect(result.categories[1].products.map((p) => p.product_id)).toEqual(['p3']);
  });

  it('debe exponer solo la forma publica del producto con image_url', async () => {
    productRepository.findCatalog.mockResolvedValue([
      line({ description: 'Sin gas', image_path: 'c1/products/a.webp' }),
      line({ product_id: 'p2', name: 'Soda', gluten_free: true }),
    ]);

    const [{ products }] = (await useCase.execute(tenant, 'palermo')).categories;

    expect(products[0]).toEqual({
      product_id: 'p1', name: 'Agua', description: 'Sin gas', price: '1500.00', image_url: '/media/c1/products/a.webp', gluten_free: false,
    });
    expect(products[1]).toEqual({
      product_id: 'p2', name: 'Soda', description: null, price: '1500.00', image_url: null, gluten_free: true,
    });
  });
});
