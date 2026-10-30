
import { Platform } from 'react-native';

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  bookstore: string;
};

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
  store: {
    store_id: string;
    name: string;
    slug: string;
  };
  categories: CatalogCategory[];
};

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000');

const TENANT_SLUG = process.env.EXPO_PUBLIC_TENANT_SLUG;

async function request<T>(
  path: string,
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('RESOURCE_NOT_FOUND');
    }
    throw new Error('No se pudo conectar con el servidor.');
  }

  return response.json() as Promise<T>;
}

export function getPublicCatalog(
  storeSlug: string,
): Promise<PublicCatalog> {
  if (!TENANT_SLUG) {
    throw new Error('Falta configurar EXPO_PUBLIC_TENANT_SLUG.');
  }

  return request<PublicCatalog>(
    `/public/stores/${encodeURIComponent(storeSlug)}/catalog`,
    { 'X-Tenant-Slug': TENANT_SLUG },
  );
}

export async function getProducts(): Promise<Product[]> {
  const products = await request<Product[]>('/products');
  return products.filter((product) => product.active);
}

export function getProduct(id: string): Promise<Product> {
  return request<Product>(`/products/${encodeURIComponent(id)}`);
}
