import { Pressable, StyleSheet, View } from 'react-native';

import { Colors } from './tokens';

type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function Toggle({ value, onValueChange, label, disabled = false }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={{ top: 9, bottom: 9 }}
      onPress={() => onValueChange(!value)}
      style={[styles.track, value ? styles.on : styles.off, disabled && styles.disabled]}
    >
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  on: { backgroundColor: Colors.success },
  off: { backgroundColor: Colors.border },
  disabled: { opacity: 0.55 },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.surface },
  thumbOn: { alignSelf: 'flex-end' },
});
