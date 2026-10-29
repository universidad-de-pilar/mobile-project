
import { Platform } from 'react-native';

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  bookstore: string;
  imageUrl?: string | null;
};

type PublicCatalogProduct = {
  product_id: string;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
};

type PublicCatalogResponse = {
  store: {
    store_id: string;
    name?: string;
    slug?: string;
  };
  categories: {
    category_id: string;
    name: string;
    products: PublicCatalogProduct[];
  }[];
};

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000');

const TENANT_SLUG = process.env.EXPO_PUBLIC_TENANT_SLUG || 'local3';
const STORE_SLUG = process.env.EXPO_PUBLIC_STORE_SLUG || 'centro';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'X-Tenant-Slug': TENANT_SLUG,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Error del servidor (${response.status}). Verificá el servidor y la configuración del comercio.`,
    );
  }

  return response.json() as Promise<T>;
}

export async function getProducts(): Promise<Product[]> {
  const catalog = await request<PublicCatalogResponse>(
    `/public/stores/${encodeURIComponent(STORE_SLUG)}/catalog`,
  );

  return catalog.categories.flatMap((category) =>
    category.products.map((product) => ({
      id: product.product_id,
      name: product.name,
      description: product.description ?? '',
      price: Number(product.price),
      stock: 50,
      active: true,
      bookstore: category.name,
      imageUrl: product.image_url,
    })),
  );
}

export async function getProduct(id: string): Promise<Product> {
  const products = await getProducts();
  const product = products.find((item) => item.id === id);

  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  return product;
}
