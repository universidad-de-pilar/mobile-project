import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ListProductsQueryDto } from 'src/products/api/dto/product.dto';
import { CreateProductUseCase } from 'src/products/application/create-product.use-case';
import { DeleteProductUseCase } from 'src/products/application/delete-product.use-case';
import { GetProductUseCase } from 'src/products/application/get-product.use-case';
import { ListProductsUseCase } from 'src/products/application/list-products.use-case';
import { UpdateProductUseCase } from 'src/products/application/update-product.use-case';
import { toProductResponse } from 'src/products/domain/product.entity';

const expectCode = async (promise: Promise<unknown>, type: any, code?: string) => {
  const error: any = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(type);
  if (code) expect(error.getResponse()).toMatchObject({ code });
};

const row = (extra: object = {}) => ({
  product_id: 'p1', store_id: 's1', category_id: 'c1', name: 'Agua', description: null,
  price: '1500.00', image_path: null, is_available: true, sort_order: 0,
  created_at: new Date(), updated_at: new Date(), ...extra,
});

describe('Products use cases', () => {
  const productRepository = {
    findAll: jest.fn(), findOne: jest.fn(), countByStore: jest.fn(), isCategoryOfStore: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
  };
  const tenantRepository = { isStoreOfTenant: jest.fn(), allowedStoreIds: jest.fn() };
  const input = { store_id: 's1', category_id: 'c1', name: 'Agua', price: '1500.00' };

  beforeEach(() => {
    jest.clearAllMocks();
    tenantRepository.isStoreOfTenant.mockResolvedValue(true);
    tenantRepository.allowedStoreIds.mockResolvedValue(null);
    productRepository.isCategoryOfStore.mockResolvedValue(true);
    productRepository.countByStore.mockResolvedValue(0);
    productRepository.create.mockResolvedValue(row());
  });

  describe('toProductResponse', () => {
    it('debe devolver image_url null sin imagen y ocultar image_path', () => {
      const response: any = toProductResponse(row() as any);

      expect(response.image_url).toBeNull();
      expect(response).not.toHaveProperty('image_path');
    });

    it('debe armar image_url con el prefijo /media', () => {
      expect(toProductResponse(row({ image_path: 'c1/products/a.webp' }) as any).image_url).toBe('/media/c1/products/a.webp');
    });
  });

  describe('ListProductsQueryDto', () => {
    const parse = (is_available: unknown) =>
      plainToInstance(ListProductsQueryDto, { store_id: 's1', is_available }).is_available;

    it('debe convertir "false" en false y "true" en true', () => {
      expect(parse('false')).toBe(false);
      expect(parse('true')).toBe(true);
    });

    it('debe dejar sin definir el filtro ausente', () => {
      expect(parse(undefined)).toBeUndefined();
    });
  });

  describe('ListProductsUseCase', () => {
    const useCase = () => new ListProductsUseCase(productRepository as any, tenantRepository as any);

    it('debe fallar con STORE_NOT_FOUND si el local no es del tenant', async () => {
      tenantRepository.isStoreOfTenant.mockResolvedValue(false);

      await expectCode(useCase().execute('t1', { store_id: 's1' }, 'u1'), NotFoundException, 'STORE_NOT_FOUND');
      expect(productRepository.findAll).not.toHaveBeenCalled();
    });

    it('debe ocultar con STORE_NOT_FOUND un local no asignado al empleado', async () => {
      tenantRepository.allowedStoreIds.mockResolvedValue(['s2']);

      await expectCode(useCase().execute('t1', { store_id: 's1' }, 'u1'), NotFoundException, 'STORE_NOT_FOUND');
      expect(productRepository.findAll).not.toHaveBeenCalled();
    });

    it('debe pasar los filtros acotados al tenant y mapear la respuesta', async () => {
      productRepository.findAll.mockResolvedValue([row({ image_path: 'x.webp' })]);

      const result: any = await useCase().execute('t1', { store_id: 's1', category_id: 'c1', is_available: false }, 'u1');

      expect(productRepository.findAll).toHaveBeenCalledWith('t1', { store_id: 's1', category_id: 'c1', is_available: false });
      expect(result[0].image_url).toBe('/media/x.webp');
    });
  });

  describe('GetProductUseCase', () => {
    const useCase = () => new GetProductUseCase(productRepository as any, tenantRepository as any);

    it('debe fallar con PRODUCT_NOT_FOUND si no existe o es de otro tenant', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expectCode(useCase().execute('t1', 'p1', 'u1'), NotFoundException, 'PRODUCT_NOT_FOUND');
      expect(productRepository.findOne).toHaveBeenCalledWith('t1', 'p1');
    });

    it('debe devolver el producto mapeado', async () => {
      productRepository.findOne.mockResolvedValue(row());

      await expect(useCase().execute('t1', 'p1', 'u1')).resolves.toMatchObject({ product_id: 'p1', image_url: null });
    });

    it('debe ocultar como PRODUCT_NOT_FOUND un producto de un local no asignado al empleado', async () => {
      productRepository.findOne.mockResolvedValue(row({ store_id: 's1' }));
      tenantRepository.allowedStoreIds.mockResolvedValue(['s2']);

      await expectCode(useCase().execute('t1', 'p1', 'u1'), NotFoundException, 'PRODUCT_NOT_FOUND');
    });
  });

  describe('CreateProductUseCase', () => {
    const useCase = () => new CreateProductUseCase(productRepository as any, tenantRepository as any);

    it('debe fallar con STORE_NOT_FOUND si el local no es del tenant', async () => {
      tenantRepository.isStoreOfTenant.mockResolvedValue(false);

      await expectCode(useCase().execute('t1', input), NotFoundException, 'STORE_NOT_FOUND');
      expect(productRepository.create).not.toHaveBeenCalled();
    });

    it('debe fallar con CATEGORY_NOT_FOUND si la categoria es de otro local', async () => {
      productRepository.isCategoryOfStore.mockResolvedValue(false);

      await expectCode(useCase().execute('t1', input), NotFoundException, 'CATEGORY_NOT_FOUND');
      expect(productRepository.isCategoryOfStore).toHaveBeenCalledWith('t1', 'c1', 's1');
      expect(productRepository.create).not.toHaveBeenCalled();
    });

    it.each(['0', '0.00', '0.0', '-1'])('debe rechazar el precio %s con 400', async (price) => {
      await expectCode(useCase().execute('t1', { ...input, price }), BadRequestException);
      expect(productRepository.create).not.toHaveBeenCalled();
    });

    it('debe aceptar el precio minimo 0.01', async () => {
      await useCase().execute('t1', { ...input, price: '0.01' });

      expect(productRepository.create).toHaveBeenCalled();
    });

    it('debe aplicar defaults: disponible, sort_order 0, descripcion null y nombre recortado', async () => {
      await useCase().execute('t1', { ...input, name: '  Agua  ' });

      expect(productRepository.create).toHaveBeenCalledWith('t1', {
        store_id: 's1', category_id: 'c1', name: 'Agua', description: null,
        price: '1500.00', is_available: true, sort_order: 0,
      });
    });

    it('debe fallar con PRODUCT_LIMIT_REACHED al llegar a 200 productos', async () => {
      productRepository.countByStore.mockResolvedValue(200);

      await expectCode(useCase().execute('t1', input), UnprocessableEntityException, 'PRODUCT_LIMIT_REACHED');
      expect(productRepository.create).not.toHaveBeenCalled();
    });

    it('debe permitir crear con 199 productos', async () => {
      productRepository.countByStore.mockResolvedValue(199);

      await expect(useCase().execute('t1', input)).resolves.toMatchObject({ product_id: 'p1', image_url: null });
      expect(productRepository.countByStore).toHaveBeenCalledWith('t1', 's1');
    });
  });

  describe('UpdateProductUseCase', () => {
    const useCase = () => new UpdateProductUseCase(productRepository as any);

    it('debe fallar con 400 si no se envia ningun campo', async () => {
      await expectCode(useCase().execute('t1', 'p1', {}), BadRequestException);
      expect(productRepository.update).not.toHaveBeenCalled();
    });

    it('debe rechazar precio 0', async () => {
      await expectCode(useCase().execute('t1', 'p1', { price: '0.00' }), BadRequestException);
    });

    it('debe actualizar acotado al tenant, recortando el nombre y sin claves undefined', async () => {
      productRepository.update.mockResolvedValue(row({ is_available: false }));

      const result: any = await useCase().execute('t1', 'p1', { name: ' Soda ', is_available: false, price: undefined });

      expect(productRepository.update).toHaveBeenCalledWith('t1', 'p1', { name: 'Soda', is_available: false });
      expect(Object.keys(productRepository.update.mock.calls[0][2])).toEqual(['name', 'is_available']);
      expect(result.is_available).toBe(false);
    });

    it('debe permitir vaciar la descripcion con null', async () => {
      productRepository.update.mockResolvedValue(row());

      await useCase().execute('t1', 'p1', { description: null });

      expect(productRepository.update).toHaveBeenCalledWith('t1', 'p1', { description: null });
    });

    it('debe fallar con PRODUCT_NOT_FOUND si no existe o es de otro tenant', async () => {
      productRepository.update.mockResolvedValue(null);

      await expectCode(useCase().execute('t1', 'p1', { name: 'Soda' }), NotFoundException, 'PRODUCT_NOT_FOUND');
    });

    it('al cambiar de categoria debe validar que sea del local del producto', async () => {
      productRepository.findOne.mockResolvedValue(row());
      productRepository.isCategoryOfStore.mockResolvedValue(false);

      await expectCode(useCase().execute('t1', 'p1', { category_id: 'c2' }), NotFoundException, 'CATEGORY_NOT_FOUND');
      expect(productRepository.isCategoryOfStore).toHaveBeenCalledWith('t1', 'c2', 's1');
      expect(productRepository.update).not.toHaveBeenCalled();
    });

    it('al cambiar de categoria de un producto inexistente debe fallar con PRODUCT_NOT_FOUND', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expectCode(useCase().execute('t1', 'p1', { category_id: 'c2' }), NotFoundException, 'PRODUCT_NOT_FOUND');
    });

    it('debe cambiar de categoria si es del mismo local', async () => {
      productRepository.findOne.mockResolvedValue(row());
      productRepository.update.mockResolvedValue(row({ category_id: 'c2' }));

      await useCase().execute('t1', 'p1', { category_id: 'c2' });

      expect(productRepository.update).toHaveBeenCalledWith('t1', 'p1', { category_id: 'c2' });
    });
  });

  describe('DeleteProductUseCase', () => {
    const useCase = () => new DeleteProductUseCase(productRepository as any, { remove: jest.fn() } as any);

    it('debe eliminar acotado al tenant y devolver el image_path', async () => {
      productRepository.delete.mockResolvedValue(row({ image_path: 'a/b.webp' }));

      await expect(useCase().execute('t1', 'p1')).resolves.toEqual({ image_path: 'a/b.webp' });
      expect(productRepository.delete).toHaveBeenCalledWith('t1', 'p1');
    });

    it('debe fallar con PRODUCT_NOT_FOUND si no existe o es de otro tenant', async () => {
      productRepository.delete.mockResolvedValue(null);

      await expectCode(useCase().execute('t1', 'p1'), NotFoundException, 'PRODUCT_NOT_FOUND');
    });
  });
});
