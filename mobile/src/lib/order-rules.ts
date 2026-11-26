import type { OrderInput, WhatsappPart } from '@/lib/api';
import { toOrderItems, type CartLine } from '@/lib/cart-rules';

export const MAX_NAME = 50;
export const MAX_NOTE = 200;

export function buildOrderInput(
  lines: CartLine[],
  name: string,
  note: string,
  sourceScreenId?: string | null,
): { input: OrderInput; error: string | null } {
  const customer_name = name.trim();
  const trimmedNote = note.trim();
  const input: OrderInput = {
    items: toOrderItems(lines),
    ...(customer_name ? { customer_name } : {}),
    ...(trimmedNote ? { note: trimmedNote } : {}),
    ...(sourceScreenId ? { source_screen_id: sourceScreenId } : {}),
  };
  let error: string | null = null;
  if (customer_name.length > MAX_NAME) error = `El nombre admite hasta ${MAX_NAME} caracteres.`;
  else if (trimmedNote.length > MAX_NOTE) error = `La nota admite hasta ${MAX_NOTE} caracteres.`;
  return { input, error };
}

const SEND = 'Enviá el pedido al WhatsApp del local.';

export function whatsappCopy(parts: WhatsappPart[]): { message: string; labels: string[] } {
  if (parts.length === 0) {
    return { message: 'Tu pedido fue registrado, el comercio lo verá en su panel', labels: [] };
  }
  if (parts.length === 1) return { message: SEND, labels: ['Enviar por WhatsApp'] };
  return {
    message: `${SEND} Es largo, así que va en ${parts.length} partes: tocá cada botón en orden.`,
    labels: parts.map((p) => `Enviar parte ${p.part}/${p.total}`),
  };
}
