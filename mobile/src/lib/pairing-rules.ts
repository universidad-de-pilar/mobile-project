import { ApiError } from '@/lib/api';

export type Pairing = { code: string; claim_secret: string; expires_at: string };

export type PairingPoll = { status: 'pending' } | { status: 'paired'; token: string } | { status: 404 } | { status: 'error' };

export type PairingOutcome = { kind: 'wait' } | { kind: 'paired'; token: string } | { kind: 'renew' };

export const formatPairingCode = (code: string) => `${code.slice(0, 3)}-${code.slice(3)}`;

/** What the owner types: accepts lowercase, dash and spaces. */
export const normalizePairingInput = (raw: string) => raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);

export function pairingOutcome(poll: PairingPoll, expiresAt: string, now: number): PairingOutcome {
  if (poll.status === 'paired') return { kind: 'paired', token: poll.token };
  if (poll.status === 404 || now >= Date.parse(expiresAt)) return { kind: 'renew' };
  return { kind: 'wait' };
}

export function pairErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'PAIRING_CODE_INVALID') return 'Código inválido o vencido';
    if (error.code === 'SCREEN_NOT_FOUND') return 'La pantalla ya no existe.';
    if (error.status === 403) return 'No tenés permiso para esta acción.';
    if (error.status === 0) return 'No se pudo conectar con el servidor.';
  }
  return 'No se pudo completar la acción.';
}
