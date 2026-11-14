import { Platform } from 'react-native';

import type { OrderStatus } from '@/components/ui/mostrador/badge';
import { authRequest, resolveImageUrl } from '@/lib/api';
import type { ScheduleInput, SlotInput } from '@/lib/schedule-rules';
import type { NewEmployeeInput } from '@/lib/employee-rules';
import type { NewTenantInput } from '@/lib/tenant-rules';

export type Category = { category_id: string; name: string; sort_order: number };

export type Product = {
  product_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
  is_available: boolean;
};

export type ProductInput = {
  category_id: string;
  name: string;
  description?: string | null;
  price: string;
  is_available: boolean;
};

export type PickedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: File;
};

const withImage = (p: Product): Product => ({ ...p, image_url: resolveImageUrl(p.image_url) });
const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });

export const listCategories = (storeId: string) =>
  authRequest<Category[]>(`/categories?store_id=${storeId}`);

export const createCategory = (storeId: string, name: string, sortOrder: number) =>
  authRequest<Category>('/categories', json('POST', { store_id: storeId, name, sort_order: sortOrder }));

export const listProducts = async (storeId: string, categoryId?: string) => {
  const query = `store_id=${storeId}${categoryId ? `&category_id=${categoryId}` : ''}`;
  return (await authRequest<Product[]>(`/products?${query}`)).map(withImage);
};

export const getProduct = async (id: string) => withImage(await authRequest<Product>(`/products/${id}`));

export const createProduct = (storeId: string, input: ProductInput) =>
  authRequest<Product>('/products', json('POST', { store_id: storeId, ...input }));

export const updateProduct = (id: string, input: Partial<ProductInput>) =>
  authRequest<Product>(`/products/${id}`, json('PATCH', input));

/** Web sends the File the picker gives; native sends the `{uri, name, type}` shape React Native understands. */
export async function buildImageForm(image: PickedImage): Promise<FormData> {
  const form = new FormData();
  const type = image.mimeType ?? 'image/jpeg';
  if (Platform.OS === 'web') {
    form.append('file', image.file ?? (await (await fetch(image.uri)).blob()), image.fileName ?? 'image');
  } else {
    form.append('file', { uri: image.uri, name: image.fileName ?? 'image', type } as unknown as Blob);
  }
  return form;
}

export async function uploadProductImage(id: string, image: PickedImage) {
  return withImage(await authRequest<Product>(`/products/${id}/image`, { method: 'PUT', body: await buildImageForm(image) }));
}

export type OrderSummary = {
  order_id: string;
  order_number: number;
  status: OrderStatus;
  customer_name: string | null;
  note: string | null;
  total: string;
  items_count: number;
  source_screen: { screen_id: string; name: string } | null;
  created_at: string;
};

export type OrderItem = { line_number: number; product_name: string; quantity: number; line_total: string };

export type Order = OrderSummary & { items: OrderItem[] };

export type OrderQuery = { status?: OrderStatus; from?: string; to?: string; page: number };

export const ORDERS_PAGE_SIZE = 20;

export function listOrders(storeId: string, { status, from, to, page }: OrderQuery) {
  const params = new URLSearchParams({ store_id: storeId, page: String(page), limit: String(ORDERS_PAGE_SIZE) });
  if (status) params.set('status', status);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return authRequest<{ data: OrderSummary[]; meta: { page: number; limit: number; total: number } }>(`/orders?${params}`);
}

export const getOrder = (id: string) => authRequest<Order>(`/orders/${id}`);

export const updateOrderStatus = (id: string, status: OrderStatus) =>
  authRequest<Order>(`/orders/${id}/status`, json('PATCH', { status }));

export type Store = {
  store_id: string;
  name: string;
  whatsapp_number: string | null;
  self_order_url: string;
};

export const getStore = (id: string) => authRequest<Store>(`/stores/${id}`);

export const updateStore = (id: string, input: { name?: string; whatsapp_number?: string | null }) =>
  authRequest<Store>(`/stores/${id}`, json('PATCH', input));

export type Media = {
  media_id: string;
  type: 'image' | 'video';
  url: string;
  original_name: string;
  /** Real length for videos; images get theirs per playlist item. */
  duration_seconds: number | null;
};

const withUrl = <T extends { url: string }>(m: T): T => ({ ...m, url: resolveImageUrl(m.url) ?? m.url });

export const listMedia = async () => (await authRequest<Media[]>('/content')).map(withUrl);

export async function uploadMedia(file: PickedImage) {
  return withUrl(await authRequest<Media>('/content', { method: 'POST', body: await buildImageForm(file) }));
}

export const deleteMedia = (id: string) => authRequest<unknown>(`/content/${id}`, { method: 'DELETE' });

export type Playlist = { playlist_id: string; name: string; item_count: number };

export type PlaylistItem = {
  media_id: string;
  type: 'image' | 'video';
  url: string;
  original_name: string;
  duration_seconds: number;
};

export type PlaylistDetail = Playlist & { items: PlaylistItem[] };

export const listPlaylists = () => authRequest<Playlist[]>('/playlists');

export const createPlaylist = (name: string) => authRequest<Playlist>('/playlists', json('POST', { name }));

export const renamePlaylist = (id: string, name: string) =>
  authRequest<Playlist>(`/playlists/${id}`, json('PATCH', { name }));

export const deletePlaylist = (id: string) => authRequest<unknown>(`/playlists/${id}`, { method: 'DELETE' });

export const getPlaylist = async (id: string) => {
  const detail = await authRequest<PlaylistDetail>(`/playlists/${id}`);
  return { ...detail, items: detail.items.map(withUrl) };
};

/** Replaces the whole list; videos must not send a duration. */
export const savePlaylistItems = (id: string, items: { media_id: string; duration_seconds?: number }[]) =>
  authRequest<PlaylistDetail>(`/playlists/${id}/items`, json('PUT', { items }));

export type PlaylistScreen = {
  screen_id: string;
  screen_name: string;
  store_id: string;
  store_name: string;
  days: number | null;
  start: string | null;
  end: string | null;
};

export const listPlaylistScreens = (id: string) => authRequest<PlaylistScreen[]>(`/playlists/${id}/screens`);

export type Schedule = {
  default_playlist_id: string | null;
  slots: (SlotInput & { playlist_name: string })[];
};

export const getSchedule = (screenId: string) => authRequest<Schedule>(`/screens/${screenId}/schedule`);

export const saveSchedule = (screenId: string, schedule: ScheduleInput) =>
  authRequest<Schedule>(`/screens/${screenId}/schedule`, json('PUT', schedule));

export type Tenant = { tenant_id: string; name: string; slug: string; is_active: boolean; created_at: string };

export const listTenants = () => authRequest<Tenant[]>('/tenants');

export const createTenant = (input: NewTenantInput) => authRequest<Tenant>('/tenants', json('POST', input));

export const setTenantActive = (id: string, active: boolean) =>
  authRequest<Tenant>(`/tenants/${id}/${active ? 'reactivate' : 'suspend'}`, { method: 'POST' });

export type Screen = {
  screen_id: string;
  name: string;
  token: string;
  player_url: string;
  is_active: boolean;
};

export const listScreens = (storeId: string) => authRequest<Screen[]>(`/screens?store_id=${storeId}`);

export const createScreen = (storeId: string, name: string) =>
  authRequest<Screen>('/screens', json('POST', { store_id: storeId, name }));

export type Employee = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  store_ids: string[];
};

export const listEmployees = () => authRequest<Employee[]>('/employees');

export const createEmployee = (input: NewEmployeeInput) => authRequest<Employee>('/employees', json('POST', input));

export const updateEmployee = (id: string, input: { first_name?: string; last_name?: string; is_active?: boolean }) =>
  authRequest<Employee>(`/employees/${id}`, json('PATCH', input));

export const setEmployeeStores = (id: string, storeIds: string[]) =>
  authRequest<Employee>(`/employees/${id}/stores`, json('PUT', { store_ids: storeIds }));
