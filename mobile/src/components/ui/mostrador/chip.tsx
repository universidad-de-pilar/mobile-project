import { Pressable, StyleSheet, Text } from 'react-native';

import { useFocusRing } from './focus-ring';
import { Colors, Fonts, Layout, Radius, Spacing, Typography } from './tokens';

type ChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

export function Chip({ label, active = false, onPress }: ChipProps) {
  const { focusProps, ringStyle } = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      {...focusProps}
      style={[styles.chip, active && styles.active, ringStyle]}
    >
      <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: Layout.minTouchTarget,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  text: { color: Colors.ink, fontFamily: Fonts.medium, fontSize: Typography.body },
  activeText: { color: Colors.surface },
});
