import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StoreHeader } from '@/components/store-header';
import { Button } from '@/components/ui/mostrador/button';
import { Card } from '@/components/ui/mostrador/card';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { Stepper } from '@/components/ui/mostrador/stepper';
import { Colors, Fonts, Spacing } from '@/components/ui/mostrador/tokens';
import { useCart } from '@/context/CartContext';
import { MAX_QUANTITY } from '@/lib/cart-rules';
import { formatCents } from '@/lib/format-price';

export default function CartScreen() {
  const router = useRouter();
  const { storeSlug } = useLocalSearchParams<{ storeSlug: string }>();
  const { lines, totalCents, setQuantity, storeName, tenantName } = useCart();
  const toCatalog = () => router.replace(`/${storeSlug}`);

  return (
    <SafeAreaView style={styles.screen}>
      <StoreHeader title="Tu pedido" tenant={tenantName ?? undefined} store={storeName ?? storeSlug} />

      {lines.length === 0 ? (
        <View style={styles.empty}>
          <FeedbackState
            type="empty"
            title="Tu pedido está vacío"
            message="Agregá productos desde el catálogo para continuar."
            actionLabel="Volver al catálogo"
            onAction={toCatalog}
          />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.list}>
            {lines.map((l) => (
              <Card key={l.productId}>
                <View style={styles.row}>
                  <Text style={styles.name}>{l.name}</Text>
                  <Text style={styles.price}>{formatCents(l.priceCents * l.quantity)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Cantidad (1 a {MAX_QUANTITY})</Text>
                  <Stepper
                    value={l.quantity}
                    max={MAX_QUANTITY}
                    removeLabel={`Quitar ${l.name}`}
                    onChange={(q) => setQuantity(l.productId, q)}
                  />
                </View>
              </Card>
            ))}
            <View style={styles.row}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.price}>{formatCents(totalCents)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.total}>{formatCents(totalCents)}</Text>
            </View>
          </ScrollView>

          <View style={styles.bar}>
            <Button title="Continuar" fullWidth onPress={() => router.push(`/${storeSlug}/confirm`)} />
            <Button title="Seguir pidiendo" variant="secondary" fullWidth onPress={toCatalog} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  empty: { flex: 1, paddingHorizontal: 20 },
  list: { gap: Spacing.md, padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  name: { flex: 1, color: Colors.ink, fontFamily: Fonts.subtitle, fontSize: 16 },
  price: { color: Colors.ink, fontFamily: Fonts.bold, fontSize: 16 },
  label: { color: Colors.muted, fontFamily: Fonts.medium, fontSize: 13 },
  totalLabel: { color: Colors.ink, fontFamily: Fonts.title, fontSize: 22 },
  total: { color: Colors.primary, fontFamily: Fonts.title, fontSize: 22 },
  bar: {
    gap: Spacing.sm,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
