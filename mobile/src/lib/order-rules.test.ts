import { buildOrderInput, whatsappCopy } from './order-rules';

const lines = [{ productId: 'p1', name: 'A', priceCents: 100, imageUrl: null, quantity: 2 }];
const part = (part: number, total: number) => ({ part, total, text: '', url: `u${part}` });

describe('buildOrderInput', () => {
  it('trims fields and omits empty ones', () => {
    expect(buildOrderInput(lines, '  ', ' ').input).toEqual({ items: [{ product_id: 'p1', quantity: 2 }] });
    expect(buildOrderInput(lines, ' Ana ', ' sin sal ').input).toMatchObject({ customer_name: 'Ana', note: 'sin sal' });
  });

  it('accepts a 200 char note and rejects 201', () => {
    expect(buildOrderInput(lines, '', 'a'.repeat(200)).error).toBeNull();
    expect(buildOrderInput(lines, '', 'a'.repeat(201)).error).toMatch(/200/);
  });

  it('accepts a 50 char name and rejects 51', () => {
    expect(buildOrderInput(lines, 'a'.repeat(50), '').error).toBeNull();
    expect(buildOrderInput(lines, 'a'.repeat(51), '').error).toMatch(/50/);
  });
});

describe('whatsappCopy', () => {
  it('has no buttons when the store has no number', () => {
    expect(whatsappCopy([])).toEqual({
      message: 'Tu pedido fue registrado, el comercio lo verá en su panel',
      labels: [],
    });
  });

  it('single part', () => {
    expect(whatsappCopy([part(1, 1)])).toEqual({
      message: 'Enviá el pedido al WhatsApp del local.',
      labels: ['Enviar por WhatsApp'],
    });
  });

  it('several parts', () => {
    expect(whatsappCopy([part(1, 2), part(2, 2)])).toEqual({
      message:
        'Enviá el pedido al WhatsApp del local. Es largo, así que va en 2 partes: tocá cada botón en orden.',
      labels: ['Enviar parte 1/2', 'Enviar parte 2/2'],
    });
  });
});
