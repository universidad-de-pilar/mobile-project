
import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getProduct, type Product } from '@/lib/products';
import { EduKitSpacing as S } from '@/components/ui/edukit/tokens';
import { Button } from '@/components/ui/edukit/button';
import { FeedbackState } from '@/components/ui/edukit/feedback-state';
import { Card } from '@/components/ui/edukit/card';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const result = await getProduct(String(id));
        if (active) setProduct(result);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const money = (price: number) =>
    price.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    });

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ title: 'Detalle del producto' }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.brand}>EduKit</Text>
      </View>

      {loading ? (
        <View style={styles.feedback}>
          <ActivityIndicator size="large" color="#258A82" />
          <Text style={styles.body}>Cargando producto...</Text>
        </View>
      ) : error || !product ? (
        <FeedbackState
          type="error"
          title="No encontramos el producto"
          message="Puede que ya no esté disponible o que haya un problema de conexión."
          actionLabel="Volver al catálogo"
          onAction={() => router.replace('/')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card padding={S.lg} style={styles.card}>
            <View style={styles.image}>
              <Text style={styles.imageIcon}>🎒</Text>
            </View>

            <Text style={styles.kicker}>DETALLE DEL PRODUCTO</Text>
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.price}>{money(product.price)}</Text>

            <View style={styles.divider} />

            <Text style={styles.label}>Descripción</Text>
            <Text style={styles.body}>{product.description}</Text>

            <Text style={styles.label}>Disponibilidad</Text>
            <Text style={styles.body}>
              {product.stock > 0
                ? `${product.stock} unidades disponibles`
                : 'Producto sin stock'}
            </Text>

            <Text style={styles.label}>Librería</Text>
            <Text style={styles.body}>{product.bookstore}</Text>

            <Button
              title="Volver al catálogo"
              variant="primary"
              fullWidth
              onPress={() => router.replace('/')}
              style={styles.button}
            />
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FAF8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: S.lg,
    backgroundColor: '#183D3B',
  },
  back: { color: '#D8F2EC', fontSize: 15, fontWeight: '700' },
  brand: { color: '#D8F2EC', fontSize: 21, fontWeight: '800' },
  content: { padding: S.lg, paddingBottom: 32 },
  card: { backgroundColor: '#C9E8E1', borderColor: '#C9E8E1', borderWidth: 1 },
  image: {
    height: 230,
    borderRadius: 10,
    backgroundColor: '#E0F4EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.lg,
  },
  imageIcon: { fontSize: 86 },
  kicker: { color: '#258A82', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#183D3B', fontSize: 25, fontWeight: '800', marginTop: 7 },
  price: { color: '#183D3B', fontSize: 23, fontWeight: '800', marginTop: 10 },
  divider: { height: 1, backgroundColor: '#D8E8E4', marginVertical: S.lg },
  label: { color: '#183D3B', fontSize: 14, fontWeight: '800', marginTop: S.md },
  body: { color: '#536A68', fontSize: 15, lineHeight: 22, marginTop: 5 },
  button: { marginTop: S.xl },
  feedback: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
});
