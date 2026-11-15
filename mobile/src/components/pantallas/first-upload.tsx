import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/mostrador/button';
import { Colors, Fonts, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import { createPlaylist, savePlaylistItems, type Playlist } from '@/lib/admin-api';
import { DEFAULT_IMAGE_SECONDS, itemsPayload } from '@/lib/content-rules';
import { createSubmitLock } from '@/lib/submit-lock';
import { pickAndUpload, uploadErrorMessage } from '@/lib/upload-media';

/** Empty-screen shortcut: upload, create a list named after the screen and put the file in it. */
export function FirstUpload({ screenName, onCreated }: { screenName: string; onCreated: (list: Playlist) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(createSubmitLock()).current;

  async function start() {
    if (!lock.acquire()) return;
    setBusy(true);
    setError(null);
    try {
      const media = await pickAndUpload();
      if (!media) return;
      const list = await createPlaylist(screenName);
      await savePlaylistItems(list.playlist_id, itemsPayload([{ media_id: media.media_id, type: media.type, duration_seconds: media.duration_seconds ?? DEFAULT_IMAGE_SECONDS }]));
      onCreated({ ...list, item_count: 1 });
    } catch (e) {
      setError(uploadErrorMessage(e));
    } finally {
      lock.release();
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Subí tu primera imagen o video</Text>
      <Text style={styles.hint}>Se va a mostrar en esta pantalla apenas termine de subir.</Text>
      <Button title="Subir imagen o video" onPress={() => void start()} loading={busy} fullWidth />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  title: { color: Colors.ink, fontFamily: Fonts.subtitle, fontSize: Typography.large },
  hint: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.caption },
  error: { color: Colors.danger, fontFamily: Fonts.body, fontSize: Typography.small },
});
