import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Layout, Radius, Spacing, Typography } from './tokens';

type TopBarProps = { title: string; store?: string; onBack?: () => void };

export function TopBar({ title, store, onBack }: TopBarProps) {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: 64 + top, paddingTop: top }]}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={Colors.surface} />
        </Pressable>
      ) : null}
      <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {store ? (
        <View style={styles.pill}>
          <Text numberOfLines={1} style={styles.pillText}>{store}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: 20,
    backgroundColor: Colors.ink,
  },
  back: { width: Layout.minTouchTarget, height: Layout.minTouchTarget, marginLeft: -Spacing.md, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: Colors.surface, fontFamily: Fonts.subtitle, fontSize: Typography.subtitle },
  pill: {
    maxWidth: '50%',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  pillText: { color: Colors.surface, fontFamily: Fonts.bold, fontSize: Typography.caption },
});
