# Detalle de producto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tocar una card del catálogo del autopedido abre un detalle (bottom sheet / diálogo) para elegir cantidad y agregar al carrito.

**Architecture:** La regla pura `addLine` acepta una cantidad (TDD). `CartContext.addProduct` la expone. El nuevo componente presentacional `ProductDetailSheet` usa el `Modal` de React Native. El catálogo guarda el producto seleccionado en estado local.

**Tech Stack:** Expo SDK 57, expo-router, React Native 0.86 + react-native-web, Jest (`jest-expo`), npm.

Spec: `docs/superpowers/specs/2026-11-03-detalle-producto-design.md`

## Global Constraints

- Se usan los tokens de `mobile/src/components/ui/mostrador/tokens.ts`. No se agregan colores ni fuentes nuevas.
- No se agregan dependencias.
- El texto de la UI va en español rioplatense neutro, igual que en las pantallas actuales. Los identificadores y comentarios van en inglés.
- Hay tope de 50 unidades por producto (`MAX_QUANTITY`) y de 50 productos distintos (`MAX_LINES`).
- El "+" de la card sigue agregando 1 sin abrir el detalle.
- Commits en español, con prefijo convencional y sin atribución a IA.
- Todos los comandos se corren desde `mobile/`.

---

### Task 1: `addLine` con cantidad

**Files:**
- Modify: `mobile/src/lib/cart-rules.ts:21-35`
- Modify: `mobile/src/context/CartContext.tsx:33-34,80-87`
- Test: `mobile/src/lib/cart-rules.test.ts`

**Interfaces:**
- Produces:
  - `addLine(lines: CartLine[], product: CatalogProduct, quantity = 1): { lines: CartLine[]; rejected: boolean }`
  - `CartContext.addProduct(product: PublicProduct, quantity?: number): boolean`

- [ ] **Step 1: Write the failing tests.** Add them inside `describe('cart rules', ...)` in `cart-rules.test.ts`:

```ts
  it('adds a quantity to a new line', () => {
    expect(addLine([], product(1), 3).lines[0].quantity).toBe(3);
  });

  it('adds a quantity to an existing line', () => {
    const lines = addLine([], product(1), 2).lines;
    expect(addLine(lines, product(1), 4).lines[0].quantity).toBe(6);
  });

  it('caps the summed quantity at 50', () => {
    const lines = addLine([], product(1), 45).lines;
    expect(addLine(lines, product(1), 10).lines[0].quantity).toBe(50);
    expect(addLine([], product(2), 80).lines[0].quantity).toBe(50);
  });

  it('rejects a quantity for the 51st distinct product', () => {
    let lines: CartLine[] = [];
    for (let i = 0; i < 50; i++) lines = addLine(lines, product(i)).lines;
    const r = addLine(lines, product(99), 3);
    expect(r.rejected).toBe(true);
    expect(r.lines).toBe(lines);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/lib/cart-rules.test.ts`
Expected: FAIL. "adds a quantity to a new line" gets `1` instead of `3`.

- [ ] **Step 3: Write the minimal implementation.** Replace `addLine` in `cart-rules.ts`:

```ts
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
```

- [ ] **Step 4: Expose it in the context.** In `CartContext.tsx`, change the type:

```ts
  /** Returns false when the 50-product cap rejected the product. */
  addProduct: (product: PublicProduct, quantity?: number) => boolean;
```

and the callback:

```ts
  const addProduct = useCallback(
    (product: PublicProduct, quantity = 1) => {
      const result = addLine(lines, product, quantity);
      setLines(result.lines);
      return !result.rejected;
    },
    [lines],
  );
```

- [ ] **Step 5: Run the tests and the typecheck**

Run: `npx jest src/lib/cart-rules.test.ts && npx tsc --noEmit`
Expected: every test PASSes, including the previous ones, and tsc reports no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/cart-rules.ts src/lib/cart-rules.test.ts src/context/CartContext.tsx
git commit -m "feat(autopedido): se permite agregar productos al carrito con cantidad"
```

---

### Task 2: Detail sheet wired into the catalog

**Files:**
- Create: `mobile/src/components/ui/mostrador/product-detail-sheet.tsx`
- Modify: `mobile/src/components/ui/mostrador/product-card.tsx`
- Modify: `mobile/src/app/[storeSlug]/index.tsx`
- Modify: `docs/testing.md` (section "Catálogo del autopedido", around line 1023)

**Interfaces:**
- Consumes: `addProduct(product, quantity)` from Task 1, `MAX_QUANTITY` from `@/lib/cart-rules`, `Stepper`, `Button`, `useWide`, `formatPrice` (`formatPrice(value: string)`, the same use as in `index.tsx:161`).
- Produces: `ProductDetailSheet` props `{ product: DetailProduct | null; maxQuantity: number; onClose: () => void; onAdd: (quantity: number) => void }`, where `DetailProduct = { name: string; description?: string | null; price: string; imageUrl?: string | null }`. `price` is the decimal string from the API (`"8500.00"`). `ProductCard` gets a new prop `onPress?: () => void`.

- [ ] **Step 1: Create `product-detail-sheet.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatPrice } from '@/lib/format-price';

import { Button } from './button';
import { Stepper } from './stepper';
import { Colors, Fonts, Layout, Radius, Spacing } from './tokens';
import { useWide } from './use-wide';

export type DetailProduct = {
  name: string;
  description?: string | null;
  price: string;
  imageUrl?: string | null;
};

type ProductDetailSheetProps = {
  product: DetailProduct | null;
  /** Units that can still be added; 0 disables the add button. */
  maxQuantity: number;
  onClose: () => void;
  onAdd: (quantity: number) => void;
};

export function ProductDetailSheet({ product, maxQuantity, onClose, onAdd }: ProductDetailSheetProps) {
  const wide = useWide();
  const [quantity, setQuantity] = useState(1);

  // Every opening starts at 1.
  useEffect(() => {
    if (product) setQuantity(1);
  }, [product]);

  const atMax = maxQuantity < 1;
  const total = product ? (Number(product.price) * quantity).toFixed(2) : '0';

  return (
    <Modal
      visible={product !== null}
      transparent
      animationType={wide ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, wide && styles.overlayWide]}>
        <Pressable accessibilityLabel="Cerrar" style={StyleSheet.absoluteFill} onPress={onClose} />
        {product ? (
          <View style={[styles.sheet, wide && styles.sheetWide]}>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.image}>
                {product.imageUrl ? (
                  <Image
                    source={{ uri: product.imageUrl }}
                    accessibilityLabel={product.name}
                    style={styles.fill}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="image-outline" size={48} color={Colors.primary} />
                )}
              </View>
              <Text style={styles.name}>{product.name}</Text>
              {product.description ? <Text style={styles.description}>{product.description}</Text> : null}
              <Text style={styles.price}>{formatPrice(product.price)}</Text>
              {atMax ? (
                <Text style={styles.max}>Ya tenés el máximo de este producto (50).</Text>
              ) : null}
            </ScrollView>

            <View style={styles.footer}>
              <Stepper value={quantity} min={1} max={Math.max(1, maxQuantity)} onChange={setQuantity} />
              <Button
                title={`Agregar · ${formatPrice(total)}`}
                disabled={atMax}
                onPress={() => onAdd(quantity)}
                style={styles.add}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              hitSlop={(Layout.minTouchTarget - CLOSE) / 2}
              style={styles.close}
            >
              <Ionicons name="close" size={22} color={Colors.ink} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const CLOSE = 36;

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28, 25, 23, 0.5)' },
  overlayWide: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  sheet: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  sheetWide: { maxWidth: 520, borderRadius: Radius.xl },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  fill: { width: '100%', height: '100%' },
  name: { color: Colors.ink, fontFamily: Fonts.title, fontSize: 22 },
  description: { color: Colors.muted, fontFamily: Fonts.body, fontSize: 15, lineHeight: 22 },
  price: { color: Colors.primary, fontFamily: Fonts.bold, fontSize: 20, marginTop: Spacing.xs },
  max: { color: Colors.danger, fontFamily: Fonts.medium, fontSize: 14 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  add: { flex: 1 },
  close: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: CLOSE,
    height: CLOSE,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 2: Make `ProductCard` pressable.** In `product-card.tsx`:
  - Add `onPress?: () => void;` to `ProductCardProps` and to the destructuring.
  - Replace the outer `<View style={styles.card}>` / `</View>` with:

```tsx
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver ${name}`}
      onPress={onPress}
      disabled={!onPress}
      style={styles.card}
    >
      {/* ...same children... */}
    </Pressable>
```

  The inner "+" `Pressable` stays as it is. React Native gives the touch to the innermost `Pressable`, so the "+" does not trigger `onPress` on the card.

- [ ] **Step 3: Wire the catalog in `index.tsx`**
  - Imports:

```tsx
import { ProductDetailSheet } from '@/components/ui/mostrador/product-detail-sheet';
import { ApiError, getPublicCatalog, type PublicCatalog, type PublicProduct } from '@/lib/api';
import { MAX_QUANTITY } from '@/lib/cart-rules';
```

  - In `useCart()` also destructure `lines`: `const { addProduct, itemCount, totalCents, lines } = useCart();`
  - State and derived values, after `capReached`:

```tsx
  const [selected, setSelected] = useState<PublicProduct | null>(null);
  const inCart = lines.find((l) => l.productId === selected?.product_id)?.quantity ?? 0;
```

  - Change `add` so it accepts a quantity:

```tsx
  const add = (product: PublicProduct, quantity = 1) => setCapReached(!addProduct(product, quantity));
```

  - In `renderItem`, pass `onPress={() => setSelected(item)}` to `ProductCard`.
  - Inside the `SafeAreaView`, after the bottom `View style={styles.bar}`:

```tsx
      <ProductDetailSheet
        product={detail}
        maxQuantity={MAX_QUANTITY - inCart}
        onClose={() => setSelected(null)}
        onAdd={(q) => {
          if (selected) add(selected, q);
          setSelected(null);
        }}
      />
```

  Define `detail` (memoized, next to `selected`) so that the `useEffect` in the sheet does not reset the quantity to 1 on every render of the catalog:

```tsx
  const detail = useMemo(
    () =>
      selected && {
        name: selected.name,
        description: selected.description,
        price: selected.price,
        imageUrl: selected.image_url,
      },
    [selected],
  );
```

  Then pass `product={detail}`, and add `useMemo` to the `react` import.

- [ ] **Step 4: Update `docs/testing.md`.** In the "Catálogo del autopedido" section, replace the line `- Detalle de producto: no existe pantalla de detalle; ningún requerimiento (HU-16 a HU-20) lo pide.` with:

```md
- Detalle de producto: tocar la card (fuera del "+") abre el detalle con imagen grande, descripción completa y precio; en mobile es un panel inferior y en escritorio (≥ 900 px) un diálogo centrado de 520 px.
- Detalle, agregar: la cantidad arranca en 1; con el stepper en 3, el botón dice "Agregar · $3×precio" y al tocarlo se cierra el detalle y "Ver carrito" suma 3 unidades.
- Detalle, "+" directo: el "+" de la card suma 1 sin abrir el detalle.
- Detalle, cierre: la X, tocar el fondo y Esc (web) o atrás (Android) cierran sin agregar nada. En web el "atrás" del navegador no cierra el detalle (limitación aceptada).
- Detalle, tope: con 48 unidades del producto en el carrito el stepper no pasa de 2; con 50, el botón está deshabilitado y aparece "Ya tenés el máximo de este producto (50)."
- Detalle, tope de distintos: con 50 productos distintos, agregar uno nuevo desde el detalle cierra el panel y muestra "El pedido admite hasta 50 productos distintos."
- Detalle sin imagen ni descripción: se ve el ícono de imagen naranja y no queda un bloque vacío.
```

  Also add `addLine` with a quantity to the "Automatizado" line of the "Carrito, confirmación y pedido registrado" section, if that section lists the `cart-rules.test.ts` cases.

- [ ] **Step 5: Lint, typecheck and tests**

Run: `npx expo lint && npx tsc --noEmit && npm test`
Expected: no lint or type errors, and every test PASSes.

- [ ] **Step 6: Manual check in the browser.** Start the dev server (`.claude/launch.json` or `npx expo start --web`) and go through the cases from Step 4 at 375 px and at 1280 px.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/mostrador/product-detail-sheet.tsx src/components/ui/mostrador/product-card.tsx "src/app/[storeSlug]/index.tsx" ../docs/testing.md
git commit -m "feat(autopedido): se agrega detalle de producto con cantidad en el catálogo"
```
