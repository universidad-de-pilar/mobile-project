import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Button } from './button';
import { Colors, Fonts, Radius, Spacing, Typography } from './tokens';

type FeedbackStateProps = {
  type: 'loading' | 'empty' | 'error';
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const DEFAULT_CONTENT = {
  loading: {
    title: 'Cargando...',
    message: 'Esperá un momento.',
  },
  empty: {
    title: 'No hay contenido',
    message: 'Todavía no hay elementos para mostrar.',
  },
  error: {
    title: 'Ocurrió un error',
    message: 'No se pudo completar la operación.',
  },
};

function Skeleton() {
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.skeleton}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={[styles.skeletonRow, { opacity }]} />
      ))}
    </View>
  );
}

export function FeedbackState({
  type,
  title,
  message,
  actionLabel,
  onAction,
}: FeedbackStateProps) {
  const content = DEFAULT_CONTENT[type];
  const resolvedTitle = title ?? content.title;
  const resolvedMessage = message ?? content.message;

  if (type === 'loading') {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${resolvedTitle} ${resolvedMessage}`}
        style={styles.container}
      >
        <Skeleton />
        <Text style={styles.title}>{resolvedTitle}</Text>
        <Text style={styles.message}>{resolvedMessage}</Text>
      </View>
    );
  }

  const isError = type === 'error';

  return (
    <View accessibilityRole="summary" style={styles.container}>
      <View style={[styles.indicator, isError && styles.errorIndicator]}>
        <Ionicons
          name={isError ? 'alert-circle-outline' : 'file-tray-outline'}
          size={24}
          color={isError ? Colors.danger : Colors.primary}
        />
      </View>

      <Text style={styles.title}>{resolvedTitle}</Text>
      <Text style={styles.message}>{resolvedMessage}</Text>

      {actionLabel && onAction ? (
        <Button size="sm" title={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
  },
  skeleton: {
    width: '100%',
    gap: Spacing.sm,
  },
  skeletonRow: {
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: Colors.border,
  },
  indicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIndicator: {
    backgroundColor: Colors.dangerSoft,
  },
  title: {
    color: Colors.ink,
    fontSize: Typography.regular,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  message: {
    color: Colors.muted,
    fontSize: Typography.body,
    lineHeight: 21,
    textAlign: 'center',
  },
});
