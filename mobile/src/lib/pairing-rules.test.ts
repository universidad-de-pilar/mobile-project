import { ApiError } from './api';
import { formatPairingCode, normalizePairingInput, pairErrorMessage, pairingOutcome } from './pairing-rules';

describe('formatPairingCode', () => {
  it('shows the code as XXX-XXX', () => {
    expect(formatPairingCode('ABCD23')).toBe('ABC-D23');
  });
});

describe('normalizePairingInput', () => {
  it('uppercases, drops the dash and spaces and caps at 6 characters', () => {
    expect(normalizePairingInput('abc-d2 3xyz')).toBe('ABCD23');
  });
});

describe('pairingOutcome', () => {
  const now = Date.parse('2026-11-15T12:00:00Z');
  const future = '2026-11-15T12:05:00Z';
  const past = '2026-11-15T11:59:00Z';

  it('keeps waiting while pending and not expired', () => {
    expect(pairingOutcome({ status: 'pending' }, future, now)).toEqual({ kind: 'wait' });
  });

  it('returns the token once paired', () => {
    expect(pairingOutcome({ status: 'paired', token: 't' }, future, now)).toEqual({ kind: 'paired', token: 't' });
  });

  it('asks for a new code when the server forgot it (404) or it expired locally', () => {
    expect(pairingOutcome({ status: 404 }, future, now)).toEqual({ kind: 'renew' });
    expect(pairingOutcome({ status: 'pending' }, past, now)).toEqual({ kind: 'renew' });
  });

  it('keeps waiting on network errors', () => {
    expect(pairingOutcome({ status: 'error' }, future, now)).toEqual({ kind: 'wait' });
  });
});

describe('pairErrorMessage', () => {
  it('explains an invalid or expired code', () => {
    expect(pairErrorMessage(new ApiError(404, 'PAIRING_CODE_INVALID', 'x'))).toBe('Código inválido o vencido');
  });

  it('falls back to a generic message', () => {
    expect(pairErrorMessage(new ApiError(0, null, 'x'))).toBe('No se pudo conectar con el servidor.');
    expect(pairErrorMessage(new Error('x'))).toBe('No se pudo completar la acción.');
  });
});
