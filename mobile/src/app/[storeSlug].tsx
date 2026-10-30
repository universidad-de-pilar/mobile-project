
import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getPublicCatalog,
  type PublicCatalog,
} from '@/lib/products';

const C = {
  background: '#FAF7F2',
  ink: '#1C1917',
  orange: '#EA580C',
  orangeSoft: '#FFF0E5',
  white: '#FFFFFF',
  border: '#E7DED3',
  muted: '#78716C',
};

export default function PublicCatalogScreen() {
  const { storeSlug } = useLocalSearchParams<{ storeSlug: string }>();

  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!storeSlug) return;

    setLoading(true);
    setError(false);

    try {
      const result = await getPublicCatalog(String(storeSlug));
      setCatalog(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [storeSlug]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const money = (price: string) => {
    const value = Number(price);

    if (!Number.isFinite(value)) return price;

    return value.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.brand}>
          mostrador<Text style={styles.brandAccent}>.io</Text>
        </Text>
        <Text style={styles.headerLabel}>CATÁLOGO ONLINE</Text>
      </View>

      {loading ? (
        <View style={styles.feedback}>
          <ActivityIndicator size="large" color={C.orange} />
          <Text style={styles.muted}>Cargando catálogo...</Text>
        </View>
      ) : error || !catalog ? (
        <View style={styles.feedback}>
          <Text style={styles.errorTitle}>
            No pudimos cargar el catálogo
          </Text>
          <Text style={styles.muted}>
            Revisá la conexión e intentá nuevamente.
          </Text>
          <Text style={styles.retry} onPress={() => void loadCatalog()}>
            VOLVER A INTENTAR
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.heading}>
            <Text style={styles.kicker}>BIENVENIDO/A</Text>
            <Text style={styles.title}>{catalog.store.name}</Text>
            <Text style={styles.subtitle}>
              Explorá nuestros productos disponibles.
            </Text>
          </View>

          {catalog.categories.length === 0 ? (
            <View style={styles.feedback}>
              <Text style={styles.emptyTitle}>
                Todavía no hay productos disponibles
              </Text>
              <Text style={styles.muted}>
                Pronto vas a encontrar novedades en este catálogo.
              </Text>
            </View>
          ) : (
            <FlatList
              data={catalog.categories}
              keyExtractor={(category) => category.category_id}
              contentContainerStyle={styles.list}
              renderItem={({ item: category }) => (
                <View style={styles.category}>
                  <Text style={styles.categoryTitle}>
                    {category.name}
                  </Text>

                  {category.products.map((product) => (
                    <View
                      key={product.product_id}
                      style={styles.productCard}>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>
                          {product.name}
                        </Text>

                        {!!product.description && (
                          <Text style={styles.description}>
                            {product.description}
                          </Text>
                        )}

                        <Text style={styles.price}>
                          {money(product.price)}
                        </Text>
                      </View>

                      <View style={styles.available}>
                        <Text style={styles.availableText}>
                          DISPONIBLE
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            />
          )}
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Catálogo online · mostrador.io
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    backgroundColor: C.ink,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  brand: {
    color: C.white,
    fontSize: 23,
    fontWeight: '800',
  },
  brandAccent: {
    color: C.orange,
  },
  headerLabel: {
    color: '#D6D3D1',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heading: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  kicker: {
    color: C.orange,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: C.ink,
    fontSize: 29,
    fontWeight: '800',
    marginTop: 6,
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    marginTop: 7,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  category: {
    marginBottom: 24,
  },
  categoryTitle: {
    color: C.ink,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  productInfo: {
    gap: 6,
  },
  productName: {
    color: C.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  description: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  price: {
    color: C.orange,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 4,
  },
  available: {
    alignSelf: 'flex-start',
    backgroundColor: C.orangeSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  availableText: {
    color: C.orange,
    fontSize: 10,
    fontWeight: '800',
  },
  feedback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  muted: {
    color: C.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  errorTitle: {
    color: C.ink,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyTitle: {
    color: C.ink,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  retry: {
    color: C.orange,
    fontSize: 13,
    fontWeight: '800',
    padding: 12,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: 14,
    alignItems: 'center',
  },
  footerText: {
    color: C.muted,
    fontSize: 11,
  },
});
