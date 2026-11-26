import { ApiError } from '@/lib/api';

const E164 = /^\+[1-9][0-9]{7,14}$/;

/** Strips spaces, dashes, dots and parentheses. Empty means "no WhatsApp" (`null`). */
export function parseWhatsapp(input: string): { value: string | null; error?: string } {
  const text = input.trim();
  if (!text) return { value: null };
  const value = text.replace(/[\s\-.()]/g, '');
  if (!E164.test(value)) {
    return { value: null, error: 'Ingresá el número con código de país, por ejemplo +54 9 11 5555-0142.' };
  }
  return { value };
}

// ponytail: only Argentine mobiles are grouped; other countries show the plain number.
export function formatWhatsapp(value: string | null): string {
  if (!value) return '';
  const m = /^\+549(\d{2})(\d{4})(\d{4})$/.exec(value);
  return m ? `+54 9 ${m[1]} ${m[2]}-${m[3]}` : value;
}

export function storeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'No tenés permiso para editar el local.';
    if (error.status === 0) return 'No se pudo conectar con el servidor.';
    if (error.status === 400) return 'Revisá los datos ingresados.';
  }
  return 'No se pudieron guardar los cambios.';
}
