
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getProducts, type Product } from '@/lib/products';
import { useCart } from '@/context/CartContext';

const C = {
  ink: '#1C1917',
  orange: '#EA580C',
  cream: '#FAF7F2',
  whatsapp: '#25D366',
  white: '#FFFFFF',
  muted: '#78716C',
  border: '#E7DED3',
  softOrange: '#FFF0E5',
};

const S = { sm: 8, md: 16, lg: 24 };

export default function CatalogScreen() {
  const router = useRouter();
  const { addItem, itemCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

 const loadProducts = useCallback(async () => {
  setLoading(true);
  setError(false);

  try {
    setProducts(await getProducts());
  } catch {
    setError(true);
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  let active = true;

  const load = async () => {
    setLoading(true);
    setError(false);

    try {
      const result = await getProducts();

      if (active) {
        setProducts(result);
      }
    } catch {
      if (active) {
        setError(true);
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  };

  void load();

  return () => {
    active = false;
  };
  }, []);
   useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const result = await getProducts();
        if (active) {
          setProducts(result);
        }
      } catch {
        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const money = (price: number) =>
    price.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    });

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.mark}>
          <Text style={styles.markText}>m.</Text>
        </View>

        <Text style={styles.brand}>mostrador.io</Text>

        <View style={styles.headerSpacer} />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/cart')}
          style={styles.cartButton}
        >
          <Text style={styles.cartButtonText}>
            Carrito ({itemCount})
          </Text>
        </Pressable>
      </View>

      <View style={styles.heading}>
        <Text style={styles.kicker}>MOSTRADOR.IO · PRODUCTOS</Text>
        <Text style={styles.title}>Catálogo</Text>
        <Text style={styles.subtitle}>
          Todo lo que necesitás, en un solo lugar.
        </Text>
      </View>

      {loading ? (
        <View style={styles.feedback}>
          <ActivityIndicator color={C.orange} size="large" />
          <Text style={styles.muted}>Cargando productos...</Text>
        </View>
      ) : error ? (
        <View style={styles.feedback}>
          <Text style={styles.feedbackTitle}>
            No pudimos cargar el catálogo
          </Text>
          <Text style={styles.muted}>
            Revisá la conexión e intentá nuevamente.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadProducts()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.feedback}>
          <Text style={styles.feedbackTitle}>
            No hay productos disponibles
          </Text>
          <Text style={styles.muted}>
            Cuando haya productos activos, aparecerán acá.
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver detalle de ${item.name}`}
                onPress={() =>
                  router.push({
                    pathname: '/products/[id]',
                    params: { id: String(item.id) },
                  })
                }
                style={styles.productDetails}
              >
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imageIcon}>▧</Text>
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <Text style={styles.price}>{money(item.price)}</Text>
                  <Text
                    style={[
                      styles.stock,
                      item.stock < 1 && styles.outOfStock,
                    ]}
                  >
                    {item.stock > 0
                      ? `Disponible · ${item.stock} unidades`
                      : 'Sin stock'}
                  </Text>
                  <Text style={styles.link}>Ver detalle →</Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Agregar ${item.name} al carrito`}
                disabled={item.stock < 1}
                onPress={() => addItem(item)}
                style={[
                  styles.addButton,
                  item.stock < 1 && styles.disabledButton,
                ]}
              >
                <Text
                  style={[
                    styles.addButtonText,
                    item.stock < 1 && styles.disabledButtonText,
                  ]}
                >
                  {item.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    backgroundColor: C.ink,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    fontSize: 20,
    fontWeight: '800',
    color: C.white,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    color: C.cream,
  },
  headerSpacer: {
    flex: 1,
  },
  cartButton: {
    backgroundColor: C.orange,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cartButtonText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 13,
  },
  heading: {
    padding: S.lg,
    paddingBottom: S.md,
  },
  kicker: {
    color: C.orange,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: C.ink,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 5,
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    marginTop: 5,
  },
  list: {
    paddingHorizontal: S.lg,
    paddingBottom: 30,
    gap: S.md,
  },
  productCard: {
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: S.md,
    gap: S.md,
  },
  productDetails: {
    flexDirection: 'row',
    gap: S.md,
  },
  imagePlaceholder: {
    width: 88,
    minHeight: 112,
    borderRadius: 12,
    backgroundColor: C.softOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIcon: {
    fontSize: 38,
    color: C.orange,
  },
  productInfo: {
    flex: 1,
    gap: 5,
    justifyContent: 'center',
  },
  productName: {
    color: C.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  description: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  price: {
    color: C.ink,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 3,
  },
  stock: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
  },
  outOfStock: {
    color: C.muted,
  },
  link: {
    color: C.orange,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: C.orange,
    paddingVertical: 12,
    paddingHorizontal: S.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: C.border,
  },
  disabledButtonText: {
    color: C.muted,
  },
  feedback: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  feedbackTitle: {
    color: C.ink,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  muted: {
    color: C.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: C.orange,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: C.white,
    fontWeight: '800',
  },
});
