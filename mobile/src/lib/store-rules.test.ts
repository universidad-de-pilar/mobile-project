import { ApiError } from './api';
import { formatWhatsapp, parseWhatsapp, storeErrorMessage } from './store-rules';

describe('parseWhatsapp', () => {
  it('normalizes a formatted number to E.164', () => {
    expect(parseWhatsapp('+54 9 11 5555-0142')).toEqual({ value: '+5491155550142' });
    expect(parseWhatsapp(' +54 (9) 11.5555-0142 ')).toEqual({ value: '+5491155550142' });
  });
  it('turns empty into null', () => {
    expect(parseWhatsapp('  ')).toEqual({ value: null });
  });
  it('rejects missing plus, letters, too short and leading zero', () => {
    for (const bad of ['5491155550142', '+54 9 abc', '+54 11', '+0 1234 5678']) {
      expect(parseWhatsapp(bad).error).toBe('Ingresá el número con código de país, por ejemplo +54 9 11 5555-0142.');
    }
  });
});

describe('formatWhatsapp', () => {
  it('groups Argentine mobile numbers and leaves others as they are', () => {
    expect(formatWhatsapp('+5491155550142')).toBe('+54 9 11 5555-0142');
    expect(formatWhatsapp('+14155550123')).toBe('+14155550123');
    expect(formatWhatsapp(null)).toBe('');
  });
});

describe('storeErrorMessage', () => {
  it('maps permission, connection, validation and unknown errors', () => {
    expect(storeErrorMessage(new ApiError(403, null, 'x'))).toBe('No tenés permiso para editar el local.');
    expect(storeErrorMessage(new ApiError(0, null, 'x'))).toBe('No se pudo conectar con el servidor.');
    expect(storeErrorMessage(new ApiError(400, null, 'name must be shorter'))).toBe('Revisá los datos ingresados.');
    expect(storeErrorMessage(new Error('x'))).toBe('No se pudieron guardar los cambios.');
  });
});
