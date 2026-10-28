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

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000');

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('PRODUCT_NOT_FOUND');
    }
    throw new Error('No se pudo conectar con el servidor.');
  }

  return response.json() as Promise<T>;
}

export async function getProducts(): Promise<Product[]> {
  const products = await request<Product[]>('/products');
  return products.filter((product) => product.active);
}

export function getProduct(id: string): Promise<Product> {
  return request<Product>(`/products/${encodeURIComponent(id)}`);
}
