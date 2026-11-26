import { ConflictException } from '@nestjs/common';
import { ORDER_STATUSES, allowedTransitions, assertTransition } from 'src/orders/domain/order-status';

describe('Order status transitions', () => {
  it('debe permitir solo el siguiente estado o cancelar', () => {
    expect(allowedTransitions('generada')).toEqual(['en_preparacion', 'cancelada']);
    expect(allowedTransitions('en_preparacion')).toEqual(['lista', 'cancelada']);
    expect(allowedTransitions('lista')).toEqual(['entregada', 'cancelada']);
  });

  it('debe tratar entregada y cancelada como finales', () => {
    expect(allowedTransitions('entregada')).toEqual([]);
    expect(allowedTransitions('cancelada')).toEqual([]);
  });

  it('debe aceptar una transicion valida', () => {
    expect(() => assertTransition('generada', 'en_preparacion')).not.toThrow();
  });

  it('debe aceptar exactamente las transiciones del contrato y rechazar el resto', () => {
    const statuses = ORDER_STATUSES;
    const valid = new Set(['generada>en_preparacion', 'generada>cancelada', 'en_preparacion>lista', 'en_preparacion>cancelada', 'lista>entregada', 'lista>cancelada']);
    for (const from of statuses) for (const to of statuses) {
      const ok = (() => { try { assertTransition(from, to); return true; } catch { return false; } })();
      expect({ from, to, ok }).toEqual({ from, to, ok: valid.has(`${from}>${to}`) });
    }
  });

  it.each([
    ['entregada', 'generada'],
    ['generada', 'lista'],
    ['lista', 'en_preparacion'],
    ['lista', 'lista'],
    ['cancelada', 'generada'],
  ] as const)('debe rechazar %s -> %s con INVALID_STATUS_TRANSITION', (from, to) => {
    const error: any = (() => { try { assertTransition(from, to); } catch (e) { return e; } })();

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      details: { from, to, allowed: allowedTransitions(from) },
    });
  });
});
