import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/mostrador/badge';
import { Button } from '@/components/ui/mostrador/button';
import { Colors, Fonts, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import type { Order, OrderSummary } from '@/lib/admin-api';
import { nextActions, orderSummary } from '@/lib/admin-order-rules';
import { formatPrice } from '@/lib/format-price';

type OrderCardProps = {
  order: OrderSummary;
  expanded: boolean;
  /** Loaded detail; undefined while loading or if it failed. */
  detail?: Order;
  detailFailed?: boolean;
  confirmingCancel: boolean;
  sending: boolean;
  error?: string | null;
  canUpdate: boolean;
  onToggle: () => void;
  onAction: (to: Order['status']) => void;
  onConfirmCancel: (confirming: boolean) => void;
};

export function OrderCard({
  order, expanded, detail, detailFailed, confirmingCancel, sending, error, canUpdate, onToggle, onAction, onConfirmCancel,
}: OrderCardProps) {
  const actions = canUpdate ? nextActions(order.status) : [];
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={styles.head}>
        <View style={styles.line}>
          <Text style={styles.title}>Pedido #{order.order_number}</Text>
          <Badge status={order.status} />
        </View>
        <View style={styles.line}>
          <Text numberOfLines={1} style={styles.detail}>{orderSummary(order)}</Text>
          <Text style={styles.total}>{formatPrice(order.total)}</Text>
        </View>
      </Pressable>
      {expanded ? (
        <View style={styles.body}>
          {detail ? (
            detail.items.map((i) => (
              <View key={i.line_number} style={styles.line}>
                <Text style={styles.item}>{i.quantity} × {i.product_name}</Text>
                <Text style={styles.item}>{formatPrice(i.line_total)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.detail}>{detailFailed ? 'No pudimos cargar los ítems.' : 'Cargando ítems...'}</Text>
          )}
          {order.note ? <Text style={styles.detail}>Nota: {order.note}</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {confirmingCancel ? (
            <View style={styles.actions}>
              <Text style={styles.item}>¿Cancelar esta orden? No se puede deshacer.</Text>
              <Button title="Sí, cancelar orden" variant="danger" onPress={() => onAction('cancelada')} disabled={sending} fullWidth />
              <Button title="No, volver" variant="secondary" onPress={() => onConfirmCancel(false)} disabled={sending} fullWidth />
            </View>
          ) : (
            <View style={styles.actions}>
              {actions.map((a) => (
                <Button
                  key={a.to}
                  title={a.label}
                  variant={a.to === 'cancelada' ? 'ghostDanger' : 'primary'}
                  disabled={sending}
                  onPress={() => (a.to === 'cancelada' ? onConfirmCancel(true) : onAction(a.to))}
                  fullWidth
                />
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  head: { padding: Spacing.md, gap: Spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  title: { color: Colors.ink, fontFamily: Fonts.bold, fontSize: Typography.regular },
  detail: { flexShrink: 1, color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.caption },
  total: { color: Colors.ink, fontFamily: Fonts.bold, fontSize: Typography.regular },
  body: { padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  item: { color: Colors.ink, fontFamily: Fonts.body, fontSize: Typography.caption },
  actions: { gap: Spacing.sm, marginTop: Spacing.xs },
  error: { color: Colors.danger, fontFamily: Fonts.body, fontSize: Typography.small },
});
