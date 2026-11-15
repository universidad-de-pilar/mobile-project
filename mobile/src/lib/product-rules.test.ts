import { ApiError } from './api';
import type { Product } from './admin-api';
import {
  categoryErrorMessage,
  checkImage,
  filterAdminProducts,
  parsePrice,
  priceToInput,
  productErrorMessage,
  uploadErrorMessage,
  validateProduct,
} from './product-rules';

describe('parsePrice', () => {
  it.each([
    ['8500', '8500.00'],
    ['8.500', '8500.00'],
    ['8500,50', '8500.50'],
    ['8.500,5', '8500.50'],
    [' 1.234.567,89 ', '1234567.89'],
    ['15.5', '15.50'],
    ['0,5', '0.50'],
  ])('accepts %s', (input, expected) => expect(parsePrice(input)).toBe(expected));

  it.each(['', '  ', '-5', '0', '0,00', 'abc', '8,500,5', '8,505', '1..5', '10000000', '$8500'])(
    'rejects %j',
    (input) => expect(parsePrice(input)).toBeNull(),
  );
});

describe('priceToInput', () => {
  it('turns the API string into the field text', () => {
    expect(priceToInput('1500.00')).toBe('1500,00');
  });
});

describe('validateProduct', () => {
  const ok = { name: ' Agua ', description: '', price: '1500', categoryId: 'c1', sku: 'AG-1' };

  it('accepts a valid product', () => expect(validateProduct(ok)).toEqual({}));

  it('requires name, category and a positive price', () => {
    const errors = validateProduct({ name: ' ', description: '', price: '0', categoryId: '', sku: ' ' });
    expect(errors.name).toBe('Ingresá el nombre.');
    expect(errors.categoryId).toBe('Elegí una categoría.');
    expect(errors.price).toBe('El precio debe ser mayor que 0.');
    expect(errors.sku).toBe('Ingresá el SKU.');
  });

  it('limits sku to 64 characters', () => {
    expect(validateProduct({ ...ok, sku: 'a'.repeat(65) }).sku).toBe('El SKU admite hasta 64 caracteres.');
    expect(validateProduct({ ...ok, sku: 'a'.repeat(64) }).sku).toBeUndefined();
  });

  it('limits name to 80 and description to 500 characters', () => {
    expect(validateProduct({ ...ok, name: 'a'.repeat(81) }).name).toBe('El nombre admite hasta 80 caracteres.');
    expect(validateProduct({ ...ok, name: 'a'.repeat(80) }).name).toBeUndefined();
    expect(validateProduct({ ...ok, description: 'a'.repeat(501) }).description).toBe(
      'La descripción admite hasta 500 caracteres.',
    );
  });
});

describe('checkImage', () => {
  const MB = 1024 * 1024;
  it('accepts JPG and PNG up to exactly 5 MB', () => {
    expect(checkImage({ mimeType: 'image/jpeg', fileSize: 5 * MB })).toBeNull();
    expect(checkImage({ mimeType: 'image/png', fileSize: 1 })).toBeNull();
  });
  it('rejects bigger files and other types', () => {
    expect(checkImage({ mimeType: 'image/png', fileSize: 5 * MB + 1 })).toBe('La imagen supera el límite de 5 MB.');
    expect(checkImage({ mimeType: 'image/webp', fileSize: 1 })).toBe('Elegí una imagen JPG o PNG.');
    expect(checkImage({ mimeType: null, fileSize: 1 })).toBe('Elegí una imagen JPG o PNG.');
  });
  it('lets an unknown size through for the server to judge', () => {
    expect(checkImage({ mimeType: 'image/png', fileSize: undefined })).toBeNull();
  });
});

describe('server error messages', () => {
  it('maps upload codes', () => {
    expect(uploadErrorMessage(new ApiError(413, 'MEDIA_TOO_LARGE', 'x'))).toBe('La imagen supera el límite de 5 MB.');
    expect(uploadErrorMessage(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'x'))).toBe('Elegí una imagen JPG o PNG.');
    expect(uploadErrorMessage(new ApiError(422, 'MEDIA_UNREADABLE', 'x'))).toBe('No se pudo leer la imagen. Probá con otra.');
    expect(uploadErrorMessage(new ApiError(0, null, 'x'))).toBe('No se pudo conectar con el servidor.');
    expect(uploadErrorMessage(new Error('x'))).toBe('No se pudo subir la imagen.');
  });
  it('maps product codes', () => {
    expect(productErrorMessage(new ApiError(422, 'PRODUCT_LIMIT_REACHED', 'x'))).toBe(
      'El local llegó al límite de 200 productos.',
    );
    expect(productErrorMessage(new ApiError(404, 'PRODUCT_NOT_FOUND', 'x'))).toBe('El producto ya no existe.');
    expect(productErrorMessage(new ApiError(403, null, 'x'))).toBe('No tenés permiso para esta acción.');
    expect(productErrorMessage(new ApiError(0, null, 'x'))).toBe('No se pudo conectar con el servidor.');
    expect(productErrorMessage(new ApiError(409, 'SKU_ALREADY_EXISTS', 'x'))).toBe('Ya existe un producto con ese SKU.');
    expect(productErrorMessage(new ApiError(400, 'SKU_REQUIRED', 'x'))).toBe('Ingresá el SKU para guardar este producto.');
    expect(productErrorMessage(new Error('x'))).toBe('No se pudo guardar el producto.');
  });
  it('maps category codes', () => {
    expect(categoryErrorMessage(new ApiError(409, 'CATEGORY_NAME_TAKEN', 'x'))).toBe('Ya existe una categoría con ese nombre.');
    expect(categoryErrorMessage(new Error('x'))).toBe('No se pudo crear la categoría.');
  });
});

describe('filterAdminProducts', () => {
  const make = (id: string, over: Partial<Product>): Product => ({
    product_id: id, category_id: 'c1', name: id, description: null, price: '1.00',
    image_url: null, is_available: true, sku: null, gluten_free: false, ...over,
  });
  const list = [
    make('Café', { sku: 'CAF-01' }),
    make('Medialuna', { category_id: 'c2', sku: 'MED-02', is_available: false }),
    make('Tostado', { category_id: 'c2' }),
  ];
  const all: { categoryId: string | null; query: string; onlyAvailable: boolean } = { categoryId: null, query: '', onlyAvailable: false };
  const names = (o: Partial<typeof all>) => filterAdminProducts(list, { ...all, ...o }).map((p) => p.name);

  it('returns everything with no filters or a blank query', () => {
    expect(names({})).toHaveLength(3);
    expect(names({ query: '   ' })).toHaveLength(3);
  });
  it('filters by category', () => expect(names({ categoryId: 'c2' })).toEqual(['Medialuna', 'Tostado']));
  it('matches name, ignoring case and accents', () => {
    expect(names({ query: 'CAFE' })).toEqual(['Café']);
    expect(names({ query: ' médialuna ' })).toEqual(['Medialuna']);
  });
  it('matches SKU and tolerates null SKU', () => {
    expect(names({ query: 'med-02' })).toEqual(['Medialuna']);
    expect(names({ query: 'zzz' })).toEqual([]);
  });
  it('filters only available', () => expect(names({ onlyAvailable: true })).toEqual(['Café', 'Tostado']));
  it('combines filters', () => {
    expect(names({ categoryId: 'c2', onlyAvailable: true, query: 'tost' })).toEqual(['Tostado']);
    expect(names({ categoryId: 'c1', query: 'tost' })).toEqual([]);
  });
});
