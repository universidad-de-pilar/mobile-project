import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoreHeader } from '@/components/store-header';
import { Button } from '@/components/ui/mostrador/button';
import { StickyFooter } from '@/components/ui/mostrador/sticky-footer';
import { Colors, Fonts, Layout, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import { formatPrice } from '@/lib/format-price';
import { loadLastOrder } from '@/lib/last-order';
import { whatsappCopy } from '@/lib/order-rules';

export default function DoneScreen() {
  const { storeSlug } = useLocalSearchParams<{ storeSlug: string }>();
  const [order] = useState(() => loadLastOrder(storeSlug));
  const [opened, setOpened] = useState<number[]>([]);
  const [failed, setFailed] = useState(false);

  if (!order) return <Redirect href={`/${storeSlug}`} />;
  const { message, labels } = whatsappCopy(order.whatsapp_parts);

  // Called straight from the press handler so web popup blockers allow it.
  const open = (index: number) => {
    setFailed(false);
    Linking.openURL(order.whatsapp_parts[index].url).then(
      () => setOpened((cur) => [...new Set([...cur, index])]),
      () => setFailed(true),
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StoreHeader title="¡Listo!" store={order.store.name} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.check}>
          <Ionicons name="checkmark" size={48} color={Colors.success} />
        </View>
        <Text style={styles.heading}>Pedido registrado</Text>
        <Text accessibilityLabel={`Número de pedido ${order.order_number}`} style={styles.number}>
          #{order.order_number}
        </Text>
        <Text style={styles.heading}>Total {formatPrice(order.total)}</Text>
        <Text style={styles.message}>{message}</Text>
        {failed ? (
          <Text accessibilityRole="alert" style={styles.error}>
            No pudimos abrir WhatsApp. Intentá nuevamente.
          </Text>
        ) : null}
      </ScrollView>
      {labels.length > 0 ? (
        <StickyFooter>
          {labels.map((label, i) => (
            <Button
              key={label}
              title={opened.includes(i) ? `${label} · enviado` : label}
              variant="whatsapp"
              fullWidth
              onPress={() => open(i)}
            />
          ))}
        </StickyFooter>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { flexGrow: 1, alignItems: 'center', gap: Spacing.md, padding: Layout.screenPadding, paddingTop: Spacing.xxl },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { color: Colors.ink, fontFamily: Fonts.subtitle, fontSize: Typography.subtitle },
  number: { color: Colors.primary, fontFamily: Fonts.title, fontSize: Typography.display },
  message: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.bodyLarge, textAlign: 'center' },
  error: { color: Colors.danger, fontFamily: Fonts.medium, fontSize: Typography.body, textAlign: 'center' },
});
