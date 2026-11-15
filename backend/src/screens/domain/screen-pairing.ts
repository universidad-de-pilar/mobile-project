import { randomBytes, randomInt } from "crypto";

export const PAIRING_TTL_MS = 10 * 60 * 1000;

// Sin 0/O/1/I para que se pueda leer y tipear desde un televisor.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generatePairingCode = () =>
    Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

export const generateClaimSecret = () => randomBytes(32).toString('base64url');

// Acepta el código con o sin guion, en minúsculas y con espacios.
export const normalizePairingCode = (input: string) => input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
