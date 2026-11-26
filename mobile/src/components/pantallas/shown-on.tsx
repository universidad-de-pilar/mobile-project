import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Toggle } from '@/components/ui/mostrador/toggle';
import { Colors, Fonts, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import { useSession } from '@/context/SessionContext';
import { getSchedule, listPlaylistScreens, listScreens, saveSchedule, type PlaylistScreen, type Screen } from '@/lib/admin-api';
import { removeAssignment, scheduleErrorMessage, setDefault, slotLabel, toInput, type ScheduleInput } from '@/lib/schedule-rules';

type Row = Screen & { storeName: string };

const DEFAULT_ENTRY = { days: null, start: null, end: null };

/** "Se muestra en": checking a screen makes this list its "Siempre muestra". Special schedules are only listed. */
export function ShownOn({ playlistId, canAssign }: { playlistId: string; canAssign: boolean }) {
  const { me } = useSession();
  const stores = me?.stores ?? [];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [assignments, setAssignments] = useState<PlaylistScreen[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(() => listPlaylistScreens(playlistId).then(setAssignments), [playlistId]);

  useEffect(() => {
    Promise.all([
      Promise.all(stores.map((s) => listScreens(s.store_id).then((list) => list.map((x) => ({ ...x, storeName: s.name }))))),
      loadAssignments(),
    ])
      .then(([perStore]) => setRows(perStore.flat()))
      .catch((e) => setError(scheduleErrorMessage(e)));
    // `stores` is a new array each render; the session's store list does not change while editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAssignments]);

  // Read-modify-write of the screen's whole schedule: the API replaces it in one PUT.
  async function toggle(screenId: string, on: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const change = (s: ScheduleInput) => (on ? setDefault(s, playlistId) : removeAssignment(s, playlistId, DEFAULT_ENTRY));
      await saveSchedule(screenId, change(toInput(await getSchedule(screenId))));
      await loadAssignments();
    } catch (e) {
      setError(scheduleErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Se muestra en</Text>
      {rows?.length === 0 ? <Text style={styles.hint}>Todavía no hay pantallas.</Text> : null}
      {rows?.map((r) => {
        const special = assignments.filter((a) => a.screen_id === r.screen_id && a.days !== null);
        const checked = assignments.some((a) => a.screen_id === r.screen_id && a.days === null);
        return (
          <View key={r.screen_id} style={styles.row}>
            <View style={styles.text}>
              <Text numberOfLines={1} style={styles.name}>{stores.length > 1 ? `${r.storeName} · ${r.name}` : r.name}</Text>
              {special.length ? (
                <Text style={styles.hint}>{`También en horario especial: ${special.map((a) => slotLabel(a.days ?? 0, a.start ?? '', a.end ?? '')).join('; ')}`}</Text>
              ) : null}
            </View>
            <Toggle value={checked} label={`Mostrar en ${r.name}`} disabled={!canAssign || busy} onValueChange={(on) => void toggle(r.screen_id, on)} />
          </View>
        );
      })}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.sm },
  title: { color: Colors.ink, fontFamily: Fonts.subtitle, fontSize: Typography.large },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  text: { flex: 1, gap: 2 },
  name: { color: Colors.ink, fontFamily: Fonts.medium, fontSize: Typography.bodyLarge },
  hint: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.small },
  error: { color: Colors.danger, fontFamily: Fonts.body, fontSize: Typography.small },
});
