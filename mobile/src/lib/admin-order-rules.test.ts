import { ApiError } from './api';
import { nextActions, orderErrorMessage, orderSummary, todayRange } from './admin-order-rules';

describe('todayRange', () => {
  it('spans the local calendar day, not 24h from now', () => {
    const now = new Date(2026, 10, 2, 23, 30);
    const { from, to } = todayRange(now);
    expect(from).toBe(new Date(2026, 10, 2).toISOString());
    expect(to).toBe(new Date(2026, 10, 3).toISOString());
    expect(new Date(from) <= now && now < new Date(to)).toBe(true);
  });

  it('keeps a local late-evening order in today and early morning too', () => {
    const early = todayRange(new Date(2026, 10, 2, 0, 5));
    expect(early.from).toBe(new Date(2026, 10, 2).toISOString());
  });

  it('rolls over month ends', () => {
    expect(todayRange(new Date(2026, 0, 31, 12)).to).toBe(new Date(2026, 1, 1).toISOString());
  });
});

describe('nextActions', () => {
  it('maps each status to its next step and cancel', () => {
    expect(nextActions('generada')).toEqual([
      { label: 'Empezar preparación', to: 'en_preparacion' },
      { label: 'Cancelar', to: 'cancelada' },
    ]);
    expect(nextActions('en_preparacion').map((a) => a.to)).toEqual(['lista', 'cancelada']);
    expect(nextActions('lista').map((a) => a.label)).toEqual(['Marcar entregada', 'Cancelar']);
  });

  it('has no actions in terminal states', () => {
    expect(nextActions('entregada')).toEqual([]);
    expect(nextActions('cancelada')).toEqual([]);
  });
});

describe('orderSummary', () => {
  const base = { customer_name: 'Juan', items_count: 3, source_screen: { screen_id: 's', name: 'Entrada' } };
  it('joins name, items and QR origin', () => {
    expect(orderSummary(base)).toBe('Juan · 3 ítems · QR');
  });
  it('singular item, no name, no origin', () => {
    expect(orderSummary({ customer_name: null, items_count: 1, source_screen: null })).toBe('Sin nombre · 1 ítem');
  });
});

describe('orderErrorMessage', () => {
  it('explains the invalid transition and connection errors', () => {
    expect(orderErrorMessage(new ApiError(409, 'INVALID_STATUS_TRANSITION', 'x'))).toBe(
      'La orden ya cambió de estado. Actualizamos la lista.',
    );
    expect(orderErrorMessage(new ApiError(0, null, 'x'))).toBe('No se pudo conectar con el servidor.');
    expect(orderErrorMessage(new ApiError(403, null, 'x'))).toBe('No tenés permiso para esta acción.');
    expect(orderErrorMessage(new Error('x'))).toBe('No se pudo actualizar la orden.');
  });
});
