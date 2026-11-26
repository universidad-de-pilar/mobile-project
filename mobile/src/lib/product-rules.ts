import type { Product } from '@/lib/admin-api';
import { ApiError } from '@/lib/api';

const WHOLE = String.raw`(\d{1,3}(?:\.\d{3})+|\d+)`;
const WITH_COMMA = new RegExp(String.raw`^${WHOLE},(\d{1,2})$`);
const INTEGER = new RegExp(`^${WHOLE}$`);
const DOT_DECIMAL = /^(\d+)\.(\d{1,2})$/;
const MAX_PRICE = 9999999.99;

/** Accepts `8500`, `8.500`, `8500,50` (dots group thousands, comma is the decimal). Returns the API string or null. */
export function parsePrice(input: string): string | null {
  const text = input.trim();
  let whole: string;
  let cents = '';
  const comma = WITH_COMMA.exec(text);
  const integer = INTEGER.exec(text);
  const dot = DOT_DECIMAL.exec(text);
  if (comma) [, whole, cents] = comma;
  else if (integer) whole = integer[1];
  else if (dot) [, whole, cents] = dot;
  else return null;
  const value = `${whole.replace(/\./g, '')}.${cents.padEnd(2, '0')}`;
  const n = Number(value);
  return n > 0 && n <= MAX_PRICE ? value : null;
}

export const priceToInput = (price: string) => price.replace('.', ',');

export type ProductForm = { name: string; description: string; price: string; categoryId: string; sku: string };
export type ProductErrors = Partial<Record<keyof ProductForm, string>>;

export function validateProduct(form: ProductForm): ProductErrors {
  const errors: ProductErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Ingresá el nombre.';
  else if (name.length > 80) errors.name = 'El nombre admite hasta 80 caracteres.';
  if (form.description.length > 500) errors.description = 'La descripción admite hasta 500 caracteres.';
  const sku = form.sku.trim();
  if (!sku) errors.sku = 'Ingresá el SKU.';
  else if (sku.length > 64) errors.sku = 'El SKU admite hasta 64 caracteres.';
  if (!form.categoryId) errors.categoryId = 'Elegí una categoría.';
  if (!form.price.trim()) errors.price = 'Ingresá el precio.';
  else if (!parsePrice(form.price)) errors.price = 'El precio debe ser mayor que 0.';
  return errors;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TOO_LARGE = 'La imagen supera el límite de 5 MB.';
const BAD_TYPE = 'Elegí una imagen JPG o PNG.';
const OFFLINE = 'No se pudo conectar con el servidor.';

export function checkImage(asset: { mimeType?: string | null; fileSize?: number }): string | null {
  if (asset.mimeType !== 'image/jpeg' && asset.mimeType !== 'image/png') return BAD_TYPE;
  if (asset.fileSize !== undefined && asset.fileSize > MAX_IMAGE_BYTES) return TOO_LARGE;
  return null;
}

export function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'MEDIA_TOO_LARGE') return TOO_LARGE;
    if (error.code === 'UNSUPPORTED_MEDIA_TYPE') return BAD_TYPE;
    if (error.code === 'MEDIA_UNREADABLE') return 'No se pudo leer la imagen. Probá con otra.';
    if (error.status === 0) return OFFLINE;
  }
  return 'No se pudo subir la imagen.';
}

export function productErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'PRODUCT_LIMIT_REACHED') return 'El local llegó al límite de 200 productos.';
    if (error.code === 'SKU_ALREADY_EXISTS') return 'Ya existe un producto con ese SKU.';
    if (error.code === 'SKU_REQUIRED') return 'Ingresá el SKU para guardar este producto.';
    if (error.code === 'PRODUCT_NOT_FOUND') return 'El producto ya no existe.';
    if (error.status === 403) return 'No tenés permiso para esta acción.';
    if (error.status === 0) return OFFLINE;
  }
  return 'No se pudo guardar el producto.';
}

export function categoryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'CATEGORY_NAME_TAKEN') return 'Ya existe una categoría con ese nombre.';
    if (error.status === 403) return 'No tenés permiso para esta acción.';
    if (error.status === 0) return OFFLINE;
  }
  return 'No se pudo crear la categoría.';
}

const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function filterAdminProducts(
  products: Product[],
  { categoryId, query, onlyAvailable }: { categoryId: string | null; query: string; onlyAvailable: boolean },
): Product[] {
  const q = fold(query.trim());
  return products.filter(
    (p) =>
      (!categoryId || p.category_id === categoryId) &&
      (!onlyAvailable || p.is_available) &&
      (!q || fold(p.name).includes(q) || fold(p.sku ?? '').includes(q)),
  );
}
