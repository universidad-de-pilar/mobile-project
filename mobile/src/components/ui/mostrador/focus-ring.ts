import { useState } from 'react';
import { Platform, type ViewStyle } from 'react-native';

import { Colors } from './tokens';

// Anillo de foco solo en web; en nativo no hay foco de teclado.
const RING = Platform.OS === 'web'
  ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2, outlineColor: Colors.primary } as unknown as ViewStyle)
  : undefined;

export function useFocusRing() {
  const [focused, setFocused] = useState(false);
  return {
    focusProps: { onFocus: () => setFocused(true), onBlur: () => setFocused(false) },
    ringStyle: focused ? RING : undefined,
  };
}
