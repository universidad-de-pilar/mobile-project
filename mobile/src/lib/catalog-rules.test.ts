import { productsForCategory, visibleCategories } from './catalog-rules';

const product = (id: string) => ({
  product_id: id,
  name: id,
  description: null,
  price: '1.00',
  image_url: null,
  gluten_free: false,
});

const categories = [
  { category_id: 'a', name: 'Bebidas', products: [product('p1'), product('p2')] },
  { category_id: 'b', name: 'Vacia', products: [] },
  { category_id: 'c', name: 'Comidas', products: [product('p3')] },
];

describe('visibleCategories', () => {
  it('drops categories without products', () => {
    expect(visibleCategories(categories).map((c) => c.category_id)).toEqual(['a', 'c']);
  });
});

describe('productsForCategory', () => {
  it('returns the products of the active category', () => {
    expect(productsForCategory(categories, 'c').map((p) => p.product_id)).toEqual(['p3']);
  });

  it('falls back to the first visible category for an unknown id', () => {
    expect(productsForCategory(categories, 'zzz').map((p) => p.product_id)).toEqual(['p1', 'p2']);
    expect(productsForCategory(categories, null).map((p) => p.product_id)).toEqual(['p1', 'p2']);
  });

  it('returns nothing when there are no visible categories', () => {
    expect(productsForCategory([categories[1]], null)).toEqual([]);
  });
});
