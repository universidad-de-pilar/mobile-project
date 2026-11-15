import { useState } from 'react';
import { Platform, type ViewStyle } from 'react-native';

import { Colors } from './tokens';

// Anillo de foco solo en web; en nativo no hay foco de teclado.
// El offset negativo lo dibuja por dentro para que un ScrollView no lo recorte.
const RING = Platform.OS === 'web'
  ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineOffset: -2, outlineColor: Colors.primary } as unknown as ViewStyle)
  : undefined;

// Solo foco de teclado (:focus-visible); un clic con mouse no muestra el anillo.
const isKeyboardFocus = (e: { target?: unknown }) =>
  Boolean((e.target as { matches?: (s: string) => boolean } | undefined)?.matches?.(':focus-visible'));

export function useFocusRing() {
  const [focused, setFocused] = useState(false);
  return {
    focusProps: { onFocus: (e: { target?: unknown }) => setFocused(isKeyboardFocus(e)), onBlur: () => setFocused(false) },
    ringStyle: focused ? RING : undefined,
  };
}
