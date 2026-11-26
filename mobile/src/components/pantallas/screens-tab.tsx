import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Thumb } from '@/components/pantallas/thumb';
import { Button } from '@/components/ui/mostrador/button';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { TextField } from '@/components/ui/mostrador/text-field';
import { Colors, Fonts, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import { narrowBlock, useWide, wideGrid } from '@/components/ui/mostrador/use-wide';
import { useSession } from '@/context/SessionContext';
import { createScreen, getPlaylist, getSchedule, listPlaylists, listScreens, type Playlist, type PlaylistItem, type Screen } from '@/lib/admin-api';
import { screenErrorMessage, validateScreenName } from '@/lib/content-rules';
import { activePlaylistId, toInput } from '@/lib/schedule-rules';
import { createSubmitLock } from '@/lib/submit-lock';

const THUMBS = 4;

type Loaded = { screens: Screen[]; playlists: Playlist[]; stamp: number } | 'error' | null;

export function ScreensTab() {
  const router = useRouter();
  const wide = useWide();
  const { store, me } = useSession();
  const can = (code: string) => Boolean(me?.permissions.includes(code));
  const [loaded, setLoaded] = useState<Loaded>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const lock = useRef(createSubmitLock()).current;

  const load = useCallback(() => {
    if (!store) return;
    // Names need content:read; without it the cards fall back to the schedule's own slot names.
    Promise.all([listScreens(store.store_id), listPlaylists().catch(() => [])])
      .then(([screens, playlists]) => setLoaded({ screens, playlists, stamp: Date.now() }))
      .catch(() => setLoaded('error'));
  }, [store]);
  useFocusEffect(load);

  async function addScreen() {
    const invalid = validateScreenName(newName);
    if (!store || invalid) return setAddError(invalid);
    if (!lock.acquire()) return;
    setSending(true);
    setAddError(null);
    try {
      const created = await createScreen(store.store_id, newName.trim());
      setAdding(false);
      setNewName('');
      router.push({ pathname: '/admin/pantallas/pantalla/[id]', params: { id: created.screen_id } });
    } catch (e) {
      setAddError(screenErrorMessage(e));
    } finally {
      lock.release();
      setSending(false);
    }
  }

  if (!loaded) return <FeedbackState type="loading" title="Cargando pantallas..." message="Un momento." />;
  if (loaded === 'error') {
    return <FeedbackState type="error" title="No pudimos cargar las pantallas" message="Revisá la conexión e intentá nuevamente." actionLabel="Reintentar" onAction={load} />;
  }
  const { screens, playlists, stamp } = loaded;

  return (
    <>
      {adding ? (
        <View style={[styles.adding, wide && narrowBlock]}>
          <TextField label="Nombre de la pantalla" value={newName} onChangeText={setNewName} editable={!sending} maxLength={80} onSubmitEditing={addScreen} />
          {addError ? <Text accessibilityRole="alert" style={styles.error}>{addError}</Text> : null}
          <Button title="Agregar pantalla" onPress={addScreen} loading={sending} fullWidth />
        </View>
      ) : can('screens:create') ? (
        <Button title="+ Nueva pantalla" onPress={() => setAdding(true)} fullWidth style={wide && narrowBlock} />
      ) : null}
      {screens.length === 0 ? (
        <FeedbackState type="empty" title="Aún no hay pantallas" message={can('screens:create') ? 'Agregá la primera con "+ Nueva pantalla".' : 'Todavía no hay pantallas en este local.'} />
      ) : (
        <View style={[styles.list, wide && wideGrid(320)]}>
          {screens.map((s) => (
            <ScreenCard
              key={s.screen_id}
              screen={s}
              playlists={playlists}
              stamp={stamp}
              canSeeItems={can('content:read')}
              onPress={() => router.push({ pathname: '/admin/pantallas/pantalla/[id]', params: { id: s.screen_id } })}
            />
          ))}
        </View>
      )}
    </>
  );
}

// `name` is null when nothing plays.
type Now = { name: string | null; items: PlaylistItem[] };

/** What plays on the screen right now, from its schedule and the local clock (the player does the same). */
function ScreenCard({ screen, playlists, stamp, canSeeItems, onPress }: { screen: Screen; playlists: Playlist[]; stamp: number; canSeeItems: boolean; onPress: () => void }) {
  const [now, setNow] = useState<Now | null>(null);

  useEffect(() => {
    let active = true;
    (async (): Promise<Now> => {
      const raw = await getSchedule(screen.screen_id);
      const names = new Map([...raw.slots.map((s) => [s.playlist_id, s.playlist_name] as const), ...playlists.map((p) => [p.playlist_id, p.name] as const)]);
      const id = activePlaylistId(toInput(raw), new Date(), (pid) => playlists.find((p) => p.playlist_id === pid)?.item_count !== 0);
      if (!id) return { name: null, items: [] };
      const items = canSeeItems ? await getPlaylist(id).then((p) => p.items, () => []) : [];
      return { name: names.get(id) ?? 'lista asignada', items };
    })()
      .then((n) => active && setNow(n))
      .catch(() => active && setNow({ name: null, items: [] }));
    return () => {
      active = false;
    };
  }, [screen.screen_id, playlists, stamp, canSeeItems]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${screen.name}, ${screen.is_active ? 'activa' : 'inactiva'}`} onPress={onPress} style={styles.card}>
      <View style={styles.head}>
        <Text numberOfLines={1} style={styles.name}>{screen.name}</Text>
        <View style={styles.state}>
          <View style={[styles.dot, screen.is_active && styles.dotOn]} />
          <Text style={styles.stateText}>{screen.is_active ? 'Activa' : 'Inactiva'}</Text>
        </View>
      </View>
      <View style={styles.thumbs}>
        {now?.items.slice(0, THUMBS).map((it, i) => <Thumb key={`${it.media_id}:${i}`} item={it} size={48} />)}
        {now && now.items.length > THUMBS ? <Text style={styles.more}>+{now.items.length - THUMBS}</Text> : null}
      </View>
      <Text numberOfLines={1} style={styles.now}>{!now ? 'Ahora: ...' : now.name ? `Ahora: ${now.name}` : 'Sin contenido'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.md },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  name: { flexShrink: 1, color: Colors.ink, fontFamily: Fonts.subtitle, fontSize: Typography.large },
  state: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stateText: { color: Colors.muted, fontFamily: Fonts.medium, fontSize: Typography.small },
  dot: { width: 10, height: 10, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.muted },
  dotOn: { backgroundColor: Colors.success, borderColor: Colors.success },
  thumbs: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: 48 },
  more: { color: Colors.muted, fontFamily: Fonts.bold, fontSize: Typography.body, marginLeft: Spacing.xs },
  now: { color: Colors.ink, fontFamily: Fonts.medium, fontSize: Typography.body },
  adding: { gap: Spacing.sm },
  error: { color: Colors.danger, fontFamily: Fonts.body, fontSize: Typography.small },
});
