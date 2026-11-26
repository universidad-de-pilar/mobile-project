import { ApiError } from '@/lib/api';
import type { OrderStatus } from '@/components/ui/mostrador/badge';

/** Local calendar day as the ISO instants the API expects (`from` inclusive, `to` exclusive). */
export function todayRange(now: Date): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  // Date(y, m, d + 1) instead of +24h so a DST change does not shift the end of the day.
  return { from: new Date(y, m, d).toISOString(), to: new Date(y, m, d + 1).toISOString() };
}

const CANCEL = { label: 'Cancelar', to: 'cancelada' } as const;

const NEXT: Record<OrderStatus, { label: string; to: OrderStatus }[]> = {
  generada: [{ label: 'Empezar preparación', to: 'en_preparacion' }, CANCEL],
  en_preparacion: [{ label: 'Marcar lista', to: 'lista' }, CANCEL],
  lista: [{ label: 'Marcar entregada', to: 'entregada' }, CANCEL],
  entregada: [],
  cancelada: [],
};

export const nextActions = (status: OrderStatus) => NEXT[status];

/** `QR` means the order came from a screen's QR (`source_screen` set). */
export function orderSummary(o: { customer_name: string | null; items_count: number; source_screen: unknown }): string {
  const items = `${o.items_count} ${o.items_count === 1 ? 'ítem' : 'ítems'}`;
  return [o.customer_name || 'Sin nombre', items, ...(o.source_screen ? ['QR'] : [])].join(' · ');
}

export function orderErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_STATUS_TRANSITION') return 'La orden ya cambió de estado. Actualizamos la lista.';
    if (error.status === 403) return 'No tenés permiso para esta acción.';
    if (error.status === 0) return 'No se pudo conectar con el servidor.';
  }
  return 'No se pudo actualizar la orden.';
}
