import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/mostrador/button';
import { Colors, Fonts, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';

/** Inline yes/no confirmation (Alert is a no-op on web). */
export function ConfirmPanel({ message, confirmLabel, onConfirm, onCancel }: { message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.panel}>
      <Text style={styles.message}>{message}</Text>
      <Button title={confirmLabel} variant="danger" onPress={onConfirm} fullWidth />
      <Button title="No, volver" variant="secondary" onPress={onCancel} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  message: { color: Colors.ink, fontFamily: Fonts.medium, fontSize: Typography.body },
});
