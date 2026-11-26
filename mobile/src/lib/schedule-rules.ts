import { ApiError } from '@/lib/api';

/** Bit i is the day i of the week, Monday = 0 … Sunday = 6 (mask 1 … 64, as in the API). */
export const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export type SlotInput = { playlist_id: string; days: number; start: string; end: string };
export type ScheduleInput = { default_playlist_id: string | null; slots: SlotInput[] };

/** The GET shape carries `playlist_name`, which the PUT body does not accept. */
export const toInput = (s: {
  default_playlist_id: string | null;
  slots: SlotInput[];
}): ScheduleInput => ({
  default_playlist_id: s.default_playlist_id,
  slots: s.slots.map(({ playlist_id, days, start, end }) => ({ playlist_id, days, start, end })),
});

export const toggleDay = (mask: number, day: number) => mask ^ (1 << day);

export const DAY_SHORTCUTS = [
  { label: 'Todos los días', mask: 127 },
  { label: 'Lun a Vie', mask: 31 },
  { label: 'Fin de semana', mask: 96 },
];

export function daysLabel(mask: number) {
  const known = DAY_SHORTCUTS.find((d) => d.mask === mask);
  if (known) return known.label;
  const days = DAY_LABELS.filter((_, i) => mask & (1 << i));
  const first = DAY_LABELS.findIndex((_, i) => mask & (1 << i));
  const contiguous = days.length >= 3 && mask === ((1 << days.length) - 1) << first;
  return contiguous ? `${days[0]} a ${days.at(-1)}` : days.join(', ');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Half-hour steps; the picker never needs free-text times. */
export const startOptions = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);

/** Slots do not cross midnight, so the latest end is 23:59. */
export const endOptions = (start: string) => [...startOptions.filter((t) => t > start), '23:59'];

export const formatTime = (t: string) => t.replace(/^0/, '');

export const slotLabel = (days: number, start: string, end: string) =>
  `${daysLabel(days)} · ${formatTime(start)} a ${formatTime(end)}`;

/**
 * Playlist playing at `now` (local clock): the slot of that day and time, else the default.
 * `hasItems` mirrors the player, where an empty slot playlist falls back to the default.
 */
export function activePlaylistId(s: ScheduleInput, now: Date, hasItems: (id: string) => boolean = () => true) {
  const dayBit = 1 << ((now.getDay() + 6) % 7);
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const slot = s.slots.find((x) => x.days & dayBit && x.start <= time && time < x.end);
  return slot && hasItems(slot.playlist_id) ? slot.playlist_id : s.default_playlist_id;
}

export const setDefault = (s: ScheduleInput, playlistId: string | null): ScheduleInput => ({
  ...s,
  default_playlist_id: playlistId,
});

export const updateSlot = (s: ScheduleInput, index: number, slot: SlotInput): ScheduleInput => ({
  ...s,
  slots: s.slots.map((x, i) => (i === index ? slot : x)),
});

export const removeSlotAt = (s: ScheduleInput, index: number): ScheduleInput => ({
  ...s,
  slots: s.slots.filter((_, i) => i !== index),
});

export const addSlot = (s: ScheduleInput, slot: SlotInput): ScheduleInput => ({ ...s, slots: [...s.slots, slot] });

/** `where` is an entry of `GET /playlists/:id/screens`: all null means the default. */
export function removeAssignment(
  s: ScheduleInput,
  playlistId: string,
  where: { days: number | null; start: string | null; end: string | null },
): ScheduleInput {
  if (where.days === null) {
    return s.default_playlist_id === playlistId ? setDefault(s, null) : s;
  }
  return {
    ...s,
    slots: s.slots.filter(
      (x) => !(x.playlist_id === playlistId && x.days === where.days && x.start === where.start && x.end === where.end),
    ),
  };
}

export function scheduleErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'SLOT_OVERLAP') return 'Ese horario se superpone con otro de esta pantalla.';
    if (error.code === 'INVALID_SLOT') return 'El fin debe ser posterior al inicio.';
    if (error.code === 'PLAYLIST_NOT_FOUND') return 'La lista ya no existe.';
    if (error.code === 'SCREEN_NOT_FOUND') return 'La pantalla ya no existe.';
    if (error.status === 403) return 'No tenés permiso para esta acción.';
    if (error.status === 0) return 'No se pudo conectar con el servidor.';
  }
  return 'No se pudo completar la acción.';
}
