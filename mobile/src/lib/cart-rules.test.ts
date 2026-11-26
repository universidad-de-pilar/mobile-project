import {
  addLine,
  changeQuantity,
  parseCart,
  removeLine,
  setQuantity,
  toOrderItems,
  totalCents,
  type CartLine,
} from './cart-rules';

const product = (n: number, price = '10.10') => ({
  product_id: `p${n}`,
  name: `P${n}`,
  price,
  image_url: null,
});

describe('cart rules', () => {
  it('adds a product and increments an existing one', () => {
    let r = addLine([], product(1));
    r = addLine(r.lines, product(1));
    expect(r.rejected).toBe(false);
    expect(r.lines).toEqual([
      { productId: 'p1', name: 'P1', priceCents: 1010, imageUrl: null, quantity: 2 },
    ]);
  });

  it('caps quantity at 50', () => {
    let lines: CartLine[] = addLine([], product(1)).lines;
    lines = setQuantity(lines, 'p1', 50);
    expect(addLine(lines, product(1)).lines[0].quantity).toBe(50);
  });

  it('rejects the 51st distinct product', () => {
    let lines: CartLine[] = [];
    for (let i = 0; i < 50; i++) lines = addLine(lines, product(i)).lines;
    const r = addLine(lines, product(99));
    expect(r.rejected).toBe(true);
    expect(r.lines).toHaveLength(50);
  });

  it('adds a quantity to a new line', () => {
    expect(addLine([], product(1), 3).lines[0].quantity).toBe(3);
  });

  it('adds a quantity to an existing line', () => {
    const lines = addLine([], product(1), 2).lines;
    expect(addLine(lines, product(1), 4).lines[0].quantity).toBe(6);
  });

  it('caps the summed quantity at 50', () => {
    const lines = addLine([], product(1), 45).lines;
    expect(addLine(lines, product(1), 10).lines[0].quantity).toBe(50);
    expect(addLine([], product(2), 80).lines[0].quantity).toBe(50);
  });

  it('rejects a quantity for the 51st distinct product', () => {
    let lines: CartLine[] = [];
    for (let i = 0; i < 50; i++) lines = addLine(lines, product(i)).lines;
    const r = addLine(lines, product(99), 3);
    expect(r.rejected).toBe(true);
    expect(r.lines).toBe(lines);
  });

  it('clamps set quantity to 1..50', () => {
    const lines = addLine([], product(1)).lines;
    expect(setQuantity(lines, 'p1', 0)[0].quantity).toBe(1);
    expect(setQuantity(lines, 'p1', 80)[0].quantity).toBe(50);
    expect(setQuantity(lines, 'p1', 7)[0].quantity).toBe(7);
  });

  it('removes the line when the quantity drops below 1', () => {
    const lines = addLine([], product(1)).lines;
    expect(changeQuantity(lines, 'p1', 0)).toEqual([]);
    expect(changeQuantity(lines, 'p1', 3)[0].quantity).toBe(3);
  });

  it('removes a line', () => {
    const lines = addLine([], product(1)).lines;
    expect(removeLine(lines, 'p1')).toEqual([]);
  });

  it('totals in cents without float errors', () => {
    let lines = addLine([], product(1, '0.10')).lines;
    lines = setQuantity(lines, 'p1', 3);
    lines = addLine(lines, product(2, '0.20')).lines;
    expect(totalCents(lines)).toBe(50);
  });

  it('maps to order items', () => {
    const lines = setQuantity(addLine([], product(1)).lines, 'p1', 4);
    expect(toOrderItems(lines)).toEqual([{ product_id: 'p1', quantity: 4 }]);
  });
});

describe('parseCart', () => {
  const valid = [{ productId: 'p1', name: 'P1', priceCents: 100, imageUrl: null, quantity: 2 }];

  it('restores valid JSON', () => {
    expect(parseCart(JSON.stringify(valid))).toEqual(valid);
  });

  it.each([null, '', '{bad', '{"a":1}', '[{"productId":1}]'])(
    'returns an empty cart for %p',
    (raw) => {
      expect(parseCart(raw)).toEqual([]);
    },
  );
});
