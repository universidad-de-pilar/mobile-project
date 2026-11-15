import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/components/ui/mostrador/tokens';

type Props = { title: string; store?: string; tenant?: string };

export function StoreHeader({ title, store, tenant }: Props) {
  const subtitle = [tenant, store].filter(Boolean).join(' · ');
  return (
    <View style={styles.header}>
      <View style={styles.text}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
        <Ionicons name="storefront" size={20} color={Colors.surface} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  text: { flex: 1, gap: 2 },
  title: { color: Colors.ink, fontFamily: Fonts.title, fontSize: 22 },
  subtitle: { color: Colors.muted, fontFamily: Fonts.body, fontSize: 13 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
