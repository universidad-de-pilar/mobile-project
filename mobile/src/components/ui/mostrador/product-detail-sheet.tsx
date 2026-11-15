import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MAX_QUANTITY } from '@/lib/cart-rules';
import { formatPrice } from '@/lib/format-price';

import { Button } from './button';
import { Stepper } from './stepper';
import { Colors, Fonts, Layout, Radius, Spacing } from './tokens';
import { useWide } from './use-wide';

export type DetailProduct = {
  name: string;
  description?: string | null;
  price: string;
  imageUrl?: string | null;
  glutenFree?: boolean;
};

type ProductDetailSheetProps = {
  product: DetailProduct | null;
  /** Units that can still be added; 0 disables the add button. */
  maxQuantity: number;
  onClose: () => void;
  onAdd: (quantity: number) => void;
};

export function ProductDetailSheet({ product, maxQuantity, onClose, onAdd }: ProductDetailSheetProps) {
  const wide = useWide();
  const [quantity, setQuantity] = useState(1);

  // Every opening starts at 1 (reset during render, not in an effect).
  const [prev, setPrev] = useState(product);
  if (product !== prev) {
    setPrev(product);
    if (product) setQuantity(1);
  }

  const atMax = maxQuantity < 1;
  const total = product ? (Number(product.price) * quantity).toFixed(2) : '0';

  return (
    <Modal
      visible={product !== null}
      transparent
      animationType={wide ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, wide && styles.overlayWide]}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        {product ? (
          <View style={[styles.sheet, wide && styles.sheetWide]}>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.image}>
                {product.imageUrl ? (
                  <Image
                    source={{ uri: product.imageUrl }}
                    accessibilityLabel={product.name}
                    style={styles.fill}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="image-outline" size={48} color={Colors.primary} />
                )}
              </View>
              <Text style={styles.name}>{product.name}</Text>
              {product.description ? <Text style={styles.description}>{product.description}</Text> : null}
              <Text style={styles.price}>{formatPrice(product.price)}</Text>
              {product.glutenFree ? (
                <Image
                  source={require('@/assets/images/frontend/sin-tacc.png')}
                  accessible
                  accessibilityLabel="Sin TACC"
                  style={styles.glutenFree}
                  contentFit="contain"
                />
              ) : null}
              {atMax ? (
                <Text style={styles.max}>Ya tenés el máximo de este producto ({MAX_QUANTITY}).</Text>
              ) : null}
            </ScrollView>

            <View style={styles.footer}>
              <Stepper value={quantity} min={1} max={Math.max(1, maxQuantity)} onChange={setQuantity} />
              <Button
                title={`Agregar · ${formatPrice(total)}`}
                disabled={atMax}
                onPress={() => onAdd(quantity)}
                style={styles.add}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              hitSlop={(Layout.minTouchTarget - CLOSE) / 2}
              style={styles.close}
            >
              <Ionicons name="close" size={22} color={Colors.ink} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const CLOSE = 36;

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28, 25, 23, 0.5)' },
  overlayWide: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  sheet: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  sheetWide: { maxWidth: 520, borderRadius: Radius.xl },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  fill: { width: '100%', height: '100%' },
  name: { color: Colors.ink, fontFamily: Fonts.title, fontSize: 22 },
  description: { color: Colors.muted, fontFamily: Fonts.body, fontSize: 15, lineHeight: 22 },
  price: { color: Colors.primary, fontFamily: Fonts.bold, fontSize: 20, marginTop: Spacing.xs },
  glutenFree: { width: 29, height: 32 },
  max: { color: Colors.danger, fontFamily: Fonts.medium, fontSize: 14 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  add: { flex: 1 },
  close: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: CLOSE,
    height: CLOSE,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
