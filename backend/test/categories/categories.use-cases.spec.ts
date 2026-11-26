import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateCategoryUseCase } from 'src/categories/application/create-category.use-case';
import { DeleteCategoryUseCase } from 'src/categories/application/delete-category.use-case';
import { ListCategoriesUseCase } from 'src/categories/application/list-categories.use-case';
import { UpdateCategoryUseCase } from 'src/categories/application/update-category.use-case';
import { CategoryHasProductsError, CategoryNameTakenError } from 'src/categories/domain/category.errors';

const expectCode = async (promise: Promise<unknown>, type: any, code: string) => {
  const error: any = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(type);
  expect(error.getResponse()).toMatchObject({ code });
};

describe('Categories use cases', () => {
  const categoryRepository = { findAll: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
  const tenantRepository = { isStoreOfTenant: jest.fn(), allowedStoreIds: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    tenantRepository.isStoreOfTenant.mockResolvedValue(true);
    tenantRepository.allowedStoreIds.mockResolvedValue(null);
  });

  describe('ListCategoriesUseCase', () => {
    const useCase = () => new ListCategoriesUseCase(categoryRepository as any, tenantRepository as any);

    it('debe fallar con STORE_NOT_FOUND si el local no es del tenant', async () => {
      tenantRepository.isStoreOfTenant.mockResolvedValue(false);

      await expectCode(useCase().execute('t1', 's1', 'u1'), NotFoundException, 'STORE_NOT_FOUND');
      expect(categoryRepository.findAll).not.toHaveBeenCalled();
    });

    it('debe ocultar con STORE_NOT_FOUND un local no asignado al empleado', async () => {
      tenantRepository.allowedStoreIds.mockResolvedValue(['s2']);

      await expectCode(useCase().execute('t1', 's1', 'u1'), NotFoundException, 'STORE_NOT_FOUND');
      expect(categoryRepository.findAll).not.toHaveBeenCalled();
    });

    it('debe listar las categorias del local acotadas al tenant', async () => {
      categoryRepository.findAll.mockResolvedValue([{ name: 'Bebidas' }]);

      await expect(useCase().execute('t1', 's1', 'u1')).resolves.toEqual([{ name: 'Bebidas' }]);
      expect(tenantRepository.isStoreOfTenant).toHaveBeenCalledWith('t1', 's1');
      expect(categoryRepository.findAll).toHaveBeenCalledWith('t1', 's1');
    });
  });

  describe('CreateCategoryUseCase', () => {
    const useCase = () => new CreateCategoryUseCase(categoryRepository as any, tenantRepository as any);

    it('debe fallar con STORE_NOT_FOUND si el local no es del tenant', async () => {
      tenantRepository.isStoreOfTenant.mockResolvedValue(false);

      await expectCode(useCase().execute('t1', { store_id: 's1', name: 'Bebidas' }), NotFoundException, 'STORE_NOT_FOUND');
      expect(categoryRepository.create).not.toHaveBeenCalled();
    });

    it('debe usar sort_order 0 por defecto y recortar el nombre', async () => {
      categoryRepository.create.mockResolvedValue({ category_id: 'c1' });

      await useCase().execute('t1', { store_id: 's1', name: '  Bebidas  ' });

      expect(categoryRepository.create).toHaveBeenCalledWith('t1', { store_id: 's1', name: 'Bebidas', sort_order: 0 });
    });

    it('debe respetar el sort_order recibido', async () => {
      await useCase().execute('t1', { store_id: 's1', name: 'Bebidas', sort_order: 3 });

      expect(categoryRepository.create).toHaveBeenCalledWith('t1', { store_id: 's1', name: 'Bebidas', sort_order: 3 });
    });

    it('debe fallar con CATEGORY_NAME_TAKEN si el nombre ya existe en el local', async () => {
      categoryRepository.create.mockRejectedValue(new CategoryNameTakenError());

      await expectCode(useCase().execute('t1', { store_id: 's1', name: 'Bebidas' }), ConflictException, 'CATEGORY_NAME_TAKEN');
    });
  });

  describe('UpdateCategoryUseCase', () => {
    const useCase = () => new UpdateCategoryUseCase(categoryRepository as any);

    it('debe actualizar acotado al tenant y recortar el nombre', async () => {
      categoryRepository.update.mockResolvedValue({ category_id: 'c1' });

      await expect(useCase().execute('t1', 'c1', { name: ' Postres ', sort_order: 2 })).resolves.toEqual({ category_id: 'c1' });
      expect(categoryRepository.update).toHaveBeenCalledWith('t1', 'c1', { name: 'Postres', sort_order: 2 });
    });

    it('debe fallar con CATEGORY_NOT_FOUND si la categoria no existe o es de otro tenant', async () => {
      categoryRepository.update.mockResolvedValue(null);

      await expectCode(useCase().execute('t1', 'c1', { name: 'Postres' }), NotFoundException, 'CATEGORY_NOT_FOUND');
    });

    it('debe fallar con CATEGORY_NAME_TAKEN si el nombre ya existe en el local', async () => {
      categoryRepository.update.mockRejectedValue(new CategoryNameTakenError());

      await expectCode(useCase().execute('t1', 'c1', { name: 'Postres' }), ConflictException, 'CATEGORY_NAME_TAKEN');
    });
  });

  describe('DeleteCategoryUseCase', () => {
    const useCase = () => new DeleteCategoryUseCase(categoryRepository as any);

    it('debe eliminar acotado al tenant', async () => {
      categoryRepository.delete.mockResolvedValue(true);

      await useCase().execute('t1', 'c1');

      expect(categoryRepository.delete).toHaveBeenCalledWith('t1', 'c1');
    });

    it('debe fallar con CATEGORY_NOT_FOUND si la categoria no existe o es de otro tenant', async () => {
      categoryRepository.delete.mockResolvedValue(false);

      await expectCode(useCase().execute('t1', 'c1'), NotFoundException, 'CATEGORY_NOT_FOUND');
    });

    it('debe fallar con CATEGORY_HAS_PRODUCTS si tiene productos asociados', async () => {
      categoryRepository.delete.mockRejectedValue(new CategoryHasProductsError());

      await expectCode(useCase().execute('t1', 'c1'), ConflictException, 'CATEGORY_HAS_PRODUCTS');
    });
  });
});
