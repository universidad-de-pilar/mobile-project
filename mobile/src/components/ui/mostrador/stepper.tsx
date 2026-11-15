import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clamp } from './clamp';
import { Colors, Fonts, Layout, Radius } from './tokens';

type StepperProps = {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  /** Accessibility label of the minus button when it removes the item (value at 1). */
  removeLabel?: string;
};

const CIRCLE = 40;

export function Stepper({ value, min = 0, max = 99, onChange, removeLabel }: StepperProps) {
  return (
    <View style={styles.pill}>
      <StepButton
        label={value <= 1 && removeLabel ? removeLabel : 'Quitar uno'}
        icon="remove"
        disabled={value <= min}
        onPress={() => onChange(clamp(value - 1, min, max))}
      />
      <Text accessibilityLabel={`Cantidad ${value}`} style={styles.value}>
        {value}
      </Text>
      <StepButton
        label="Agregar uno"
        icon="add"
        primary
        disabled={value >= max}
        onPress={() => onChange(clamp(value + 1, min, max))}
      />
    </View>
  );
}

type StepButtonProps = {
  label: string;
  icon: 'add' | 'remove';
  primary?: boolean;
  disabled: boolean;
  onPress: () => void;
};

function StepButton({ label, icon, primary = false, disabled, onPress }: StepButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={(Layout.minTouchTarget - CIRCLE) / 2}
      style={[styles.button, primary && styles.primary, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={18} color={primary ? Colors.surface : Colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  button: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: Radius.pill,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: Colors.primary },
  disabled: { opacity: 0.4 },
  value: {
    minWidth: 24,
    textAlign: 'center',
    color: Colors.ink,
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
});
