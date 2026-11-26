import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PlayerStage } from '@/components/player/player-stage';
import { useFullscreenOnGesture } from '@/components/player/use-fullscreen';
import { usePlayer } from '@/components/player/use-player';
import { Colors, Fonts } from '@/components/ui/mostrador/tokens';

export function Message({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

/** `onInvalid` lets `/screen` go back to pairing when the token stops working. */
export function WebPlayer({ token, onInvalid }: { token: string; onInvalid?: () => void }) {
  const { status, state, qrUrl, next } = usePlayer(token);
  useFullscreenOnGesture();

  useEffect(() => {
    if (status === 'invalid') onInvalid?.();
  }, [status, onInvalid]);

  if (status === 'invalid') return <Message text="Pantalla no válida" />;
  if (status === 'waiting') return <Message text="Esperando conexión para cargar el contenido…" />;
  if (status === 'loading' || !state.current) return <View style={styles.center} />;
  return <PlayerStage items={state.items} storeName={state.current.store.name} index={state.index} cycle={state.cycle} qrUrl={qrUrl} onDone={next} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.ink, padding: 24 },
  text: { color: Colors.surface, fontFamily: Fonts.title, fontSize: 32, textAlign: 'center' },
});
