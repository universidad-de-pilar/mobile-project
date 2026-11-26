import { toHourMinute } from "src/content/domain/playlist.repository";
import type { ScheduleRow } from "./screen.repository";

// days is a weekday bitmask (Mon=1 ... Sun=64); start/end are "HH:MM" and never cross midnight.
export interface Slot { playlist_id: string; days: number; start: string; end: string }

export const isValidSlot = (slot: Pick<Slot, 'days' | 'start' | 'end'>) =>
    slot.days >= 1 && slot.days <= 127 && slot.start < slot.end;

// "HH:MM" strings compare correctly as text. Intervals are [start, end), so touching slots do not overlap.
export const slotsOverlap = (a: Slot, b: Slot) => (a.days & b.days) !== 0 && a.start < b.end && b.start < a.end;

// First pair of slot indices that overlap, or null.
export const findOverlap = (slots: Slot[]): [number, number] | null => {
    for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
            if (slotsOverlap(slots[i], slots[j])) return [i, j];
        }
    }
    return null;
};

// Rows come ordered by start time and days; the default (days NULL) is split from the slots.
export const splitSchedule = (rows: ScheduleRow[]) => ({
    defaultRow: rows.find((row) => row.days === null) ?? null,
    slotRows: rows.filter((row) => row.days !== null).map((row) => ({
        playlist_id: row.playlist_id,
        playlist_name: row.playlist_name,
        days: row.days as number,
        start: toHourMinute(row.start_time) as string,
        end: toHourMinute(row.end_time) as string,
    })),
});
