import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/components/ui/mostrador/tokens';

/** Image thumbnail; videos have no preview, so they show an icon. */
export function Thumb({ item, size }: { item: { type: 'image' | 'video'; url: string }; size: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.box, { width: size, height: size }]}>
      {item.type === 'image' ? (
        <Image source={{ uri: item.url }} style={styles.fill} contentFit="cover" />
      ) : (
        <Ionicons name="videocam" size={size / 2.5} color={Colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: Radius.md, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
});
