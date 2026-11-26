import { Platform } from 'react-native';

export function tenantFromHost(hostname: string, baseDomain: string): string | null {
  const host = hostname.toLowerCase();
  const base = baseDomain.toLowerCase();
  if (!host.endsWith(`.${base}`)) return null;
  const label = host.slice(0, -(base.length + 1));
  return /^[a-z0-9-]+$/.test(label) && label !== 'www' ? label : null;
}

export function resolveTenantSlug(): string | null {
  const fallback = process.env.EXPO_PUBLIC_TENANT_SLUG || null;
  if (Platform.OS !== 'web' || typeof window === 'undefined') return fallback;
  const base = process.env.EXPO_PUBLIC_BASE_DOMAIN || 'localhost';
  return tenantFromHost(window.location.hostname, base) ?? fallback;
}

export const DEFAULT_STORE_SLUG = process.env.EXPO_PUBLIC_STORE_SLUG || 'palermo';
