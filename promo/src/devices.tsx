import React from 'react';
import { OffthreadVideo, staticFile, useCurrentFrame } from 'remotion';
import { FPS } from './theme';

type ScreenProps = { src: string; rate?: number; zoom?: number; startFrame?: number; children?: React.ReactNode };

// Tapa una zona del clip (px del clip de 1920x1080) con desenfoque opaco desde el segundo `after`
// del clip original; sigue el tiempo real del clip aunque se acelere.
export const Mask: React.FC<{ x: number; y: number; w: number; h: number; after: number; until?: number; bg: string; startFrame: number; rate: number }> = ({
  x,
  y,
  w,
  h,
  after,
  until = Infinity,
  bg,
  startFrame,
  rate,
}) => {
  const frame = useCurrentFrame();
  const s = (startFrame + frame * rate) / FPS;
  if (s < after || s >= until) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: `${(x / 1920) * 100}%`,
        top: `${(y / 1080) * 100}%`,
        width: `${(w / 1920) * 100}%`,
        height: `${(h / 1080) * 100}%`,
        background: bg,
        backdropFilter: 'blur(20px)',
        borderRadius: 10,
      }}
    />
  );
};

// Plays a clip filling its parent; zoom magnifies from the top-left corner (desktop UIs sit there).
export const Screen: React.FC<ScreenProps> = ({ src, rate = 1, zoom = 1, startFrame = 0, children }) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }}>
    <OffthreadVideo
      src={staticFile(src)}
      playbackRate={rate}
      startFrom={startFrame}
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: `scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    />
    {children}
  </div>
);

export const Phone: React.FC<{ height: number; children: React.ReactNode }> = ({ height, children }) => {
  const bezel = 14;
  const top = 40; // strip above the screen that holds the island
  const innerH = height - bezel - top - 4;
  const innerW = (innerH * 9) / 16;
  return (
    <div
      style={{
        position: 'relative',
        width: innerW + bezel * 2 + 4,
        height,
        borderRadius: 60,
        background: '#0d0c0b',
        border: '2px solid #3b3633',
        boxShadow: '0 40px 90px rgba(28,25,23,0.35), inset 0 0 0 2px #1f1b19',
        padding: `${top}px ${bezel}px ${bezel}px`,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'relative', width: innerW, height: innerH, borderRadius: 30, overflow: 'hidden' }}>
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          width: 96,
          height: 28,
          marginLeft: -48,
          borderRadius: 14,
          background: '#000',
        }}
      />
    </div>
  );
};

export const Laptop: React.FC<{ width: number; children: React.ReactNode }> = ({ width, children }) => {
  const bezel = 16;
  const screenW = width - bezel * 2;
  const screenH = (screenW * 9) / 16;
  return (
    <div style={{ width: width + 120, filter: 'drop-shadow(0 40px 60px rgba(28,25,23,0.3))' }}>
      <div
        style={{
          width,
          margin: '0 auto',
          padding: bezel,
          boxSizing: 'border-box',
          background: '#0d0c0b',
          border: '2px solid #3b3633',
          borderRadius: '22px 22px 6px 6px',
        }}
      >
        <div style={{ position: 'relative', width: screenW - 4, height: screenH }}>{children}</div>
      </div>
      <div
        style={{
          width: width + 120,
          height: 22,
          background: 'linear-gradient(#d6d3d1, #a8a29e)',
          borderRadius: '2px 2px 24px 24px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: 160,
            height: 8,
            marginLeft: -80,
            background: '#8f8a85',
            borderRadius: '0 0 10px 10px',
          }}
        />
      </div>
    </div>
  );
};

export const Tv: React.FC<{ width: number; children: React.ReactNode }> = ({ width, children }) => {
  const bezel = 9;
  const screenW = width - bezel * 2 - 4;
  const screenH = (screenW * 9) / 16;
  return (
    <div style={{ width, filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.55))' }}>
      <div
        style={{
          padding: bezel,
          boxSizing: 'border-box',
          background: '#050505',
          border: '2px solid #2b2724',
          borderRadius: 10,
        }}
      >
        <div style={{ position: 'relative', width: screenW, height: screenH }}>{children}</div>
      </div>
    </div>
  );
};
