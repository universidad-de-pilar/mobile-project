import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import {
  addLine,
  parseCart,
  removeLine,
  changeQuantity,
  totalCents,
  type CartLine,
} from '@/lib/cart-rules';
import type { PublicProduct } from '@/lib/api';
import { resolveTenantSlug } from '@/lib/tenant';

type CartContextValue = {
  lines: CartLine[];
  totalCents: number;
  itemCount: number;
  /** Real store name once the layout loaded it; null until then. */
  storeName: string | null;
  setStoreName: (name: string | null) => void;
  /** Business name; null until the layout loaded it. */
  tenantName: string | null;
  setTenantName: (name: string | null) => void;
  /** Scopes the cart to a store and restores its saved lines. Call from the store route. */
  bindStore: (storeSlug: string) => void;
  /** Returns false when the 50-product cap rejected the product. */
  addProduct: (product: PublicProduct, quantity?: number) => boolean;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const storageKey = (storeSlug: string) => `cart:${resolveTenantSlug() ?? '-'}:${storeSlug}`;

// ponytail: native carts live in memory and are lost on app restart; use AsyncStorage if native persistence is needed
const storage = {
  load(storeSlug: string): CartLine[] {
    if (Platform.OS !== 'web') return [];
    try {
      return parseCart(window.localStorage.getItem(storageKey(storeSlug)));
    } catch {
      return [];
    }
  },
  save(storeSlug: string, lines: CartLine[]) {
    if (Platform.OS !== 'web') return;
    try {
      window.localStorage.setItem(storageKey(storeSlug), JSON.stringify(lines));
    } catch {}
  },
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const boundSlug = useRef<string | null>(null);

  useEffect(() => {
    if (storeSlug) storage.save(storeSlug, lines);
  }, [storeSlug, lines]);

  const bindStore = useCallback((slug: string) => {
    if (slug === boundSlug.current) return;
    boundSlug.current = slug;
    setStoreSlug(slug);
    setStoreName(null);
    setTenantName(null);
    setLines(storage.load(slug));
  }, []);

  const addProduct = useCallback(
    (product: PublicProduct, quantity = 1) => {
      const result = addLine(lines, product, quantity);
      setLines(result.lines);
      return !result.rejected;
    },
    [lines],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      totalCents: totalCents(lines),
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      storeName,
      setStoreName,
      tenantName,
      setTenantName,
      bindStore,
      addProduct,
      setQuantity: (id, q) => setLines((cur) => changeQuantity(cur, id, q)),
      removeItem: (id) => setLines((cur) => removeLine(cur, id)),
      clearCart: () => setLines([]),
    }),
    [lines, storeName, tenantName, bindStore, addProduct],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe utilizarse dentro de CartProvider');
  return context;
}
