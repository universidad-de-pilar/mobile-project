import { Platform, useWindowDimensions, type ViewStyle } from 'react-native';

import { Spacing } from './tokens';

// Web only: native keeps the phone layout whatever the window size.
export function useWide() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= 900;
}

// CSS grid is web-only too; call it only when useWide() is true.
export const wideGrid = (minColumn: number): ViewStyle =>
  ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minColumn}px, 1fr))`,
    alignItems: 'start',
    gap: Spacing.md,
  }) as unknown as ViewStyle;

// Non-grid blocks (forms, buttons) keep the form width instead of stretching.
export const narrowBlock: ViewStyle = { maxWidth: 560 };
