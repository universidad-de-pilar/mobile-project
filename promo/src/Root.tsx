import React from 'react';
import { Composition, staticFile } from 'remotion';
import { DURATION, Presentacion } from './Presentacion';
import { FPS } from './theme';

// ai/musica.mp3 is optional: the video renders without it.
const detectMusic = async () => {
  try {
    const res = await fetch(staticFile('ai/musica.mp3'), { method: 'HEAD' });
    return res.ok && !(res.headers.get('content-type') ?? '').includes('html');
  } catch {
    return false;
  }
};

export const Root: React.FC = () => (
  <Composition
    id="Presentacion"
    component={Presentacion}
    durationInFrames={DURATION}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{ hasMusic: false }}
    calculateMetadata={async () => ({ props: { hasMusic: await detectMusic() } })}
  />
);
