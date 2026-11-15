import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Layout, Radius, Spacing, Typography } from './tokens';

export type TabItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type TabBarProps = {
  items: TabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** Sidebar layout for wide screens. */
  vertical?: boolean;
};

export function TabBar({ items, activeKey, onSelect, vertical }: TabBarProps) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={vertical ? styles.side : [styles.bar, { height: 56 + bottom, paddingBottom: bottom }]}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        const color = active ? Colors.primary : Colors.muted;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(item.key)}
            style={vertical ? [styles.sideTab, active && styles.sideTabActive] : styles.tab}
          >
            <Ionicons name={item.icon} size={22} color={color} />
            <Text style={[styles.label, vertical && styles.sideLabel, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  side: {
    width: 220,
    padding: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  sideTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: Layout.minTouchTarget,
    borderRadius: Radius.md,
  },
  sideTabActive: { backgroundColor: Colors.primarySoft },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  sideLabel: { fontSize: Typography.body },
  label: { fontFamily: Fonts.medium, fontSize: Typography.micro },
});
