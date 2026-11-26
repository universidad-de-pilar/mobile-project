import React from 'react';
import {
  AbsoluteFill,
  Html5Audio,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Callout } from './Callout';
import { Laptop, Mask, Phone, Screen, Tv } from './devices';
import { Logo } from './Logo';
import { Colors, FPS, Fonts, TRANSITION } from './theme';

// Cortes anclados a la música (ai/musica.mp3, 71.37 s = 2141 frames).
// Derivación: se decodificó el audio a mono, se calculó la energía por frame (30 fps) y el
// onset (salto positivo de energía frente a los 6 frames previos); la rejilla de negras que
// mejor ajusta es 16.36 frames/negra (~110 bpm) con la primera en el frame 5. Los cortes caen
// en negras de inicio de compás (múltiplos de 4) o en acentos fuertes (negra 18, frame 299).
const BEAT = 16.36;
const BEAT0 = 5;
const cut = (beat: number) => Math.round(BEAT0 + BEAT * beat);
const TOTAL = 2141;
// Negra donde empieza cada sección: apertura, giro, menú, TV IA, TV real, backoffice, cierre, outro.
const BEATS = [0, 12, 18, 52, 60, 72, 112, 124];
const CUTS = BEATS.map((b, i) => (i === 0 ? 0 : cut(b)));
// Cada sección arranca TRANSITION/2 antes del corte para que el golpe caiga en mitad de la transición.
const START = CUTS.map((c, i) => (i === 0 ? 0 : c - TRANSITION / 2));
const D = START.map((s, i) => (i < START.length - 1 ? START[i + 1] + TRANSITION - s : TOTAL - s));
export const DURATION = TOTAL;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const t = linearTiming({ durationInFrames: TRANSITION });

const useRise = (from: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: { damping: 18, stiffness: 110 } });
  return { opacity: p, transform: `translateY(${(1 - p) * 40}px)` };
};

const lightBg = `radial-gradient(circle at 80% 20%, ${Colors.primarySoft} 0%, ${Colors.bg} 55%)`;
const dot = <span style={{ color: Colors.primary }}>.</span>;

// Video IA a pantalla completa, sin audio propio, con texto abajo sobre degradado oscuro.
const Full: React.FC<{ src: string; from?: number; dark?: boolean; children: React.ReactNode }> = ({ src, from = 0, dark, children }) => {
  const frame = useCurrentFrame();
  const rise = useRise(24);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <OffthreadVideo
        src={staticFile(src)}
        startFrom={from}
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${1 + frame * 0.0003})`,
          filter: dark ? 'brightness(0.75) saturate(0.7)' : undefined,
        }}
      />
      <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(28,25,23,0.9) 0%, rgba(28,25,23,0.55) 30%, rgba(28,25,23,0) 60%)' }} />
      <div
        style={{
          ...rise,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 100,
          textAlign: 'center',
          padding: '0 200px',
          fontFamily: Fonts.title,
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1.08,
          letterSpacing: -3,
          color: '#fff',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const Apertura: React.FC = () => (
  <Full src="ai/apertura.mp4" dark>
    ¿Cuánto tiempo pasa tu cliente esperando<span style={{ color: Colors.primary }}>?</span>
  </Full>
);

const Giro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 4, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 42%, ${Colors.primarySoft} 0%, ${Colors.bg} 60%)`,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 50,
      }}
    >
      <div
        style={{
          ...useRise(8),
          fontFamily: Fonts.title,
          fontWeight: 800,
          fontSize: 150,
          lineHeight: 1.02,
          letterSpacing: -5,
          color: Colors.ink,
          textAlign: 'center',
        }}
      >
        Que no sea
        <br />
        tiempo perdido{dot}
      </div>
      <div style={{ transform: `scale(${0.7 + 0.3 * pop})`, opacity: interpolate(frame, [30, 50], [0, 1], clamp) }}>
        <Logo size={80} />
      </div>
    </AbsoluteFill>
  );
};

const Label: React.FC<{ children: string; dark?: boolean }> = ({ children, dark }) => (
  <div
    style={{
      position: 'absolute',
      top: 56,
      left: 70,
      padding: '12px 28px',
      borderRadius: 999,
      background: dark ? 'rgba(255,255,255,0.12)' : Colors.primarySoft,
      color: dark ? '#fff' : Colors.primary,
      fontFamily: Fonts.title,
      fontWeight: 800,
      fontSize: 30,
      letterSpacing: 1,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
);

// m1 (menú) dura M1 frames a velocidad real y luego entra m2 (pedido) desde su segundo 1.
const M1 = 260;
const Menu: React.FC = () => (
  <AbsoluteFill style={{ background: lightBg }}>
    <Label>Menú digital</Label>
    <div style={{ position: 'absolute', left: 330, top: 100 }}>
      <Phone height={900}>
        <Sequence durationInFrames={M1} layout="none">
          <Screen src="scenes/mp4/m1-menu.mp4" />
        </Sequence>
        <Sequence from={M1} layout="none">
          <Screen src="scenes/mp4/m2-pedido.mp4" startFrame={30} />
        </Sequence>
      </Phone>
    </div>
    <div style={{ position: 'absolute', left: 1000, top: 270, width: 780, display: 'flex', flexDirection: 'column', gap: 34 }}>
      <Callout from={14} dimAt={135} step={1}>Escaneá y mirá el menú</Callout>
      <Callout from={140} dimAt={M1 + 10} step={2}>Sin TACC, a la vista</Callout>
      <Callout from={M1 + 15} dimAt={435} step={3}>Elegí y sumá al carrito</Callout>
      <Callout from={440} step={4}>Confirmá sin hacer fila</Callout>
    </div>
  </AbsoluteFill>
);

const TvIa: React.FC = () => (
  <Full src="ai/tv.mp4" from={75}>
    Mientras espera, descubre{dot}
  </Full>
);

const TvReal: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 35% 40%, #44403c 0%, ${Colors.ink} 70%)` }}>
    <Label dark>Pantallas</Label>
    <div style={{ position: 'absolute', left: 60, top: 200 }}>
      <Tv width={1200}>
        <Screen src="scenes/mp4/t2-player.mp4" startFrame={9} rate={2} />
      </Tv>
    </div>
    <div style={{ position: 'absolute', left: 1330, top: 330, width: 520 }}>
      <Callout from={14}>Tu contenido, en todas tus pantallas</Callout>
    </div>
  </AbsoluteFill>
);

// Backoffice: cada clip dura un número entero de negras; "from" es el segundo del clip original
// donde arranca (se reproduce a 1.15x). t1 lleva máscara de privacidad (segundos del clip original).
type Mk = { x: number; y: number; w: number; h: number; after: number; until?: number; bg: string };
type Clip = { beats: number; src: string; from: number; text: string; masks?: Mk[] };
const RATE = 1.15;
const CLIPS: Clip[] = [
  { beats: 9, src: 'b1-ordenes', from: 1.4, text: 'Los pedidos llegan al instante' },
  { beats: 9, src: 'b2-catalogo', from: 5.1, text: 'Precios, SKU y sin TACC en segundos' },
  // Enlace /screen/<token> bajo "Conectar al televisor": tapado todo el tiempo.
  {
    beats: 6,
    src: 't1-vincular',
    from: 1.2,
    text: 'Conectá una TV con un código',
    // El enlace baja ~52 px cuando aparece "TV vinculada" (~3.4 s): dos franjas.
    masks: [
      { x: 510, y: 805, w: 980, h: 95, after: 0, until: 3.4, bg: '#1c1917' },
      { x: 510, y: 855, w: 980, h: 95, after: 3.4, bg: '#1c1917' },
    ],
  },
  { beats: 9, src: 'b3-pantallas', from: 3.3, text: 'Listas y horarios para cada pantalla' },
  { beats: 7, src: 'b5-qr', from: 1.8, text: 'El QR de tu menú, listo para imprimir' },
];

const Backoffice: React.FC = () => {
  const base = BEATS[5];
  let acc = 0;
  return (
    <AbsoluteFill style={{ background: lightBg }}>
      <Label>Backoffice</Label>
      {CLIPS.map((c) => {
        const from = cut(base + acc) - START[5];
        acc += c.beats;
        const dur = cut(base + acc) - START[5] - from;
        const startFrame = Math.round(c.from * FPS);
        return (
          <Sequence key={c.src} from={from} durationInFrames={dur} layout="none">
            <div style={{ position: 'absolute', left: 50, top: 230 }}>
              <Laptop width={1160}>
                <Screen src={`scenes/mp4/${c.src}.mp4`} startFrame={startFrame} rate={RATE}>
                  {c.masks?.map((m, i) => (
                    <Mask key={i} {...m} startFrame={startFrame} rate={RATE} />
                  ))}
                </Screen>
              </Laptop>
            </div>
            <div style={{ position: 'absolute', left: 1390, top: 230, height: 700, width: 470, display: 'flex', alignItems: 'center' }}>
              <Callout from={6}>{c.text}</Callout>
            </div>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Collage de grabaciones reales; cada clip arranca donde hay movimiento y le alcanza hasta el final de la sección.
const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (d: number) => spring({ frame: frame - d, fps, config: { damping: 14 } });
  const item = (d: number): React.CSSProperties => ({ position: 'absolute', opacity: pop(d), transform: `translateY(${(1 - pop(d)) * 60}px)` });
  return (
    <AbsoluteFill style={{ background: lightBg }}>
      <div
        style={{
          ...useRise(6),
          position: 'absolute',
          top: 70,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: Fonts.title,
          fontWeight: 800,
          fontSize: 92,
          letterSpacing: -3,
          color: Colors.ink,
        }}
      >
        El tiempo en tu local, ahora suma{dot}
      </div>
      <div style={{ ...item(10), left: 30, top: 340 }}>
        <Laptop width={900}>
          <Screen src="scenes/mp4/b1-ordenes.mp4" startFrame={90} />
        </Laptop>
      </div>
      <div style={{ ...item(18), left: 1330, top: 330 }}>
        <Tv width={560}>
          <Screen src="scenes/mp4/t2-player.mp4" startFrame={60} />
        </Tv>
      </div>
      <div style={{ ...item(26), left: 960, top: 400, zIndex: 2 }}>
        <Phone height={640}>
          <Screen src="scenes/mp4/m2-pedido.mp4" startFrame={150} />
        </Phone>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const pop = spring({ frame: frame - 4, fps, config: { damping: 12 } });
  const cta = spring({ frame: frame - 50, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ background: Colors.ink, alignItems: 'center', justifyContent: 'center', gap: 36 }}>
      <div style={{ transform: `scale(${0.7 + 0.3 * pop})`, opacity: pop }}>
        <Logo size={130} dark />
      </div>
      <div style={{ ...useRise(25), fontFamily: Fonts.title, fontWeight: 700, fontSize: 64, color: Colors.primary }}>
        mostrador.io
      </div>
      <div
        style={{
          opacity: cta,
          transform: `scale(${0.85 + 0.15 * cta})`,
          marginTop: 20,
          padding: '24px 64px',
          borderRadius: 999,
          background: Colors.primary,
          color: '#fff',
          fontFamily: Fonts.title,
          fontWeight: 800,
          fontSize: 46,
        }}
      >
        Probalo en tu local
      </div>
    </AbsoluteFill>
  );
};

const fadeP = fade();
const slideP = slide({ direction: 'from-right' });

const SECTIONS: { el: React.FC; into?: ReturnType<typeof fade> | ReturnType<typeof slide> }[] = [
  { el: Apertura },
  { el: Giro, into: fadeP },
  { el: Menu, into: fadeP },
  { el: TvIa, into: fadeP },
  { el: TvReal, into: fadeP },
  { el: Backoffice, into: slideP },
  { el: Cierre, into: fadeP },
  { el: Outro, into: fadeP },
];

export const Presentacion: React.FC<{ hasMusic: boolean }> = ({ hasMusic }) => (
  <AbsoluteFill style={{ background: Colors.bg }}>
    <TransitionSeries>
      {SECTIONS.map(({ el: El, into }, i) => (
        <React.Fragment key={i}>
          {into && <TransitionSeries.Transition presentation={into} timing={t} />}
          <TransitionSeries.Sequence durationInFrames={D[i]}>
            <El />
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
    {hasMusic && (
      <Html5Audio
        src={staticFile('ai/musica.mp3')}
        volume={(f) => interpolate(f, [0, 15, DURATION - 15, DURATION], [0, 0.6, 0.6, 0], clamp)}
      />
    )}
  </AbsoluteFill>
);
