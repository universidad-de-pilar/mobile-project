import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { StoreHeader } from '@/components/store-header';
import { Button } from '@/components/ui/mostrador/button';
import { Chip } from '@/components/ui/mostrador/chip';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { ProductCard } from '@/components/ui/mostrador/product-card';
import { ProductDetailSheet } from '@/components/ui/mostrador/product-detail-sheet';
import { Colors, Fonts, Radius, Spacing } from '@/components/ui/mostrador/tokens';
import { useWide } from '@/components/ui/mostrador/use-wide';
import { useCart } from '@/context/CartContext';
import { ApiError, getPublicCatalog, type PublicCatalog, type PublicProduct } from '@/lib/api';
import { MAX_QUANTITY } from '@/lib/cart-rules';
import { isTenantSuspended } from '@/lib/tenant-rules';
import { productsForCategory, visibleCategories } from '@/lib/catalog-rules';
import { formatPrice } from '@/lib/format-price';

const PAD = 20;

type Result = { key: string; catalog?: PublicCatalog; notFound?: boolean; suspended?: boolean };

export default function CatalogScreen() {
  const router = useRouter();
  const { storeSlug } = useLocalSearchParams<{ storeSlug: string }>();
  const { addProduct, itemCount, totalCents, lines } = useCart();
  const columns = useWide() ? 3 : 1;

  // Loading is derived from the key, so the effect never sets state synchronously.
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [capReached, setCapReached] = useState(false);
  const [selected, setSelected] = useState<PublicProduct | null>(null);
  const inCart = lines.find((l) => l.productId === selected?.product_id)?.quantity ?? 0;
  // Memoized so the sheet's reset-on-change does not fire on every render.
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
  const key = `${storeSlug}:${attempt}`;

  useEffect(() => {
    let active = true;
    getPublicCatalog(storeSlug)
      .then((catalog) => active && setResult({ key, catalog }))
      .catch(
        (e) =>
          active &&
          setResult({
            key,
            notFound: e instanceof ApiError && (e.code === 'STORE_NOT_FOUND' || e.status === 404),
            suspended: isTenantSuspended(e),
          }),
      );
    return () => {
      active = false;
    };
  }, [storeSlug, key]);

  const loaded = result?.key === key ? result : null;
  const categories = visibleCategories(loaded?.catalog?.categories ?? []);
  const selectedId = (categories.find((c) => c.category_id === activeId) ?? categories[0])?.category_id;

  const add = (product: PublicProduct, quantity = 1) => setCapReached(!addProduct(product, quantity));

  let body;
  if (!loaded) {
    body = <FeedbackState type="loading" title="Cargando catálogo..." message="Un momento." />;
  } else if (loaded.suspended) {
    body = (
      <FeedbackState
        type="error"
        title="Estamos en mantenimiento"
        message="Este local no está disponible por el momento. Volvé a intentar más tarde."
      />
    );
  } else if (loaded.notFound) {
    body = (
      <FeedbackState
        type="error"
        title="No encontramos este local"
        message="Revisá el enlace o volvé a escanear el QR."
      />
    );
  } else if (!loaded.catalog) {
    body = (
      <FeedbackState
        type="error"
        title="No pudimos cargar el catálogo"
        message="Revisá la conexión e intentá nuevamente."
        actionLabel="Reintentar"
        onAction={() => setAttempt((a) => a + 1)}
      />
    );
  } else if (categories.length === 0) {
    body = (
      <FeedbackState
        type="empty"
        title="Todavía no hay productos disponibles"
        message="Pronto vas a encontrar novedades en este local."
      />
    );
  } else {
    body = (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chips}
          contentContainerStyle={styles.chipsContent}
        >
          {categories.map((c) => (
            <Chip
              key={c.category_id}
              label={c.name}
              active={c.category_id === selectedId}
              onPress={() => setActiveId(c.category_id)}
            />
          ))}
        </ScrollView>
        {capReached ? (
          <Text accessibilityRole="alert" style={styles.cap}>
            El pedido admite hasta 50 productos distintos.
          </Text>
        ) : null}
        <FlatList
          data={productsForCategory(categories, selectedId ?? null)}
          keyExtractor={(p) => p.product_id}
          key={columns}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.columns : undefined}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={columns > 1 ? styles.cell : undefined}>
              <ProductCard
                name={item.name}
                description={item.description ?? undefined}
                price={formatPrice(item.price)}
                imageUrl={item.image_url}
                onAdd={() => add(item)}
                onPress={() => setSelected(item)}
              />
            </View>
          )}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StoreHeader title="¿Qué vas a pedir?" store={loaded?.catalog?.store.name} />

      <View style={styles.content}>{body}</View>

      <View style={styles.bar}>
        <Button
          title={
            itemCount === 0
              ? 'Ver carrito'
              : `Ver carrito · ${itemCount} ${itemCount === 1 ? 'producto' : 'productos'} · ${formatPrice((totalCents / 100).toFixed(2))}`
          }
          fullWidth
          disabled={itemCount === 0}
          onPress={() => router.push(`/${storeSlug}/cart`)}
        />
      </View>

      <ProductDetailSheet
        product={detail}
        maxQuantity={MAX_QUANTITY - inCart}
        onClose={() => setSelected(null)}
        onAdd={(q) => {
          if (selected) add(selected, q);
          setSelected(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1, minHeight: 0 },
  chips: { flexGrow: 0 },
  chipsContent: { gap: Spacing.sm, paddingHorizontal: PAD, paddingVertical: Spacing.lg },
  cap: {
    marginHorizontal: PAD,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerSoft,
    color: Colors.danger,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  columns: { gap: Spacing.md },
  // Fixed third of the row (minus both gaps) so a short last row keeps its column width.
  cell: { width: 'calc((100% - 24px) / 3)' } as unknown as ViewStyle,
  list: { gap: Spacing.md, paddingHorizontal: PAD, paddingBottom: Spacing.lg },
  bar: {
    minHeight: 86,
    justifyContent: 'center',
    paddingHorizontal: PAD,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
