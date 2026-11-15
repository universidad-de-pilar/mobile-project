import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateProductDto, UpdateProductDto } from 'src/products/api/dto/product.dto';
import { UpdateCategoryDto } from 'src/categories/api/dto/category.dto';

const errorsOf = (cls: any, body: object) => validateSync(plainToInstance(cls, body)).map((e) => e.property);

describe('DTOs de PATCH con null explícito', () => {
  it('rechaza null en columnas NOT NULL de producto', () => {
    expect(errorsOf(UpdateProductDto, { is_available: null, sort_order: null, category_id: null })).toEqual(
      expect.arrayContaining(['is_available', 'sort_order', 'category_id']),
    );
  });

  it('permite null en description', () => {
    expect(errorsOf(UpdateProductDto, { description: null })).toEqual([]);
  });

  it('rechaza null en sort_order de categoría y acepta un entero', () => {
    expect(errorsOf(UpdateCategoryDto, { sort_order: null })).toEqual(['sort_order']);
    expect(errorsOf(UpdateCategoryDto, { sort_order: 2 })).toEqual([]);
  });

  it('rechaza null y SKU vacio o largo en el PATCH de producto', () => {
    expect(errorsOf(UpdateProductDto, { sku: null, gluten_free: null })).toEqual(expect.arrayContaining(['sku', 'gluten_free']));
    expect(errorsOf(UpdateProductDto, { sku: '   ' })).toEqual(['sku']);
    expect(errorsOf(UpdateProductDto, { sku: 'x'.repeat(65) })).toEqual(['sku']);
  });

  it('exige sku al crear un producto y acepta gluten_free opcional', () => {
    const base = { store_id: '3f2b8c1e-5d4a-4b6e-8f7a-1c2d3e4f5a6b', category_id: '3f2b8c1e-5d4a-4b6e-8f7a-1c2d3e4f5a6b', name: 'Agua', price: '10' };
    expect(errorsOf(CreateProductDto, base)).toEqual(['sku']);
    expect(errorsOf(CreateProductDto, { ...base, sku: ' A1 ', gluten_free: true })).toEqual([]);
  });
});
