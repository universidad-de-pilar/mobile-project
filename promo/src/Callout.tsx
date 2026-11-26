import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Colors, Fonts } from './theme';

type Props = {
  from: number;
  to?: number; // frame where it fades out; stays visible if omitted
  dimAt?: number; // frame where it dims because the next callout takes over
  step?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const Callout: React.FC<Props> = ({ from, to, dimAt, step, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - from, fps, config: { damping: 16, stiffness: 120 } });
  const out = to === undefined ? 1 : interpolate(frame, [to, to + 10], [1, 0], clamp);
  const dim = dimAt === undefined ? 1 : interpolate(frame, [dimAt, dimAt + 12], [1, 0.4], clamp);
  if (frame < from) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '22px 30px',
        background: Colors.surface,
        border: `2px solid ${Colors.border}`,
        borderRadius: 24,
        boxShadow: '0 18px 40px rgba(28,25,23,0.12)',
        fontFamily: Fonts.title,
        fontWeight: 700,
        fontSize: 36,
        lineHeight: 1.2,
        color: Colors.ink,
        opacity: enter * out * dim,
        transform: `translateX(${(1 - enter) * 80}px) scale(${0.96 + 0.04 * dim})`,
        ...style,
      }}
    >
      {step !== undefined && (
        <div
          style={{
            flex: 'none',
            width: 52,
            height: 52,
            borderRadius: 26,
            background: Colors.primary,
            color: '#fff',
            fontSize: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {step}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
