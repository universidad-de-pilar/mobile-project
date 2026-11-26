import { clamp } from '@/components/ui/mostrador/clamp';

export const MAX_QUANTITY = 50;
export const MAX_LINES = 50;

export type CartLine = {
  productId: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
};

type CatalogProduct = {
  product_id: string;
  name: string;
  price: string;
  image_url: string | null;
};

export function addLine(
  lines: CartLine[],
  product: CatalogProduct,
  quantity = 1,
): { lines: CartLine[]; rejected: boolean } {
  const existing = lines.find((l) => l.productId === product.product_id);
  if (existing) {
    return { lines: setQuantity(lines, existing.productId, existing.quantity + quantity), rejected: false };
  }
  if (lines.length >= MAX_LINES) return { lines, rejected: true };
  const line: CartLine = {
    productId: product.product_id,
    name: product.name,
    priceCents: Math.round(Number(product.price) * 100),
    imageUrl: product.image_url,
    quantity: clamp(Math.round(quantity), 1, MAX_QUANTITY),
  };
  return { lines: [...lines, line], rejected: false };
}

export function setQuantity(lines: CartLine[], productId: string, quantity: number): CartLine[] {
  if (!Number.isFinite(quantity)) return lines;
  const q = clamp(Math.round(quantity), 1, MAX_QUANTITY);
  return lines.map((l) => (l.productId === productId ? { ...l, quantity: q } : l));
}

// Stepper minus at quantity 1 asks for 0, which removes the line.
export function changeQuantity(lines: CartLine[], productId: string, quantity: number): CartLine[] {
  return quantity < 1 ? removeLine(lines, productId) : setQuantity(lines, productId, quantity);
}

export function removeLine(lines: CartLine[], productId: string): CartLine[] {
  return lines.filter((l) => l.productId !== productId);
}

export function totalCents(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
}

export function toOrderItems(lines: CartLine[]) {
  return lines.map((l) => ({ product_id: l.productId, quantity: l.quantity }));
}

const isLine = (l: unknown): l is CartLine =>
  typeof l === 'object' && l !== null &&
  typeof (l as CartLine).productId === 'string' &&
  typeof (l as CartLine).name === 'string' &&
  Number.isInteger((l as CartLine).priceCents) &&
  Number.isInteger((l as CartLine).quantity) &&
  (l as CartLine).quantity >= 1 && (l as CartLine).quantity <= MAX_QUANTITY;

export function parseCart(raw: string | null): CartLine[] {
  try {
    const data: unknown = JSON.parse(raw ?? '');
    return Array.isArray(data) && data.length <= MAX_LINES && data.every(isLine) ? data : [];
  } catch {
    return [];
  }
}
