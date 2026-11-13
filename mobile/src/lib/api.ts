import { Platform } from 'react-native';

import { resolveTenantSlug } from '@/lib/tenant';

export type PublicProduct = {
  product_id: string;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
};

export type CatalogCategory = {
  category_id: string;
  name: string;
  products: PublicProduct[];
};

export type PublicCatalog = {
  store: { store_id: string; name: string; slug: string };
  categories: CatalogCategory[];
};

export type OrderInput = {
  items: { product_id: string; quantity: number }[];
  customer_name?: string;
  note?: string;
  source_screen_id?: string;
};

export type WhatsappPart = { part: number; total: number; text: string; url: string };

export type OrderResponse = {
  order_id: string;
  order_number: number;
  status: string;
  store: { name: string; slug: string };
  customer_name: string | null;
  note: string | null;
  total: string;
  created_at: string;
  items: {
    line_number: number;
    product_id: string;
    product_name: string;
    unit_price: string;
    quantity: number;
    line_total: string;
  }[];
  whatsapp_parts: WhatsappPart[];
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
    readonly unavailableNames: string[] = [],
  ) {
    super(message);
  }
}

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}

type Auth = { getToken: () => string | null; onUnauthorized: () => void };
let auth: Auth | null = null;

export function configureAuth(next: Auth | null) {
  auth = next;
}

async function send<T>(path: string, init: RequestInit | undefined, authenticated: boolean): Promise<T> {
  const tenant = resolveTenantSlug();
  const token = authenticated ? auth?.getToken() : null;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        // FormData needs fetch to set the multipart boundary itself.
        ...(typeof init?.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...(tenant ? { 'X-Tenant-Slug': tenant } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    } catch (e) {
    console.error('API_CONNECTION_ERROR:', {
      url: `${API_URL}${path}`,
      platform: Platform.OS,
      tenant,
      error: String(e),
    });
    throw new ApiError(0, null, 'No se pudo conectar con el servidor.');
    }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (authenticated && response.status === 401) auth?.onUnauthorized();
    const details: { name?: string }[] = Array.isArray(body.details) ? body.details : [];
    throw new ApiError(
      response.status,
      typeof body.code === 'string' ? body.code : null,
      Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? 'Error del servidor.'),
      details.flatMap((d) => (d.name ? [d.name] : [])),
    );
  }
  return body as T;
}

const request = <T>(path: string, init?: RequestInit) => send<T>(path, init, false);

/** Backoffice calls: adds the bearer token and clears the session on 401. */
export const authRequest = <T>(path: string, init?: RequestInit) => send<T>(path, init, true);

export type Me = {
  user: { user_id: string; email: string; first_name: string; last_name: string };
  tenant: { tenant_id: string; name: string; slug: string } | null;
  stores: { store_id: string; name: string; slug: string }[];
  permissions: string[];
  is_root: boolean;
};

export async function login(email: string, password: string): Promise<string> {
  const { access_token } = await request<{ access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return access_token;
}

export const getMe = () => authRequest<Me>('/me');

export async function getPublicCatalog(storeSlug: string): Promise<PublicCatalog> {
  const catalog = await request<PublicCatalog>(
    `/public/stores/${encodeURIComponent(storeSlug)}/catalog`,
  );
  return {
    ...catalog,
    categories: catalog.categories.map((c) => ({
      ...c,
      products: c.products.map((p) => ({ ...p, image_url: resolveImageUrl(p.image_url) })),
    })),
  };
}

export function createOrder(storeSlug: string, input: OrderInput): Promise<OrderResponse> {
  return request<OrderResponse>(`/public/stores/${encodeURIComponent(storeSlug)}/orders`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
