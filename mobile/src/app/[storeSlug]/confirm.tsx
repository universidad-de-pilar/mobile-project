import { Link, Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StoreHeader } from '@/components/store-header';
import { Button } from '@/components/ui/mostrador/button';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { Card } from '@/components/ui/mostrador/card';
import { TextField } from '@/components/ui/mostrador/text-field';
import { Colors, Fonts, Radius, Spacing } from '@/components/ui/mostrador/tokens';
import { useCart } from '@/context/CartContext';
import { ApiError, createOrder } from '@/lib/api';
import { formatCents } from '@/lib/format-price';
import { saveLastOrder } from '@/lib/last-order';
import { loadSourceScreen } from '@/lib/source-screen';
import { buildOrderInput, MAX_NAME, MAX_NOTE } from '@/lib/order-rules';
import { isTenantSuspended } from '@/lib/tenant-rules';
import { createSubmitLock } from '@/lib/submit-lock';

export default function ConfirmScreen() {
  const router = useRouter();
  const { storeSlug } = useLocalSearchParams<{ storeSlug: string }>();
  const { lines, totalCents, clearCart, storeName, tenantName } = useCart();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewCart, setReviewCart] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [lock] = useState(createSubmitLock);

  if (lines.length === 0 && !sent) return <Redirect href={`/${storeSlug}/cart`} />;

  const submit = async () => {
    const { input, error: invalid } = buildOrderInput(lines, name, note, loadSourceScreen(storeSlug));
    setReviewCart(false);
    setError(invalid);
    if (invalid || !lock.acquire()) return;
    setSending(true);
    try {
      const order = await createOrder(storeSlug, input);
      saveLastOrder(storeSlug, order);
      setSent(true);
      router.replace(`/${storeSlug}/done`);
      clearCart();
    } catch (e) {
      if (isTenantSuspended(e)) {
        setSuspended(true);
      } else if (e instanceof ApiError && e.code === 'PRODUCTS_UNAVAILABLE') {
        const names = e.unavailableNames.length ? `: ${e.unavailableNames.join(', ')}` : '';
        setError(`Algunos productos ya no están disponibles${names}. Revisá tu pedido.`);
        setReviewCart(true);
      } else if (e instanceof ApiError && e.status !== 0) {
        setError(e.message);
      } else {
        setError('No pudimos enviar el pedido. Revisá la conexión e intentá nuevamente.');
      }
      setSending(false);
      lock.release();
    }
  };

  if (suspended) {
    return (
      <SafeAreaView style={styles.screen}>
        <StoreHeader title="Mantenimiento" tenant={tenantName ?? undefined} store={storeName ?? storeSlug} />
        <View style={styles.content}>
          <FeedbackState
            type="error"
            title="Estamos en mantenimiento"
            message="Este local no está disponible por el momento. Volvé a intentar más tarde."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StoreHeader title="Confirmá tu pedido" tenant={tenantName ?? undefined} store={storeName ?? storeSlug} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label="Tu nombre"
          value={name}
          onChangeText={setName}
          maxLength={MAX_NAME + 1}
          editable={!sending}
        />
        <TextField
          label="Nota para el local (opcional)"
          value={note}
          onChangeText={setNote}
          maxLength={MAX_NOTE + 1}
          multiline
          numberOfLines={1}
          editable={!sending}
        />

        <Card>
          {lines.map((l) => (
            <View key={l.productId} style={styles.row}>
              <Text style={styles.item}>{l.quantity} × {l.name}</Text>
              <Text style={styles.price}>{formatCents(l.priceCents * l.quantity)}</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.total}>{formatCents(totalCents)}</Text>
          </View>
        </Card>
        <Text style={styles.hint}>El precio final lo calcula el local al registrar la orden.</Text>

        {error ? (
          <View style={styles.error}>
            <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
            {reviewCart ? (
              <Link href={`/${storeSlug}/cart`} style={styles.link}>Volver al pedido</Link>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bar}>
        <Button title="Confirmar pedido" fullWidth loading={sending} onPress={submit} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { gap: Spacing.sm, padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  item: { flex: 1, color: Colors.muted, fontFamily: Fonts.body, fontSize: 15 },
  price: { color: Colors.ink, fontFamily: Fonts.medium, fontSize: 15 },
  totalLabel: { color: Colors.ink, fontFamily: Fonts.title, fontSize: 18 },
  total: { color: Colors.primary, fontFamily: Fonts.title, fontSize: 18 },
  hint: { color: Colors.muted, fontFamily: Fonts.body, fontSize: 13 },
  error: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.dangerSoft },
  errorText: { color: Colors.danger, fontFamily: Fonts.medium, fontSize: 14 },
  link: { color: Colors.danger, fontFamily: Fonts.bold, fontSize: 14, textDecorationLine: 'underline' },
  bar: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
});
