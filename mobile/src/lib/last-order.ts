import { Platform } from 'react-native';

import type { OrderResponse } from '@/lib/api';
import { resolveTenantSlug } from '@/lib/tenant';

const key = (storeSlug: string) => `order:${resolveTenantSlug() ?? '-'}:${storeSlug}`;

// ponytail: native keeps the order in memory only, lost on app restart; use AsyncStorage if it must survive
const memory = new Map<string, OrderResponse>();

export function saveLastOrder(storeSlug: string, order: OrderResponse) {
  memory.set(key(storeSlug), order);
  if (Platform.OS !== 'web') return;
  try {
    window.sessionStorage.setItem(key(storeSlug), JSON.stringify(order));
  } catch {}
}

export function loadLastOrder(storeSlug: string): OrderResponse | null {
  if (Platform.OS === 'web') {
    try {
      const raw = window.sessionStorage.getItem(key(storeSlug));
      if (raw) return JSON.parse(raw) as OrderResponse;
    } catch {}
  }
  return memory.get(key(storeSlug)) ?? null;
}
