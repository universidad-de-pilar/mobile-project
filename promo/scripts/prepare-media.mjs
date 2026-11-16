// Copies the (gitignored) media into public/ so Remotion can serve it via staticFile().
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const files = [
  'ai/apertura.mp4',
  'ai/tv.mp4',
  'ai/musica.mp3',
  ...[
    'm1-menu',
    'm2-pedido',
    't1-vincular',
    't2-player',
    'b1-ordenes',
    'b2-catalogo',
    'b3-pantallas',
    'b4-equipo',
    'b5-qr',
  ].map((s) => `scenes/mp4/${s}.mp4`),
];
for (const f of files) {
  if (!existsSync(f)) {
    console.log(`skip (missing): ${f}`);
    continue;
  }
  mkdirSync(`public/${f.slice(0, f.lastIndexOf('/'))}`, { recursive: true });
  cpSync(f, `public/${f}`);
}
