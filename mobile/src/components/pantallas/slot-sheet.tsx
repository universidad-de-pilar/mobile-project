import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/mostrador/button';
import { Chip } from '@/components/ui/mostrador/chip';
import { Colors, Fonts, Layout, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import type { Playlist } from '@/lib/admin-api';
import { DAY_LABELS, DAY_SHORTCUTS, endOptions, formatTime, startOptions, toggleDay, type SlotInput } from '@/lib/schedule-rules';

type Props = { initial: SlotInput | null; playlists: Playlist[]; onSave: (slot: SlotInput) => void; onClose: () => void };

/** Add or edit a special schedule. Mount it only while open so the form starts from `initial`. */
export function SlotSheet({ initial, playlists, onSave, onClose }: Props) {
  const [playlistId, setPlaylistId] = useState(initial?.playlist_id ?? playlists[0]?.playlist_id ?? '');
  const [days, setDays] = useState(initial?.days ?? 31);
  const [start, setStart] = useState(initial?.start ?? '08:00');
  const [end, setEnd] = useState(initial?.end ?? '12:00');

  const ends = endOptions(start);
  const pickStart = (t: string) => {
    setStart(t);
    if (end <= t) setEnd(endOptions(t)[0]);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{initial ? 'Editar horario' : 'Nuevo horario especial'}</Text>

            <Text style={styles.label}>Qué se muestra</Text>
            <View style={styles.chips}>
              {playlists.map((p) => (
                <Chip key={p.playlist_id} label={p.name} active={playlistId === p.playlist_id} onPress={() => setPlaylistId(p.playlist_id)} />
              ))}
            </View>

            <Text style={styles.label}>Días</Text>
            <View style={styles.chips}>
              {DAY_SHORTCUTS.map((d) => (
                <Chip key={d.label} label={d.label} active={days === d.mask} onPress={() => setDays(d.mask)} />
              ))}
            </View>
            <View style={styles.chips}>
              {DAY_LABELS.map((d, i) => (
                <Chip key={d} label={d} active={Boolean(days & (1 << i))} onPress={() => setDays(toggleDay(days, i))} />
              ))}
            </View>

            <View style={styles.times}>
              <TimeColumn label="Desde" options={startOptions} value={start} onPick={pickStart} />
              <TimeColumn label="Hasta" options={ends} value={end} onPick={setEnd} />
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} style={styles.half} />
            <Button title="Guardar" disabled={!playlistId || days < 1} onPress={() => onSave({ playlist_id: playlistId, days, start, end })} style={styles.half} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TimeColumn({ label, options, value, onPick }: { label: string; options: string[]; value: string; onPick: (t: string) => void }) {
  return (
    <View style={styles.column}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView nestedScrollEnabled style={styles.timeList}>
        {options.map((t) => (
          <Pressable key={t} accessibilityRole="button" accessibilityState={{ selected: t === value }} onPress={() => onPick(t)} style={[styles.time, t === value && styles.timeOn]}>
            <Text style={[styles.timeText, t === value && styles.timeTextOn]}>{formatTime(t)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28, 25, 23, 0.5)' },
  sheet: { maxHeight: '92%', width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, overflow: 'hidden' },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  title: { color: Colors.ink, fontFamily: Fonts.title, fontSize: Typography.subtitle },
  label: { color: Colors.muted, fontFamily: Fonts.medium, fontSize: Typography.small },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  times: { flexDirection: 'row', gap: Spacing.md },
  column: { flex: 1, gap: Spacing.xs },
  timeList: { height: Layout.minTouchTarget * 3, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md },
  time: { minHeight: Layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  timeOn: { backgroundColor: Colors.ink },
  timeText: { color: Colors.ink, fontFamily: Fonts.medium, fontSize: Typography.regular },
  timeTextOn: { color: Colors.surface },
  footer: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
  half: { flex: 1 },
});
