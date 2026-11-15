import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmPanel } from '@/components/pantallas/confirm-panel';
import { ShownOn } from '@/components/pantallas/shown-on';
import { Thumb } from '@/components/pantallas/thumb';
import { Button } from '@/components/ui/mostrador/button';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { ListRow } from '@/components/ui/mostrador/list-row';
import { Stepper } from '@/components/ui/mostrador/stepper';
import { TextField } from '@/components/ui/mostrador/text-field';
import { Colors, Fonts, Layout, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import { TopBar } from '@/components/ui/mostrador/top-bar';
import { narrowBlock, useWide } from '@/components/ui/mostrador/use-wide';
import { useSession } from '@/context/SessionContext';
import { deletePlaylist, getPlaylist, listMedia, renamePlaylist, savePlaylistItems, type Media, type PlaylistItem } from '@/lib/admin-api';
import { contentErrorMessage, contentSubtitle, DEFAULT_IMAGE_SECONDS, itemsPayload, moveItem, validateScreenName } from '@/lib/content-rules';
import { pickAndUpload, uploadErrorMessage } from '@/lib/upload-media';

const SAVE_DELAY_MS = 600;

type Status = 'idle' | 'saving' | 'saved' | { error: string };

/** One list: items, durations and the screens that always show it. Changes save by themselves. */
export default function ListEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const wide = useWide();
  const { me } = useSession();
  const can = (code: string) => Boolean(me?.permissions.includes(code));
  const canEdit = can('content:update');
  const [name, setName] = useState<string | null>(null);
  const [rows, setRows] = useState<PlaylistItem[]>([]);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [adding, setAdding] = useState(false);
  const [library, setLibrary] = useState<Media[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<PlaylistItem[] | null>(null);

  useEffect(() => {
    getPlaylist(id)
      .then((p) => {
        setName(p.name);
        setRows(p.items);
      })
      .catch(() => setFailed(true));
  }, [id]);

  async function put(items: PlaylistItem[]) {
    pending.current = null;
    setStatus('saving');
    try {
      await savePlaylistItems(id, itemsPayload(items));
      setStatus('saved');
    } catch (e) {
      setStatus({ error: contentErrorMessage(e) });
    }
  }

  // Debounced so tapping the stepper does not send one request per tap.
  function change(next: PlaylistItem[]) {
    setRows(next);
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void put(next), SAVE_DELAY_MS);
  }

  // Leaving the screen inside the debounce window must not lose the last edit.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) void savePlaylistItems(id, itemsPayload(pending.current)).catch(() => undefined);
    },
    [id],
  );

  async function rename() {
    const invalid = validateScreenName(name ?? '');
    if (invalid) return setStatus({ error: invalid });
    setStatus('saving');
    try {
      await renamePlaylist(id, (name ?? '').trim());
      setStatus('saved');
    } catch (e) {
      setStatus({ error: contentErrorMessage(e) });
    }
  }

  const append = (m: Media) =>
    change([...rows, { media_id: m.media_id, type: m.type, url: m.url, original_name: m.original_name, duration_seconds: m.duration_seconds ?? DEFAULT_IMAGE_SECONDS }]);

  async function upload() {
    setUploading(true);
    try {
      const media = await pickAndUpload();
      if (media) {
        append(media);
        setLibrary(null);
        setAdding(false);
      }
    } catch (e) {
      setStatus({ error: uploadErrorMessage(e) });
    } finally {
      setUploading(false);
    }
  }

  async function openLibrary() {
    setLibrary(await listMedia().catch(() => []));
  }

  async function remove() {
    if (timer.current) clearTimeout(timer.current);
    pending.current = null;
    try {
      await deletePlaylist(id);
      router.back();
    } catch (e) {
      setConfirmingDelete(false);
      setStatus({ error: contentErrorMessage(e) });
    }
  }

  if (failed || name === null) {
    return (
      <View style={styles.screen}>
        <TopBar title="Lista" onBack={() => router.back()} />
        {failed ? (
          <FeedbackState type="error" title="No pudimos cargar la lista" message="Puede que ya no exista." actionLabel="Volver" onAction={() => router.back()} />
        ) : (
          <FeedbackState type="loading" title="Cargando lista..." message="Un momento." />
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar title="Lista" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, wide && narrowBlock]} keyboardShouldPersistTaps="handled">
        <View style={styles.statusRow}>
          {status === 'saving' ? <Text style={styles.hint}>Guardando...</Text> : null}
          {status === 'saved' ? <Text accessibilityRole="alert" style={styles.ok}>Guardado</Text> : null}
        </View>
        {typeof status === 'object' ? (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.error}>{status.error}</Text>
            {rows.length > 0 && canEdit ? <Button title="Reintentar" variant="secondary" onPress={() => void put(rows)} /> : null}
          </View>
        ) : null}

        <TextField label="Nombre" value={name} onChangeText={setName} onBlur={() => canEdit && void rename()} editable={canEdit} maxLength={80} />

        <Text style={styles.title}>Qué se muestra</Text>
        {canEdit ? (
          adding ? (
            <View style={styles.panel}>
              {can('content:create') ? <Button title="Subir nuevo" onPress={() => void upload()} loading={uploading} fullWidth /> : null}
              <Button title="Elegir de los ya subidos" variant="secondary" onPress={() => void openLibrary()} fullWidth />
              {library?.length === 0 ? <Text style={styles.hint}>Todavía no subiste nada.</Text> : null}
              {library?.map((m) => (
                <ListRow
                  key={m.media_id}
                  title={m.original_name}
                  detail={contentSubtitle(m)}
                  image={m.type === 'image' ? m.url : null}
                  onPress={() => {
                    append(m);
                    setAdding(false);
                    setLibrary(null);
                  }}
                />
              ))}
              <Button title="Cancelar" variant="secondary" onPress={() => { setAdding(false); setLibrary(null); }} fullWidth />
            </View>
          ) : (
            <Button title="+ Agregar" onPress={() => setAdding(true)} fullWidth />
          )
        ) : null}
        {rows.length === 0 ? <Text style={styles.hint}>Todavía no hay nada. Agregá una imagen o un video.</Text> : null}
        {rows.map((r, i) => (
          <View key={`${r.media_id}:${i}`} style={styles.item}>
            <Thumb item={r} size={56} />
            <View style={styles.info}>
              <Text numberOfLines={1} style={styles.itemName}>{r.original_name}</Text>
              {r.type === 'image' && canEdit ? (
                <View style={styles.duration}>
                  <Stepper value={r.duration_seconds} min={3} max={60} onChange={(v) => change(rows.map((x, j) => (j === i ? { ...x, duration_seconds: v } : x)))} />
                  <Text style={styles.hint}>segundos</Text>
                </View>
              ) : (
                <Text style={styles.hint}>{contentSubtitle(r)}</Text>
              )}
            </View>
            {canEdit ? (
              <View style={styles.actions}>
                <IconButton icon="chevron-up" label={`Subir ${r.original_name}`} disabled={i === 0} onPress={() => change(moveItem(rows, i, -1))} />
                <IconButton icon="chevron-down" label={`Bajar ${r.original_name}`} disabled={i === rows.length - 1} onPress={() => change(moveItem(rows, i, 1))} />
                <IconButton icon="close" label={`Quitar ${r.original_name}`} apart onPress={() => change(rows.filter((_, j) => j !== i))} />
              </View>
            ) : null}
          </View>
        ))}

        <ShownOn playlistId={id} canAssign={can('screens:update')} />

        {can('content:delete') ? (
          confirmingDelete ? (
            <ConfirmPanel message="Se quita también de las pantallas donde se muestra." confirmLabel="Sí, eliminar lista" onConfirm={() => void remove()} onCancel={() => setConfirmingDelete(false)} />
          ) : (
            <Button title="Eliminar lista" variant="ghostDanger" onPress={() => setConfirmingDelete(true)} fullWidth />
          )
        ) : null}
      </ScrollView>
    </View>
  );
}

function IconButton({ icon, label, disabled, apart, onPress }: { icon: 'chevron-up' | 'chevron-down' | 'close'; label: string; disabled?: boolean; apart?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.icon, apart && styles.apart, disabled && styles.off]}>
      <Ionicons name={icon} size={20} color={Colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Layout.screenPadding, gap: Spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  title: { color: Colors.ink, fontFamily: Fonts.subtitle, fontSize: Typography.large, marginTop: Spacing.section },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  info: { flex: 1, gap: Spacing.xs },
  itemName: { color: Colors.ink, fontFamily: Fonts.medium, fontSize: Typography.body },
  duration: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  icon: { width: Layout.minTouchTarget, height: Layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  apart: { marginLeft: Spacing.md },
  off: { opacity: 0.3 },
  panel: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  errorBox: { gap: Spacing.sm },
  hint: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.small },
  ok: { color: Colors.success, fontFamily: Fonts.medium, fontSize: Typography.caption },
  error: { color: Colors.danger, fontFamily: Fonts.medium, fontSize: Typography.caption },
});
