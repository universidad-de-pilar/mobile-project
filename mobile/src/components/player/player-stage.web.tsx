import { useEffect, type CSSProperties } from 'react';

import { Colors, Fonts, Radius } from '@/components/ui/mostrador/tokens';
import { resolveImageUrl } from '@/lib/api';
import { clampIndex, itemTimeoutMs, nextIndex, type PlaylistItem } from '@/lib/playlist-rules';

import type { PlayerStageProps } from './player-stage';

const ERROR_SKIP_MS = 1000;
const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };

function Media({ item, onDone }: { item: PlaylistItem; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, itemTimeoutMs(item));
    return () => clearTimeout(timer);
  }, [item, onDone]);

  // A broken file waits a moment before skipping so an all-broken list does not spin.
  const skip = () => setTimeout(onDone, ERROR_SKIP_MS);
  const src = resolveImageUrl(item.url) ?? undefined;
  return item.type === 'video' ? (
    <video src={src} style={fill} autoPlay muted playsInline onEnded={onDone} onError={skip} />
  ) : (
    <img src={src} alt="" style={fill} onError={skip} />
  );
}

/** Keeps the next item downloaded so the change does not show a blank frame. */
function Preload({ item }: { item: PlaylistItem | undefined }) {
  const src = item ? (resolveImageUrl(item.url) ?? undefined) : undefined;
  const hidden: CSSProperties = { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' };
  if (!item) return null;
  return item.type === 'video' ? (
    <video key={src} src={src} style={hidden} preload="auto" muted />
  ) : (
    <img key={src} src={src} alt="" style={hidden} />
  );
}

function Progress({ count, active }: { count: number; active: number }) {
  if (count < 2) return null;
  return (
    <div style={{ position: 'absolute', left: '7.5vw', bottom: '6.7vh', display: 'flex', gap: '0.8vh' }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            height: '0.9vh',
            width: i === active ? '5.5vh' : '1.4vh',
            borderRadius: Radius.pill,
            background: Colors.surface,
            opacity: i === active ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

export function PlayerStage({ items, storeName, index, cycle, onDone }: PlayerStageProps) {
  const active = clampIndex(index, items.length);
  const item = items[active];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: Colors.ink,
        cursor: 'none',
        fontFamily: Fonts.body,
      }}
    >
      {item ? (
        <Media key={`${cycle}-${item.media_id}`} item={item} onDone={onDone} />
      ) : (
        // Default panel for a screen without content.
        <div
          style={{
            ...fill,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '7.5vw',
            background: Colors.primary,
            color: Colors.surface,
            fontFamily: Fonts.title,
            fontSize: '9vh',
          }}
        >
          {storeName}
        </div>
      )}
      <Preload item={items[nextIndex(active, items.length)]} />
      <Progress count={items.length} active={active} />
    </div>
  );
}
