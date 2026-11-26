import type { CatalogCategory, PublicProduct } from './api';

export const visibleCategories = (categories: CatalogCategory[]) =>
  categories.filter((c) => c.products.length > 0);

/** Products of the active category; an unknown or missing id falls back to the first visible one. */
export function productsForCategory(
  categories: CatalogCategory[],
  activeId: string | null,
): PublicProduct[] {
  const visible = visibleCategories(categories);
  return (visible.find((c) => c.category_id === activeId) ?? visible[0])?.products ?? [];
}
