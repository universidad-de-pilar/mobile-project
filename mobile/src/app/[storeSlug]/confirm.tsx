import { Link, Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoreHeader } from '@/components/store-header';
import { Button } from '@/components/ui/mostrador/button';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { Card } from '@/components/ui/mostrador/card';
import { StickyFooter } from '@/components/ui/mostrador/sticky-footer';
import { TextField } from '@/components/ui/mostrador/text-field';
import { Colors, Fonts, Layout, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';
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
      <SafeAreaView edges={['top']} style={styles.screen}>
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
    <SafeAreaView edges={['top']} style={styles.screen}>
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
          inputStyle={styles.note}
          editable={!sending}
        />

        <Card style={styles.summary}>
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

      <StickyFooter>
        <Button title="Confirmar pedido" fullWidth loading={sending} onPress={submit} />
      </StickyFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { gap: Spacing.md, padding: Layout.screenPadding },
  note: { minHeight: 96, textAlignVertical: 'top' },
  summary: { marginTop: Spacing.xl - Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  item: { flex: 1, color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.bodyLarge },
  price: { color: Colors.ink, fontFamily: Fonts.medium, fontSize: Typography.bodyLarge },
  totalLabel: { color: Colors.ink, fontFamily: Fonts.title, fontSize: Typography.large },
  total: { color: Colors.primary, fontFamily: Fonts.title, fontSize: Typography.large },
  hint: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.caption },
  error: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.dangerSoft },
  errorText: { color: Colors.danger, fontFamily: Fonts.medium, fontSize: Typography.body },
  link: { color: Colors.danger, fontFamily: Fonts.bold, fontSize: Typography.body, textDecorationLine: 'underline' },
});
