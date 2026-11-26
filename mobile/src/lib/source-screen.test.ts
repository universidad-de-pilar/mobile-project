import { buildOrderInput } from '@/lib/order-rules';
import { parseSourceScreenId } from '@/lib/source-screen';

const UUID = 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70';

describe('parseSourceScreenId', () => {
  it('acepta un UUID y lo devuelve en minúsculas', () => {
    expect(parseSourceScreenId(UUID)).toBe(UUID);
    expect(parseSourceScreenId(UUID.toUpperCase())).toBe(UUID);
  });

  it.each([undefined, '', 'abc', `${UUID}x`, 'd4e5f6a7-b8c9-4d0e-9f1a', ['a', 'b']])(
    'ignora un valor mal formado: %p',
    (value) => {
      expect(parseSourceScreenId(value as string | undefined)).toBeNull();
    },
  );

  it('toma el primer valor si la query viene repetida', () => {
    expect(parseSourceScreenId([UUID, 'abc'])).toBe(UUID);
  });
});

describe('buildOrderInput con origen', () => {
  const lines = [{ productId: 'p1', name: 'Agua', priceCents: 1500, imageUrl: null, quantity: 1 }];

  it('envía source_screen_id solo si hay uno', () => {
    expect(buildOrderInput(lines, '', '', UUID).input.source_screen_id).toBe(UUID);
    expect('source_screen_id' in buildOrderInput(lines, '', '', null).input).toBe(false);
    expect('source_screen_id' in buildOrderInput(lines, '', '').input).toBe(false);
  });
});
