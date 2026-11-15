import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useFocusRing } from './focus-ring';
import { Colors, Fonts, Radius, Spacing, Typography } from './tokens';

type ButtonVariant = 'primary' | 'secondary' | 'whatsapp' | 'danger' | 'ghost' | 'ghostDanger';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

const VARIANTS = {
  primary: { background: Colors.primary, foreground: Colors.surface },
  secondary: { background: Colors.surface, foreground: Colors.ink },
  whatsapp: { background: Colors.whatsapp, foreground: Colors.surface },
  danger: { background: Colors.danger, foreground: Colors.surface },
  ghost: { background: 'transparent', foreground: Colors.primary },
  ghostDanger: { background: 'transparent', foreground: Colors.danger },
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { focusProps, ringStyle } = useFocusRing();
  // Deshabilitado: color plano en lugar de opacidad para mantener el contraste del texto.
  const transparent = variant === 'ghost' || variant === 'ghostDanger';
  const { background, foreground } = isDisabled
    ? { background: transparent ? 'transparent' : Colors.border, foreground: Colors.muted }
    : VARIANTS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      {...focusProps}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        size === 'sm' && styles.small,
        variant === 'secondary' && styles.outlined,
        fullWidth && styles.fullWidth,
        ringStyle,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {variant === 'whatsapp' ? <Ionicons name="logo-whatsapp" size={20} color={foreground} /> : null}
          <Text style={[styles.text, { color: foreground }, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  outlined: { borderWidth: 1, borderColor: Colors.border },
  small: { minHeight: 44, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.85 },
  text: {
    fontFamily: Fonts.bold,
    fontSize: Typography.regular,
    textAlign: 'center',
  },
});
