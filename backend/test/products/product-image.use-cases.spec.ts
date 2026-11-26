import { HttpException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DeleteProductUseCase } from 'src/products/application/delete-product.use-case';
import { RemoveProductImageUseCase } from 'src/products/application/remove-product-image.use-case';
import { SetProductImageUseCase } from 'src/products/application/set-product-image.use-case';
import { mediaUnreadable } from 'src/products/domain/product.errors';

const expectCode = async (promise: Promise<unknown>, type: any, code: string) => {
  const error: any = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(type);
  expect(error.getResponse()).toMatchObject({ code });
};

const row = (extra: object = {}) => ({
  product_id: 'p1', store_id: 's1', category_id: 'c1', name: 'Agua', description: null,
  price: '1500.00', image_path: null, is_available: true, sort_order: 0,
  created_at: new Date(), updated_at: new Date(), ...extra,
});

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);

describe('Product image use cases', () => {
  const calls: string[] = [];
  const productRepository = { findOne: jest.fn(), update: jest.fn(), delete: jest.fn() };
  const storage = { save: jest.fn(), remove: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    calls.length = 0;
    productRepository.findOne.mockResolvedValue(row({ image_path: 't1/products/old.png' }));
    productRepository.update.mockImplementation(async () => {
      calls.push('update');
      return row({ image_path: 't1/products/new.png' });
    });
    storage.save.mockImplementation(async () => {
      calls.push('save');
      return 't1/products/new.png';
    });
    storage.remove.mockImplementation(async (path: string) => {
      calls.push(`remove:${path}`);
    });
  });

  describe('SetProductImageUseCase', () => {
    const useCase = () => new SetProductImageUseCase(productRepository as any, storage as any);

    it('debe fallar con UNSUPPORTED_MEDIA_TYPE si los bytes no son JPG, PNG ni WebP', async () => {
      await expectCode(useCase().execute('t1', 'p1', Buffer.from('GIF89a......')), HttpException, 'UNSUPPORTED_MEDIA_TYPE');
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('debe fallar con PRODUCT_NOT_FOUND sin escribir archivos', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expectCode(useCase().execute('t1', 'p1', png), NotFoundException, 'PRODUCT_NOT_FOUND');
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('debe propagar MEDIA_UNREADABLE cuando el storage no puede decodificar', async () => {
      storage.save.mockRejectedValue(mediaUnreadable());

      await expectCode(useCase().execute('t1', 'p1', png), UnprocessableEntityException, 'MEDIA_UNREADABLE');
      expect(productRepository.update).not.toHaveBeenCalled();
    });

    it('debe escribir el nuevo, actualizar la base y recien despues borrar el viejo', async () => {
      const result: any = await useCase().execute('t1', 'p1', png);

      expect(storage.save).toHaveBeenCalledWith('t1', png, 'png');
      expect(productRepository.update).toHaveBeenCalledWith('t1', 'p1', { image_path: 't1/products/new.png' });
      expect(calls).toEqual(['save', 'update', 'remove:t1/products/old.png']);
      expect(result.image_url).toBe('/media/t1/products/new.png');
    });

    it('debe borrar el archivo nuevo si falla la base', async () => {
      productRepository.update.mockRejectedValue(new Error('db down'));

      await expect(useCase().execute('t1', 'p1', png)).rejects.toThrow('db down');
      expect(storage.remove).toHaveBeenCalledWith('t1/products/new.png');
      expect(storage.remove).not.toHaveBeenCalledWith('t1/products/old.png');
    });

    it('debe borrar el archivo nuevo y dar 404 si el producto desaparecio durante la carga', async () => {
      productRepository.update.mockResolvedValue(null);

      await expectCode(useCase().execute('t1', 'p1', png), NotFoundException, 'PRODUCT_NOT_FOUND');
      expect(storage.remove).toHaveBeenCalledWith('t1/products/new.png');
    });

    it('no debe borrar nada si el producto no tenia imagen', async () => {
      productRepository.findOne.mockResolvedValue(row());

      await useCase().execute('t1', 'p1', png);

      expect(storage.remove).not.toHaveBeenCalled();
    });
  });

  describe('RemoveProductImageUseCase', () => {
    const useCase = () => new RemoveProductImageUseCase(productRepository as any, storage as any);

    it('debe limpiar image_path y borrar el archivo', async () => {
      productRepository.update.mockResolvedValue(row());

      const result: any = await useCase().execute('t1', 'p1');

      expect(productRepository.update).toHaveBeenCalledWith('t1', 'p1', { image_path: null });
      expect(storage.remove).toHaveBeenCalledWith('t1/products/old.png');
      expect(result.image_url).toBeNull();
    });

    it('debe fallar con PRODUCT_NOT_FOUND si no existe o es de otro tenant', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expectCode(useCase().execute('t1', 'p1'), NotFoundException, 'PRODUCT_NOT_FOUND');
      expect(storage.remove).not.toHaveBeenCalled();
    });
  });

  describe('DeleteProductUseCase', () => {
    const useCase = () => new DeleteProductUseCase(productRepository as any, storage as any);

    it('debe borrar el archivo despues de borrar la fila', async () => {
      productRepository.delete.mockResolvedValue(row({ image_path: 'a/b.webp' }));

      await useCase().execute('t1', 'p1');

      expect(storage.remove).toHaveBeenCalledWith('a/b.webp');
    });

    it('no debe tocar el storage si el producto no tenia imagen', async () => {
      productRepository.delete.mockResolvedValue(row());

      await useCase().execute('t1', 'p1');

      expect(storage.remove).not.toHaveBeenCalled();
    });

    it('debe fallar con PRODUCT_NOT_FOUND y no borrar archivos', async () => {
      productRepository.delete.mockResolvedValue(null);

      await expectCode(useCase().execute('t1', 'p1'), NotFoundException, 'PRODUCT_NOT_FOUND');
      expect(storage.remove).not.toHaveBeenCalled();
    });
  });
});
