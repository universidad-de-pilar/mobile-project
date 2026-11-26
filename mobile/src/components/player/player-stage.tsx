import type { PlaylistItem } from '@/lib/playlist-rules';

export type PlayerStageProps = {
  items: PlaylistItem[];
  storeName: string;
  index: number;
  cycle: number;
  qrUrl: string | null;
  onDone: () => void;
};

// The player is web-only: `player-stage.web.tsx` is the real one.
export function PlayerStage(_props: PlayerStageProps) {
  return null;
}
