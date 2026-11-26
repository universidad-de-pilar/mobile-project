import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius } from './tokens';

export type OrderStatus = 'generada' | 'en_preparacion' | 'lista' | 'entregada' | 'cancelada';

// `lista` is not in the design: it reuses the success pair, softer than the solid `entregada`.
const STATUS: Record<OrderStatus, { label: string; background: string; color: string }> = {
  generada: { label: 'Generada', background: Colors.primarySoft, color: Colors.primary },
  en_preparacion: { label: 'En preparación', background: Colors.border, color: Colors.ink },
  lista: { label: 'Lista', background: Colors.successSoft, color: Colors.success },
  entregada: { label: 'Entregada', background: Colors.success, color: Colors.surface },
  cancelada: { label: 'Cancelada', background: Colors.danger, color: Colors.surface },
};

export function Badge({ status }: { status: OrderStatus }) {
  const { label, background, color } = STATUS[status];
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  text: { fontFamily: Fonts.bold, fontSize: 11 },
});
