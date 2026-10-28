
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getProducts, type Product } from '@/lib/products';
import { EduKitColors as C, EduKitSpacing as S } from '@/components/ui/edukit/tokens';
import { Button } from '@/components/ui/edukit/button';
import { FeedbackState } from '@/components/ui/edukit/feedback-state';
import { Card } from '@/components/ui/edukit/card';

export default function CatalogScreen() {
  const router = useRouter();
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
    void loadProducts();
  }, [loadProducts]);

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
          <Text style={styles.markText}></Text>
        </View>
        <Text style={styles.brand}>EduKit</Text>
      </View>

      <View style={styles.heading}>
        <Text style={styles.kicker}>EDUKIT · PRODUCTOS</Text>
        <Text style={styles.title}>Catálogo</Text>
        <Text style={styles.subtitle}>
          Explorá los productos disponibles.
        </Text>
      </View>

      {loading ? (
        <View style={styles.feedback}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={styles.muted}>Cargando productos...</Text>
        </View>
      ) : error ? (
        <FeedbackState
          type="error"
          title="No pudimos cargar el catálogo"
          message="Revisá la conexión e intentá nuevamente."
          actionLabel="Reintentar"
          onAction={() => void loadProducts()}
        />
      ) : products.length === 0 ? (
        <FeedbackState
          type="empty"
          title="No hay productos disponibles"
          message="Cuando haya productos activos, aparecerán acá."
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver ${item.name}`}
              onPress={() =>
                router.push({
                  pathname: '/products/[id]',
                  params: { id: String(item.id) },
                })
              }>
              <Card padding={S.md} style={styles.productCard}>
                <View style={styles.productRow}>
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imageIcon}></Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.description} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <Text style={styles.price}>{money(item.price)}</Text>
                    <Text style={styles.stock}>
                      {item.stock > 0
                        ? `Disponible · ${item.stock} unidades`
                        : 'Sin stock'}
                    </Text>
                    <Text style={styles.link}>Ver detalle →</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FAF8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    backgroundColor: '#183D3B',
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D8F2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { fontSize: 19 },
  brand: { fontSize: 23, fontWeight: '800', color: '#D8F2EC' },
  heading: { padding: S.lg, paddingBottom: S.md },
  kicker: {
    color: '#258A82',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: { color: '#183D3B', fontSize: 28, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#536A68', fontSize: 14, marginTop: 5 },
  list: { paddingHorizontal: S.lg, paddingBottom: 30, gap: S.md },
  productCard: {
    backgroundColor: '#E0F4EF',
    borderColor: '#C9E8E1',
    borderWidth: 1,
  },
  productRow: { flexDirection: 'row', gap: S.md },
  imagePlaceholder: {
    width: 96,
    minHeight: 120,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIcon: { fontSize: 43 },
  productInfo: { flex: 1, gap: 5, justifyContent: 'center' },
  productName: { color: '#183D3B', fontSize: 17, fontWeight: '800' },
  description: { color: '#536A68', fontSize: 13, lineHeight: 18 },
  price: { color: '#183D3B', fontSize: 18, fontWeight: '800', marginTop: 3 },
  stock: { color: '#28745F', fontSize: 12 },
  link: { color: '#183D3B', fontSize: 13, fontWeight: '800', marginTop: 4 },
  feedback: { padding: 32, alignItems: 'center', gap: 12 },
  muted: { color: '#536A68', fontSize: 14 },
});
