import { buildWhatsappParts, formatMoney, WHATSAPP_MAX_PART_CHARS } from 'src/orders/domain/whatsapp-message';

const store = { name: 'Palermo', whatsapp_number: '+5491112345678' };
const order = (extra: object = {}) => ({ order_number: 123, customer_name: 'Ana', note: 'Sin hielo', total: '3000.00', ...extra });
const line = (name: string, quantity = 2, unit = '1500.00', total = '3000.00') =>
  ({ product_name: name, quantity, unit_price: unit, line_total: total });

describe('formatMoney', () => {
  it('debe formatear en es-AR con separador de miles y dos decimales', () => {
    expect(formatMoney('1500.00')).toBe('$1.500,00');
    expect(formatMoney('1234567.50')).toBe('$1.234.567,50');
    expect(formatMoney('99.00')).toBe('$99,00');
  });
});

describe('buildWhatsappParts', () => {
  it('debe devolver [] si el local no tiene numero', () => {
    expect(buildWhatsappParts({ name: 'Palermo', whatsapp_number: null }, order(), [line('Agua 500 ml')])).toEqual([]);
  });

  it('debe armar una sola parte con el formato del contrato', () => {
    const parts = buildWhatsappParts(store, order(), [line('Agua 500 ml')]);

    expect(parts).toHaveLength(1);
    expect(parts[0].part).toBe(1);
    expect(parts[0].total).toBe(1);
    expect(parts[0].text).toBe(
      'Pedido #123\nLocal: Palermo\nCliente: Ana\nNota: Sin hielo\n\n2 x Agua 500 ml — $3.000,00\n\nTotal: $3.000,00',
    );
    expect(parts[0].url).toBe(`https://wa.me/5491112345678?text=${encodeURIComponent(parts[0].text)}`);
  });

  it('debe omitir cliente y nota si no existen', () => {
    const [part] = buildWhatsappParts(store, order({ customer_name: null, note: null }), [line('Agua')]);

    expect(part.text).toBe('Pedido #123\nLocal: Palermo\n\n2 x Agua — $3.000,00\n\nTotal: $3.000,00');
  });

  it('debe dividir en partes de a lo sumo 1500 caracteres sin cortar lineas de item', () => {
    const lines = Array.from({ length: 40 }, (_, i) => line(`Producto numero ${i + 1} ${'x'.repeat(50)}`, 1, '100.00', '100.00'));

    const parts = buildWhatsappParts(store, order({ total: '4000.00' }), lines);

    expect(parts.length).toBeGreaterThan(1);
    parts.forEach((p, i) => {
      expect(p.text.length).toBeLessThanOrEqual(WHATSAPP_MAX_PART_CHARS);
      expect(p.part).toBe(i + 1);
      expect(p.total).toBe(parts.length);
      expect(p.text.startsWith(`Pedido #123 — parte ${i + 1}/${parts.length}`)).toBe(true);
    });
    const itemLines = parts.flatMap((p) => p.text.split('\n').filter((l) => /^\d+ x /.test(l)));
    expect(itemLines).toEqual(lines.map((l) => `${l.quantity} x ${l.product_name} — $100,00`));
    expect(parts[0].text).toContain('Local: Palermo');
    expect(parts[1].text).not.toContain('Local:');
    parts.slice(0, -1).forEach((p) => expect(p.text).not.toContain('Total:'));
    expect(parts[parts.length - 1].text.endsWith('Total: $4.000,00')).toBe(true);
  });

  it('debe abrir una parte nueva si la linea Total no entra en la ultima', () => {
    // Without the Total line the text is 1486 chars: fits once the "parte 1/2" header is added (+13), but not with Total (+16).
    const filler = (n: number) => line('y'.repeat(n), 1, '100.00', '100.00');
    const base = buildWhatsappParts(store, order({ total: '100.00' }), [filler(10)])[0].text.length;

    const parts = buildWhatsappParts(store, order({ total: '100.00' }), [filler(1512 - base)]);

    expect(parts).toHaveLength(2);
    expect(parts[0].text).not.toContain('Total:');
    expect(parts[parts.length - 1].text).toContain('Total: $100,00');
    parts.forEach((p) => expect(p.text.length).toBeLessThanOrEqual(WHATSAPP_MAX_PART_CHARS));
  });
});
