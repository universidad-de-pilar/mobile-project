import { useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';

import { Message, WebPlayer } from '@/components/player/web-player';

export default function ScreenPlayer() {
  const { token } = useLocalSearchParams<{ token: string }>();
  if (Platform.OS !== 'web') return <Message text="El reproductor se abre desde un navegador web." />;
  return <WebPlayer token={token} />;
}
