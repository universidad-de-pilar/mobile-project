import { useCallback, useEffect, useRef, useState } from 'react';

import { clearCachedPlaylist, clearStoredToken, fetchPlaylist, loadCachedPlaylist, saveCachedPlaylist } from '@/lib/player-api';
import {
  advance,
  DEFAULT_POLL_SECONDS,
  initialPlayerState,
  pollOutcome,
  receivePlaylist,
} from '@/lib/playlist-rules';

const IDLE_RECHECK_MS = 15000;

export type PlayerStatus = 'loading' | 'waiting' | 'invalid' | 'ready';

export function usePlayer(token: string) {
  const [cached] = useState(() => loadCachedPlaylist(token));
  const [state, setState] = useState(() => initialPlayerState(cached));
  // The QR survives playlist changes and failed polls: it is replaced only by a newer valid one.
  const [qrUrl, setQrUrl] = useState<string | null>(cached?.qr_url ?? null);
  const [offline, setOffline] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const version = useRef<string | null>(cached?.version ?? null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let intervalSeconds = cached?.poll_interval_seconds ?? DEFAULT_POLL_SECONDS;

    const poll = async () => {
      const outcome = pollOutcome(await fetchPlaylist(token, version.current), intervalSeconds);
      if (!active) return;
      if (outcome.kind === 'invalid') {
        clearCachedPlaylist(token);
        clearStoredToken(token);
        setInvalid(true);
        return;
      }
      if (outcome.kind === 'apply') {
        version.current = outcome.playlist.version;
        intervalSeconds = outcome.playlist.poll_interval_seconds;
        saveCachedPlaylist(token, outcome.playlist);
        setState((s) => receivePlaylist(s, outcome.playlist));
        setQrUrl(outcome.playlist.qr_url);
      }
      setOffline(outcome.kind === 'retry');
      timer = setTimeout(poll, outcome.delayMs);
    };
    poll();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [token, cached]);

  const next = useCallback(() => setState((s) => advance(s)), []);

  // With nothing to play no item ends, so re-check the clock to start a slot when it begins.
  const idle = state.current !== null && state.items.length === 0;
  useEffect(() => {
    if (!idle) return;
    const timer = setInterval(next, IDLE_RECHECK_MS);
    return () => clearInterval(timer);
  }, [idle, next]);

  const status: PlayerStatus = invalid ? 'invalid' : state.current ? 'ready' : offline ? 'waiting' : 'loading';
  return { status, state, qrUrl, next };
}
