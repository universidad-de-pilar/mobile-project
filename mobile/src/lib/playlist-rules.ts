export type PlaylistItem = {
  media_id: string;
  type: 'image' | 'video';
  url: string;
  duration_seconds: number;
};

export type Slot = { days: number; start: string; end: string; items: PlaylistItem[] };

export type Playlist = {
  version: string;
  poll_interval_seconds: number;
  store: { name: string; slug: string };
  qr_url: string;
  default: { items: PlaylistItem[] } | null;
  slots: Slot[];
};

export const DEFAULT_POLL_SECONDS = 30;
const VIDEO_GRACE_MS = 3000;

export const nextIndex = (index: number, length: number) => (length <= 0 ? 0 : (index + 1) % length);

export const clampIndex = (index: number, length: number) =>
  length <= 0 ? 0 : Math.min(Math.max(index, 0), length - 1);

/** Videos advance on `ended`; the timer is only a fallback, so it waits a little longer. */
export const itemTimeoutMs = (item: PlaylistItem) =>
  item.duration_seconds * 1000 + (item.type === 'video' ? VIDEO_GRACE_MS : 0);

/** The slot active at `now` (local clock) or the default; a slot without items falls back to the default. */
export function activeItems(playlist: Playlist, now: Date): PlaylistItem[] {
  const dayBit = 1 << ((now.getDay() + 6) % 7); // JS Sunday = 0, ours Monday = 1 ... Sunday = 64
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const slot = playlist.slots.find((s) => s.days & dayBit && s.start <= time && time < s.end);
  return slot?.items.length ? slot.items : (playlist.default?.items ?? []);
}

export type PlayerState = {
  current: Playlist | null;
  pending: Playlist | null;
  /** What is playing now, picked by `activeItems`; the same array reference while the selection does not change. */
  items: PlaylistItem[];
  index: number;
  /** Changes on every advance so a one-item playlist still remounts and loops. */
  cycle: number;
};

export const initialPlayerState = (cached: Playlist | null, now = new Date()): PlayerState => ({
  current: cached,
  pending: null,
  items: cached ? activeItems(cached, now) : [],
  index: 0,
  cycle: 0,
});

export function receivePlaylist(state: PlayerState, playlist: Playlist, now = new Date()): PlayerState {
  // Nothing is playing, so there is nothing to interrupt.
  if (!state.current || state.items.length === 0) {
    return { ...state, current: playlist, pending: null, items: activeItems(playlist, now), index: 0 };
  }
  if (playlist.version === state.current.version) return { ...state, pending: null };
  return { ...state, pending: playlist };
}

/** Called when the current item ends: a pending playlist or a slot change takes over here. */
export function advance(state: PlayerState, now = new Date()): PlayerState {
  const playlist = state.pending ?? state.current;
  if (!playlist) return state;
  const items = activeItems(playlist, now);
  // A new playlist or a different slot starts from its first item; the same one just moves on.
  const restart = state.pending !== null || items !== state.items;
  return {
    current: playlist,
    pending: null,
    items,
    index: restart ? 0 : nextIndex(state.index, items.length),
    cycle: state.cycle + 1,
  };
}

export type PollResult =
  | { status: 200; playlist: Playlist }
  | { status: 304 }
  | { status: 404 }
  | { status: 'error' };

export type PollOutcome =
  | { kind: 'apply'; playlist: Playlist; delayMs: number }
  | { kind: 'keep'; delayMs: number }
  | { kind: 'retry'; delayMs: number }
  | { kind: 'invalid' };

export function pollOutcome(result: PollResult, intervalSeconds: number): PollOutcome {
  const delayMs = intervalSeconds * 1000;
  if (result.status === 200) {
    return { kind: 'apply', playlist: result.playlist, delayMs: result.playlist.poll_interval_seconds * 1000 };
  }
  if (result.status === 304) return { kind: 'keep', delayMs };
  if (result.status === 404) return { kind: 'invalid' };
  return { kind: 'retry', delayMs };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function parseItem(raw: unknown): PlaylistItem | null {
  if (!isRecord(raw)) return null;
  const { media_id, type, url, duration_seconds } = raw;
  if (typeof media_id !== 'string' || typeof url !== 'string') return null;
  if (type !== 'image' && type !== 'video') return null;
  if (typeof duration_seconds !== 'number' || !(duration_seconds > 0)) return null;
  return { media_id, type, url, duration_seconds };
}

function parseItems(raw: unknown): PlaylistItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw.map(parseItem);
  return items.includes(null) ? null : (items as PlaylistItem[]);
}

function parseSlot(raw: unknown): Slot | null {
  if (!isRecord(raw)) return null;
  const { days, start, end } = raw;
  const items = parseItems(raw.items);
  if (typeof days !== 'number' || typeof start !== 'string' || typeof end !== 'string' || !items) return null;
  return { days, start, end, items };
}

/** Validates an API body or a cached value; anything malformed is null. */
export function parsePlaylist(raw: unknown): Playlist | null {
  if (!isRecord(raw) || !Array.isArray(raw.slots) || !isRecord(raw.store)) return null;
  const { version, poll_interval_seconds, qr_url, store } = raw;
  if (typeof version !== 'string' || typeof qr_url !== 'string') return null;
  if (typeof store.name !== 'string' || typeof store.slug !== 'string') return null;
  const slots = raw.slots.map(parseSlot);
  if (slots.includes(null)) return null;
  let defaultList: Playlist['default'] = null;
  if (raw.default !== null) {
    const items = isRecord(raw.default) ? parseItems(raw.default.items) : null;
    if (!items) return null;
    defaultList = { items };
  }
  return {
    version,
    poll_interval_seconds:
      typeof poll_interval_seconds === 'number' && poll_interval_seconds > 0
        ? poll_interval_seconds
        : DEFAULT_POLL_SECONDS,
    store: { name: store.name, slug: store.slug },
    qr_url,
    default: defaultList,
    slots: slots as Slot[],
  };
}

export const serializePlaylist = (playlist: Playlist) => JSON.stringify(playlist);

export function parseCachedPlaylist(raw: string | null): Playlist | null {
  if (!raw) return null;
  try {
    return parsePlaylist(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Host and path without the query, shown under the QR. */
export function qrLabel(qrUrl: string): string {
  try {
    const { host, pathname } = new URL(qrUrl);
    return `${host}${pathname === '/' ? '' : pathname}`;
  } catch {
    return qrUrl;
  }
}
