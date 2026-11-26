import { Platform } from 'react-native';

import { resolveTenantSlug } from '@/lib/tenant';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The backend DTO rejects a malformed `source_screen_id` with 400, so only valid UUIDs get through. */
export function parseSourceScreenId(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first && UUID.test(first) ? first.toLowerCase() : null;
}

const key = (storeSlug: string) => `src:${resolveTenantSlug() ?? '-'}:${storeSlug}`;

// ponytail: native keeps it in memory only, lost on app restart
const memory = new Map<string, string>();

export function saveSourceScreen(storeSlug: string, id: string) {
  memory.set(key(storeSlug), id);
  if (Platform.OS !== 'web') return;
  try {
    window.sessionStorage.setItem(key(storeSlug), id);
  } catch {}
}

export function loadSourceScreen(storeSlug: string): string | null {
  if (Platform.OS === 'web') {
    try {
      const stored = parseSourceScreenId(window.sessionStorage.getItem(key(storeSlug)) ?? undefined);
      if (stored) return stored;
    } catch {}
  }
  return memory.get(key(storeSlug)) ?? null;
}
