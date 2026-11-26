import { ApiError } from './api';
import {
  activePlaylistId,
  addSlot,
  daysLabel,
  DAY_SHORTCUTS,
  endOptions,
  formatTime,
  removeSlotAt,
  slotLabel,
  startOptions,
  updateSlot,
  removeAssignment,
  scheduleErrorMessage,
  setDefault,
  toInput,
  toggleDay,
  type ScheduleInput,
} from './schedule-rules';

const slot = (playlist_id: string, days: number, start: string, end: string) => ({ playlist_id, days, start, end });
const base: ScheduleInput = { default_playlist_id: 'd', slots: [slot('a', 31, '08:00', '12:00')] };

describe('days bitmask', () => {
  it('toggles a day on and off', () => {
    expect(toggleDay(0, 0)).toBe(1); // Mon
    expect(toggleDay(1, 6)).toBe(65); // + Sun
    expect(toggleDay(65, 0)).toBe(64);
  });
  it('labels the mask', () => {
    expect(daysLabel(127)).toBe('Todos los días');
    expect(daysLabel(31)).toBe('Lun a Vie');
    expect(daysLabel(96)).toBe('Fin de semana');
    expect(daysLabel(7)).toBe('Lun a Mié');
    expect(daysLabel(5)).toBe('Lun, Mié');
    expect(daysLabel(3)).toBe('Lun, Mar');
  });
  it('day shortcuts are masks', () => {
    expect(DAY_SHORTCUTS).toEqual([
      { label: 'Todos los días', mask: 127 },
      { label: 'Lun a Vie', mask: 31 },
      { label: 'Fin de semana', mask: 96 },
    ]);
  });
});

describe('times', () => {
  it('start options go from 00:00 to 23:30 every 30 minutes', () => {
    expect(startOptions).toHaveLength(48);
    expect(startOptions[0]).toBe('00:00');
    expect(startOptions[17]).toBe('08:30');
    expect(startOptions[47]).toBe('23:30');
  });
  it('end options only offer times after the start, up to 23:59', () => {
    expect(endOptions('23:00')).toEqual(['23:30', '23:59']);
    expect(endOptions('08:00')[0]).toBe('08:30');
    expect(endOptions('08:00').at(-1)).toBe('23:59');
  });
  it('formats without a leading zero', () => {
    expect(formatTime('08:00')).toBe('8:00');
    expect(formatTime('12:30')).toBe('12:30');
    expect(formatTime('23:59')).toBe('23:59');
  });
  it('labels a slot', () => expect(slotLabel(31, '08:00', '12:00')).toBe('Lun a Vie · 8:00 a 12:00'));
});

describe('activePlaylistId', () => {
  const sched: ScheduleInput = {
    default_playlist_id: 'd',
    slots: [slot('a', 31, '08:00', '12:00'), slot('b', 96, '10:00', '14:00')],
  };
  const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m, d, h, min); // 2026-11-02 is a Monday (month index 10)
  it('picks the slot at the local day and time', () => {
    expect(activePlaylistId(sched, at(2026, 10, 2, 9))).toBe('a');
    expect(activePlaylistId(sched, at(2026, 10, 7, 11))).toBe('b'); // Saturday
  });
  it('end is exclusive and falls back to the default', () => {
    expect(activePlaylistId(sched, at(2026, 10, 2, 12))).toBe('d');
    expect(activePlaylistId(sched, at(2026, 10, 2, 7, 59))).toBe('d');
  });
  it('is null with no default and no slot', () => {
    expect(activePlaylistId({ default_playlist_id: null, slots: [] }, at(2026, 10, 2, 9))).toBeNull();
  });
  it('an empty slot playlist falls back to the default', () => {
    expect(activePlaylistId(sched, at(2026, 10, 2, 9), (id) => id !== 'a')).toBe('d');
  });
});

describe('schedule edits', () => {
  it('toInput drops the playlist name the PUT does not accept', () => {
    const got = { default_playlist_id: null, slots: [{ ...slot('a', 1, '08:00', '09:00'), playlist_name: 'A' }] };
    expect(toInput(got)).toEqual({ default_playlist_id: null, slots: [slot('a', 1, '08:00', '09:00')] });
  });
  it('sets or clears the default without touching slots', () => {
    expect(setDefault(base, 'x')).toEqual({ ...base, default_playlist_id: 'x' });
    expect(setDefault(base, null).default_playlist_id).toBeNull();
  });
  it('adds a slot at the end', () => {
    const s = slot('b', 96, '10:00', '14:00');
    expect(addSlot(base, s).slots).toEqual([...base.slots, s]);
  });
  it('removes the default only when it is that playlist', () => {
    expect(removeAssignment(base, 'd', { days: null, start: null, end: null }).default_playlist_id).toBeNull();
    expect(removeAssignment(base, 'other', { days: null, start: null, end: null })).toEqual(base);
  });
  it('removes only the matching slot', () => {
    const two = addSlot(base, slot('a', 96, '08:00', '12:00'));
    const out = removeAssignment(two, 'a', { days: 31, start: '08:00', end: '12:00' });
    expect(out.slots).toEqual([slot('a', 96, '08:00', '12:00')]);
  });
});

describe('slot edits by index', () => {
  const two = addSlot(base, slot('b', 96, '10:00', '14:00'));
  it('replaces one slot', () => {
    const n = slot('c', 1, '09:00', '10:00');
    expect(updateSlot(two, 1, n).slots).toEqual([base.slots[0], n]);
  });
  it('removes one slot', () => expect(removeSlotAt(two, 0).slots).toEqual([slot('b', 96, '10:00', '14:00')]));
});

describe('scheduleErrorMessage', () => {
  it('maps server codes', () => {
    expect(scheduleErrorMessage(new ApiError(422, 'SLOT_OVERLAP', 'x'))).toBe('Ese horario se superpone con otro de esta pantalla.');
    expect(scheduleErrorMessage(new ApiError(422, 'INVALID_SLOT', 'x'))).toBe('El fin debe ser posterior al inicio.');
    expect(scheduleErrorMessage(new ApiError(404, 'PLAYLIST_NOT_FOUND', 'x'))).toBe('La lista ya no existe.');
    expect(scheduleErrorMessage(new ApiError(404, 'SCREEN_NOT_FOUND', 'x'))).toBe('La pantalla ya no existe.');
    expect(scheduleErrorMessage(new ApiError(403, null, 'x'))).toBe('No tenés permiso para esta acción.');
    expect(scheduleErrorMessage(new ApiError(0, null, 'x'))).toBe('No se pudo conectar con el servidor.');
    expect(scheduleErrorMessage(new Error('x'))).toBe('No se pudo completar la acción.');
  });
});
