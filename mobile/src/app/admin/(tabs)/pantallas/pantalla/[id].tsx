import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmPanel } from '@/components/pantallas/confirm-panel';
import { FirstUpload } from '@/components/pantallas/first-upload';
import { SlotSheet } from '@/components/pantallas/slot-sheet';
import { Button } from '@/components/ui/mostrador/button';
import { Chip } from '@/components/ui/mostrador/chip';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { Colors, Fonts, Layout, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import { TopBar } from '@/components/ui/mostrador/top-bar';
import { narrowBlock, useWide } from '@/components/ui/mostrador/use-wide';
import { useSession } from '@/context/SessionContext';
import { getSchedule, listPlaylists, listScreens, saveSchedule, type Playlist, type Screen } from '@/lib/admin-api';
import { addSlot, removeSlotAt, scheduleErrorMessage, setDefault, slotLabel, toInput, updateSlot, type ScheduleInput, type SlotInput } from '@/lib/schedule-rules';

type Status = 'idle' | 'saving' | 'saved' | { error: string };
type Sheet = { index: number | null };

/** One screen: what it always shows, special schedules and the TV link. Every change is saved right away. */
export default function ScreenDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const wide = useWide();
  const { store, me } = useSession();
  const can = (code: string) => Boolean(me?.permissions.includes(code));
  const canEdit = can('screens:update');
  const [screen, setScreen] = useState<Screen | null>(null);
  const [schedule, setSchedule] = useState<ScheduleInput | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [slotNames, setSlotNames] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [tvOpen, setTvOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!store) return;
    Promise.all([listScreens(store.store_id), getSchedule(id), listPlaylists().catch(() => [])])
      .then(([screens, raw, lists]) => {
        const found = screens.find((s) => s.screen_id === id);
        if (!found) return setFailed(true);
        setScreen(found);
        setSchedule(toInput(raw));
        setSlotNames(Object.fromEntries(raw.slots.map((s) => [s.playlist_id, s.playlist_name])));
        setPlaylists(lists);
      })
      .catch(() => setFailed(true));
  }, [id, store]);

  const nameOf = (playlistId: string) => playlists.find((p) => p.playlist_id === playlistId)?.name ?? slotNames[playlistId] ?? 'Lista';

  // Optimistic: show the change, PUT it, and go back to the previous state if the server refuses.
  const commit = useCallback(
    async (next: ScheduleInput) => {
      if (!schedule || status === 'saving') return;
      const prev = schedule;
      setSchedule(next);
      setStatus('saving');
      try {
        const saved = await saveSchedule(id, next);
        setSchedule(toInput(saved));
        setSlotNames((n) => ({ ...n, ...Object.fromEntries(saved.slots.map((s) => [s.playlist_id, s.playlist_name])) }));
        setStatus('saved');
      } catch (e) {
        setSchedule(prev);
        setStatus({ error: scheduleErrorMessage(e) });
      }
    },
    [id, schedule, status],
  );

  async function copy(url: string) {
    try {
      await Clipboard.setStringAsync(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function saveSlot(slot: SlotInput) {
    if (!schedule || !sheet) return;
    void commit(sheet.index === null ? addSlot(schedule, slot) : updateSlot(schedule, sheet.index, slot));
    setSheet(null);
  }

  if (failed || !schedule || !screen) {
    return (
      <View style={styles.screen}>
        <TopBar title="Pantalla" onBack={() => router.back()} />
        {failed ? (
          <FeedbackState type="error" title="No pudimos cargar la pantalla" message="Revisá la conexión e intentá nuevamente." actionLabel="Volver" onAction={() => router.back()} />
        ) : (
          <FeedbackState type="loading" title="Cargando pantalla..." message="Un momento." />
        )}
      </View>
    );
  }

  const saving = status === 'saving';
  const empty = schedule.default_playlist_id === null && schedule.slots.length === 0;
  const canPick = canEdit && playlists.length > 0;

  return (
    <View style={styles.screen}>
      <TopBar title={screen.name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, wide && narrowBlock]} keyboardShouldPersistTaps="handled">
        <View style={styles.statusRow}>
          {status === 'saving' ? <Text style={styles.hint}>Guardando...</Text> : null}
          {status === 'saved' ? <Text accessibilityRole="alert" style={styles.ok}>Guardado</Text> : null}
        </View>
        {typeof status === 'object' ? <Text accessibilityRole="alert" style={styles.error}>{status.error}</Text> : null}

        {empty && canEdit && can('content:create') ? (
          <FirstUpload
            screenName={screen.name}
            onCreated={(list) => {
              setPlaylists((l) => [...l, list]);
              void commit(setDefault(schedule, list.playlist_id));
            }}
          />
        ) : null}

        <Text style={styles.title}>Siempre muestra</Text>
        <Text style={styles.hint}>Es lo que se ve cuando no hay un horario especial.</Text>
        {canPick ? (
          <View style={styles.chips}>
            <Chip label="Nada" active={schedule.default_playlist_id === null} onPress={() => !saving && void commit(setDefault(schedule, null))} />
            {playlists.map((p) => (
              <Chip key={p.playlist_id} label={p.name} active={schedule.default_playlist_id === p.playlist_id} onPress={() => !saving && void commit(setDefault(schedule, p.playlist_id))} />
            ))}
          </View>
        ) : (
          <Text style={styles.value}>{schedule.default_playlist_id ? nameOf(schedule.default_playlist_id) : 'Nada'}</Text>
        )}

        <Text style={styles.title}>Horarios especiales</Text>
        {schedule.slots.length === 0 ? <Text style={styles.hint}>Por ejemplo, desayunos de lunes a viernes por la mañana.</Text> : null}
        {schedule.slots.map((s, i) => (
          <View key={`${s.playlist_id}:${s.days}:${s.start}:${i}`} style={styles.slot}>
            <View style={styles.line}>
              <Pressable accessibilityRole={canEdit ? 'button' : undefined} disabled={!canEdit || saving} onPress={() => setSheet({ index: i })} style={styles.slotText}>
                <Text style={styles.value}>{slotLabel(s.days, s.start, s.end)}</Text>
                <Text numberOfLines={1} style={styles.hint}>{`→ ${nameOf(s.playlist_id)}`}</Text>
              </Pressable>
              {canEdit ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Quitar horario ${slotLabel(s.days, s.start, s.end)}`} disabled={saving} onPress={() => setConfirmIndex(i)} style={styles.remove}>
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                </Pressable>
              ) : null}
            </View>
            {confirmIndex === i ? (
              <ConfirmPanel
                message="¿Quitar este horario?"
                confirmLabel="Sí, quitar"
                onConfirm={() => {
                  setConfirmIndex(null);
                  void commit(removeSlotAt(schedule, i));
                }}
                onCancel={() => setConfirmIndex(null)}
              />
            ) : null}
          </View>
        ))}
        {canPick ? <Button title="+ Agregar horario" variant="ghost" disabled={saving} onPress={() => setSheet({ index: null })} fullWidth /> : null}
        {canEdit && playlists.length === 0 ? <Text style={styles.hint}>Primero creá una lista en la pestaña Listas.</Text> : null}

        <Pressable accessibilityRole="button" accessibilityState={{ expanded: tvOpen }} onPress={() => setTvOpen(!tvOpen)} style={styles.tvHead}>
          <Text style={styles.title}>Conectar al televisor</Text>
          <Ionicons name={tvOpen ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.ink} />
        </Pressable>
        {tvOpen ? (
          <View style={styles.tv}>
            <Text style={styles.tvHint}>Abrí este enlace en el navegador del televisor.</Text>
            <Text selectable style={styles.tvUrl}>{screen.player_url}</Text>
            <Button title="Copiar enlace" variant="secondary" onPress={() => void copy(screen.player_url)} fullWidth />
            {copied ? <Text accessibilityRole="alert" style={styles.ok}>Enlace copiado</Text> : null}
          </View>
        ) : null}
      </ScrollView>
      {sheet ? (
        <SlotSheet initial={sheet.index === null ? null : schedule.slots[sheet.index]} playlists={playlists} onSave={saveSlot} onClose={() => setSheet(null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Layout.screenPadding, gap: Spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  title: { color: Colors.ink, fontFamily: Fonts.subtitle, fontSize: Typography.large, marginTop: Spacing.section },
  value: { color: Colors.ink, fontFamily: Fonts.medium, fontSize: Typography.bodyLarge },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  slot: { gap: Spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  slotText: { flex: 1, minHeight: Layout.minTouchTarget, justifyContent: 'center' },
  remove: { width: Layout.minTouchTarget, height: Layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  tvHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: Layout.minTouchTarget },
  tv: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.ink },
  tvHint: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.small },
  tvUrl: { color: Colors.surface, fontFamily: Fonts.bold, fontSize: Typography.body },
  hint: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.small },
  ok: { color: Colors.success, fontFamily: Fonts.medium, fontSize: Typography.caption },
  error: { color: Colors.danger, fontFamily: Fonts.medium, fontSize: Typography.caption },
});
