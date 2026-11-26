import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Colors, Fonts, Radius, Spacing } from './tokens';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function TextField({
  label,
  error,
  containerStyle,
  inputStyle,
  editable = true,
  accessibilityLabel,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TextInput
        {...inputProps}
        editable={editable}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        accessibilityLabel={accessibilityLabel ?? label ?? inputProps.placeholder}
        accessibilityState={{ disabled: !editable }}
        placeholderTextColor={Colors.muted}
        style={[
          styles.input,
          focused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          !editable && styles.inputDisabled,
          inputStyle,
        ]}
      />

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 6 },
  label: {
    color: Colors.muted,
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    color: Colors.ink,
    fontFamily: Fonts.body,
    fontSize: 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  inputFocused: { borderColor: Colors.primary },
  inputError: { borderColor: Colors.danger },
  inputDisabled: { backgroundColor: Colors.bg, opacity: 0.65 },
  error: {
    color: Colors.danger,
    fontFamily: Fonts.body,
    fontSize: 12,
  },
});
