import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from './focus-ring';
import { Colors, Fonts, Radius, Spacing, Typography } from './tokens';

type ListRowProps = {
  title: string;
  detail?: string;
  value?: string;
  /** Thumbnail URL; falls back to the placeholder icon. */
  image?: string | null;
  /** Replaces the value, e.g. a Badge or a Toggle. */
  trailing?: ReactNode;
  onPress?: () => void;
};

export function ListRow({ title, detail, value, image, trailing, onPress }: ListRowProps) {
  const { focusProps, ringStyle } = useFocusRing();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      {...focusProps}
      style={[styles.row, ringStyle]}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
        {image ? (
          <Image source={{ uri: image }} style={styles.thumb} contentFit="cover" />
        ) : (
          <Ionicons name="image-outline" size={20} color={Colors.primary} />
        )}
      </View>
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        {detail ? <Text numberOfLines={1} style={styles.detail}>{detail}</Text> : null}
      </View>
      {trailing ?? (value ? <Text style={styles.value}>{value}</Text> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  text: { flex: 1, gap: 2 },
  title: { color: Colors.ink, fontFamily: Fonts.bold, fontSize: Typography.body },
  detail: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.small },
  value: { color: Colors.ink, fontFamily: Fonts.bold, fontSize: Typography.body },
});
