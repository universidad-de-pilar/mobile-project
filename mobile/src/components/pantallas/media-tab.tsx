import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmPanel } from '@/components/pantallas/confirm-panel';
import { Thumb } from '@/components/pantallas/thumb';
import { Button } from '@/components/ui/mostrador/button';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { Colors, Fonts, Layout, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import { narrowBlock, useWide } from '@/components/ui/mostrador/use-wide';
import { useSession } from '@/context/SessionContext';
import { deleteMedia, listMedia, type Media } from '@/lib/admin-api';
import { contentErrorMessage } from '@/lib/content-rules';
import { createSubmitLock } from '@/lib/submit-lock';
import { pickAndUpload, uploadErrorMessage } from '@/lib/upload-media';

const TILE = 104;

export function MediaTab() {
  const wide = useWide();
  const { me } = useSession();
  const can = (code: string) => Boolean(me?.permissions.includes(code));
  const [items, setItems] = useState<Media[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState<Media | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(createSubmitLock()).current;

  const load = useCallback(
    () =>
      listMedia()
        .then((list) => {
          setItems(list);
          setFailed(false);
        })
        .catch(() => setFailed(true)),
    [],
  );
  useFocusEffect(useCallback(() => void load(), [load]));

  async function upload() {
    if (!lock.acquire()) return;
    setError(null);
    setUploading(true);
    try {
      if (await pickAndUpload()) await load();
    } catch (e) {
      setError(uploadErrorMessage(e));
    } finally {
      lock.release();
      setUploading(false);
    }
  }

  async function remove(item: Media) {
    if (!lock.acquire()) return;
    setError(null);
    try {
      await deleteMedia(item.media_id);
      await load();
    } catch (e) {
      setError(contentErrorMessage(e));
    } finally {
      setConfirming(null);
      lock.release();
    }
  }

  if (failed && !items) {
    return <FeedbackState type="error" title="No pudimos cargar las imágenes y videos" message="Revisá la conexión e intentá nuevamente." actionLabel="Reintentar" onAction={() => void load()} />;
  }
  if (!items) return <FeedbackState type="loading" title="Cargando..." message="Un momento." />;

  return (
    <>
      {can('content:create') ? <Button title="Subir imagen o video" onPress={() => void upload()} loading={uploading} fullWidth style={wide && narrowBlock} /> : null}
      {items.length === 0 ? (
        <FeedbackState type="empty" title="Aún no hay imágenes ni videos" message="Subí uno para usarlo en tus listas." />
      ) : (
        <View style={styles.grid}>
          {items.map((m) => (
            <View key={m.media_id}>
              <Thumb item={m} size={TILE} />
              {can('content:delete') ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${m.original_name}`} onPress={() => setConfirming(m)} style={styles.remove}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}
      {confirming ? (
        <ConfirmPanel message={`¿Eliminar "${confirming.original_name}"?`} confirmLabel="Sí, eliminar" onConfirm={() => void remove(confirming)} onCancel={() => setConfirming(null)} />
      ) : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Text style={styles.hint}>Imagen hasta 5 MB · video MP4 hasta 50 MB y 60 s</Text>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  remove: { position: 'absolute', right: 0, bottom: 0, width: Layout.minTouchTarget, height: Layout.minTouchTarget, borderTopLeftRadius: Radius.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  hint: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.small },
  error: { color: Colors.danger, fontFamily: Fonts.body, fontSize: Typography.small },
});
