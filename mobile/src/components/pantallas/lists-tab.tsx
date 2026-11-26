import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/mostrador/button';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { ListRow } from '@/components/ui/mostrador/list-row';
import { TextField } from '@/components/ui/mostrador/text-field';
import { Colors, Fonts, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import { narrowBlock, useWide, wideGrid } from '@/components/ui/mostrador/use-wide';
import { useSession } from '@/context/SessionContext';
import { createPlaylist, listPlaylists, type Playlist } from '@/lib/admin-api';
import { contentErrorMessage, validateScreenName } from '@/lib/content-rules';
import { createSubmitLock } from '@/lib/submit-lock';

export function ListsTab() {
  const router = useRouter();
  const wide = useWide();
  const { me } = useSession();
  const [items, setItems] = useState<Playlist[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const lock = useRef(createSubmitLock()).current;

  const load = useCallback(() => {
    listPlaylists()
      .then((list) => {
        setItems(list);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);
  useFocusEffect(load);

  async function create() {
    const invalid = validateScreenName(name);
    if (invalid) return setError(invalid);
    if (!lock.acquire()) return;
    setSending(true);
    setError(null);
    try {
      const created = await createPlaylist(name.trim());
      setName('');
      setAdding(false);
      router.push({ pathname: '/admin/pantallas/lista/[id]', params: { id: created.playlist_id } });
    } catch (e) {
      setError(contentErrorMessage(e));
    } finally {
      lock.release();
      setSending(false);
    }
  }

  if (failed && !items) {
    return <FeedbackState type="error" title="No pudimos cargar las listas" message="Revisá la conexión e intentá nuevamente." actionLabel="Reintentar" onAction={load} />;
  }
  if (!items) return <FeedbackState type="loading" title="Cargando listas..." message="Un momento." />;

  return (
    <>
      {adding ? (
        <View style={[styles.adding, wide && narrowBlock]}>
          <TextField label="Nombre de la lista" value={name} onChangeText={setName} editable={!sending} maxLength={80} onSubmitEditing={create} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Button title="Crear lista" onPress={create} loading={sending} fullWidth />
        </View>
      ) : me?.permissions.includes('content:create') ? (
        <Button title="+ Nueva lista" onPress={() => setAdding(true)} fullWidth style={wide && narrowBlock} />
      ) : null}
      <Text style={styles.hint}>Una lista es lo que se reproduce en una pantalla: imágenes y videos en orden.</Text>
      {items.length === 0 ? (
        <FeedbackState type="empty" title="Aún no hay listas" message="Creá la primera con su nombre." />
      ) : (
        <View style={[styles.list, wide && wideGrid(320)]}>
          {items.map((p) => (
            <ListRow
              key={p.playlist_id}
              title={p.name}
              detail={`${p.item_count} ${p.item_count === 1 ? 'elemento' : 'elementos'}`}
              onPress={() => router.push({ pathname: '/admin/pantallas/lista/[id]', params: { id: p.playlist_id } })}
            />
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.md },
  adding: { gap: Spacing.sm },
  hint: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.small },
  error: { color: Colors.danger, fontFamily: Fonts.body, fontSize: Typography.small },
});
