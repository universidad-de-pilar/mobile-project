import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useFullscreenOnGesture } from '@/components/player/use-fullscreen';
import { usePairing } from '@/components/player/use-pairing';
import { Message, WebPlayer } from '@/components/player/web-player';
import { Colors, Fonts } from '@/components/ui/mostrador/tokens';
import { formatPairingCode } from '@/lib/pairing-rules';
import { loadStoredToken, saveStoredToken } from '@/lib/player-api';

function PairingScreen({ onPaired }: { onPaired: (token: string) => void }) {
  const code = usePairing(onPaired);
  useFullscreenOnGesture();
  return (
    <View style={styles.center}>
      <Text style={styles.hint}>Ingresá este código en el panel</Text>
      <Text accessibilityRole="header" style={styles.code}>{code ? formatPairingCode(code) : '···-···'}</Text>
      <Text style={styles.hint}>Pantallas → tu pantalla → Vincular TV</Text>
      <Text style={styles.tip}>Presioná OK para pantalla completa</Text>
    </View>
  );
}

function PairedPlayer() {
  const [token, setToken] = useState(loadStoredToken);
  const onPaired = useCallback((t: string) => {
    saveStoredToken(t);
    setToken(t);
  }, []);
  // El reproductor ya borró el token guardado; solo falta volver al modo vinculación.
  const onInvalid = useCallback(() => setToken(null), []);

  return token ? <WebPlayer token={token} onInvalid={onInvalid} /> : <PairingScreen onPaired={onPaired} />;
}

export default function ScreenEntry() {
  if (Platform.OS !== 'web') return <Message text="El reproductor se abre desde un navegador web." />;
  return <PairedPlayer />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32, backgroundColor: Colors.ink, padding: 24 },
  code: { color: Colors.surface, fontFamily: Fonts.title, fontSize: 120, letterSpacing: 12, textAlign: 'center' },
  hint: { color: Colors.surface, fontFamily: Fonts.body, fontSize: 32, textAlign: 'center' },
  tip: { color: Colors.surface, fontFamily: Fonts.body, fontSize: 22, opacity: 0.7, textAlign: 'center' },
});
