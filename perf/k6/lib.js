import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const TENANT = __ENV.TENANT || 'local1';
export const STORE = __ENV.STORE || 'palermo';
// Seed test credentials of database/seeds/dev_local1.sql; override them for any shared environment.
export const OWNER_EMAIL = __ENV.OWNER_EMAIL || 'owner@local1.test';
export const OWNER_PASSWORD = __ENV.OWNER_PASSWORD || 'Local1-dev-2026';

// The tenant travels in X-Tenant-Slug because BASE_URL usually has no subdomain.
export const headers = (tenant = TENANT, extra = {}) => ({
  'Content-Type': 'application/json',
  'X-Tenant-Slug': tenant,
  ...extra,
});

export function login(tenant, email, password) {
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email, password }), { headers: headers(tenant) });
  check(res, { 'login 200': (r) => r.status === 200 });
  return res.json('access_token');
}

export function getCatalog(tenant = TENANT, store = STORE, params = {}) {
  const res = http.get(`${BASE_URL}/public/stores/${store}/catalog`, { headers: headers(tenant), ...params });
  check(res, { 'catalog 200': (r) => r.status === 200 }, params.tags);
  return res;
}

// Builds a valid cart from a catalog response: 1 to 3 products, quantity 1 to 3.
export function cartFrom(catalogRes) {
  const products = catalogRes.json('categories').flatMap((c) => c.products);
  const count = Math.min(products.length, 1 + Math.floor(Math.random() * 3));
  return products.slice(0, count).map((p) => ({ product_id: p.product_id, quantity: 1 + Math.floor(Math.random() * 3) }));
}

export function createOrder(items, tenant = TENANT, store = STORE, params = {}) {
  return http.post(
    `${BASE_URL}/public/stores/${store}/orders`,
    JSON.stringify({ items, customer_name: 'k6', note: 'carga' }),
    { headers: headers(tenant), ...params },
  );
}

// Customer flow: catalog first, then an order with probability orderRatio.
export function customerFlow(orderRatio, tenant = TENANT, store = STORE, params = {}) {
  const catalog = getCatalog(tenant, store, params);
  if (catalog.status === 200 && Math.random() < orderRatio) {
    const res = createOrder(cartFrom(catalog), tenant, store, params);
    check(res, { 'order 201': (r) => r.status === 201 }, params.tags);
  }
}

// Reuses active screens named k6-* and creates the missing ones, so reruns do not pile up screens.
export function ensureScreens(count) {
  const token = login(TENANT, OWNER_EMAIL, OWNER_PASSWORD);
  const auth = headers(TENANT, { Authorization: `Bearer ${token}` });
  const stores = http.get(`${BASE_URL}/stores`, { headers: auth }).json();
  const storeId = stores.find((s) => s.slug === STORE).store_id;
  const existing = http.get(`${BASE_URL}/screens?store_id=${storeId}`, { headers: auth }).json()
    .filter((s) => s.is_active && s.name.startsWith('k6-'));
  const tokens = existing.map((s) => s.token);
  for (let i = tokens.length; i < count; i++) {
    const res = http.post(`${BASE_URL}/screens`, JSON.stringify({ store_id: storeId, name: `k6-${i + 1}` }), { headers: auth });
    tokens.push(res.json('token'));
  }
  return tokens.slice(0, count);
}

// Screen polling as the player does it: conditional GET with the last ETag.
export function pollPlaylist(token, state, params = {}) {
  const extra = state.etag ? { 'If-None-Match': state.etag } : {};
  const res = http.get(`${BASE_URL}/player/${token}/playlist`, { headers: headers(TENANT, extra), ...params });
  check(res, { 'playlist 200 or 304': (r) => r.status === 200 || r.status === 304 }, params.tags);
  if (res.status === 200) state.etag = res.headers['Etag'];
  return res;
}
