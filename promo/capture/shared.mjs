import { devices } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const WEB = process.env.PROMO_WEB ?? 'https://mostrador-io.onrender.com';
export const API = process.env.PROMO_API ?? 'https://mobile-project-f5r1.onrender.com';
export const TENANT = process.env.PROMO_TENANT ?? 'unpilar';
export const STORE = process.env.PROMO_STORE ?? 'cafeteria';

export const DESKTOP = { width: 1920, height: 1080 };
export const phone = (viewport, deviceScaleFactor = 3) => ({ ...devices['iPhone 13'], viewport, deviceScaleFactor, isMobile: true, hasTouch: true });

export const pause = (page, ms = 900) => page.waitForTimeout(ms);
export const type = (loc, text) => loc.pressSequentially(text, { delay: 60 });

// Las credenciales solo se leen del entorno; nunca se guardan en archivos.
export async function apiLogin() {
  const { PROMO_EMAIL: email, PROMO_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('Definí PROMO_EMAIL y PROMO_PASSWORD en el entorno.');
  const headers = { 'X-Tenant-Slug': TENANT, 'content-type': 'application/json' };
  // El primer request puede tardar: Render free duerme el servicio.
  const res = await fetch(`${API}/auth/login`, { method: 'POST', headers, body: JSON.stringify({ email, password }) });
  if (!res.ok) throw new Error(`Login falló (${res.status}).`);
  const { access_token: jwt } = await res.json();
  const authed = { ...headers, Authorization: `Bearer ${jwt}` };
  const call = async (path, init = {}) => {
    const r = await fetch(`${API}${path}`, { ...init, headers: authed });
    if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${r.status}`);
    return r.status === 204 ? null : r.json();
  };
  const me = await call('/me');
  return { jwt, storeId: me.stores[0].store_id, call };
}

// Espera contenido real: red quieta, fuentes y cada <img>/<video> cargados.
export async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete) && [...document.querySelectorAll('video')].every((v) => v.readyState >= 3));
  await page.waitForTimeout(400);
}

// Registra un pedido real por la API pública para que llegue a Órdenes.
export async function placeOrder(customer_name) {
  const headers = { 'X-Tenant-Slug': TENANT, 'content-type': 'application/json' };
  const catalog = await (await fetch(`${API}/public/stores/${STORE}/catalog`, { headers })).json();
  const items = catalog.categories.flatMap((c) => c.products).slice(0, 2).map((p) => ({ product_id: p.product_id, quantity: 1 }));
  await fetch(`${API}/public/stores/${STORE}/orders`, { method: 'POST', headers, body: JSON.stringify({ items, customer_name }) });
}

// CDP screencast at real device pixels (Playwright's recordVideo is capped at the CSS viewport size, so it looks soft).
// Chrome only emits frames when the page changes, so the MP4 is built from per-frame durations (concat demuxer).
// Start it once the screen is settled; stop() encodes to H.264 at `out` (default: viewport size x dsf).
export async function startScreencast(page, { dsf = 1, out } = {}) {
  const { width, height } = page.viewportSize();
  const [outW, outH] = out ?? [width * dsf, height * dsf];
  const dir = mkdtempSync(join(tmpdir(), 'promo-cast-'));
  const frames = []; // { file, ts } in seconds
  const writes = [];
  const cdp = await page.context().newCDPSession(page);
  let stopped = false; // frames still in flight after stop() must not write into the removed temp dir
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    if (stopped) return;
    const file = `f${String(frames.length).padStart(6, '0')}.jpg`;
    frames.push({ file, ts: metadata.timestamp });
    writes.push(writeFile(join(dir, file), Buffer.from(data, 'base64')));
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: width * dsf, maxHeight: height * dsf, everyNthFrame: 1 });
  const started = Date.now();
  while (!frames.length) {
    if (Date.now() - started > 3000) throw new Error('Screencast produced no initial frame.');
    await page.waitForTimeout(50);
  }

  // Time spent in skip() (spinners, real network latency) is cut out: the last frame before it is held until the first one after it.
  const cuts = []; // [from, to] in seconds
  const adj = (ts) => ts - cuts.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(ts, b) - a), 0);

  return {
    async skip(fn) {
      const from = Date.now() / 1000;
      await fn();
      cuts.push([from, Date.now() / 1000]);
    },
    async stop(file) {
      const end = Date.now() / 1000;
      await cdp.send('Page.stopScreencast');
      stopped = true;
      await Promise.all(writes);
      // Frames inside a cut are dropped, except the last one of each cut: it is the settled state the page reached.
      const lastIn = cuts.map(([a, b]) => frames.findLast((f) => f.ts > a && f.ts < b)).filter(Boolean);
      const kept = frames.filter((f) => lastIn.includes(f) || !cuts.some(([a, b]) => f.ts > a && f.ts < b));
      const lines = kept.map((f, i) => {
        const next = i + 1 < kept.length ? kept[i + 1].ts : end;
        return `file '${f.file}'\nduration ${Math.max(adj(next) - adj(f.ts), 0.001).toFixed(4)}`;
      });
      lines.push(`file '${kept.at(-1).file}'`); // concat demuxer ignores the last duration unless the file is repeated
      writeFileSync(join(dir, 'list.txt'), lines.join('\n'));
      mkdirSync(join(file, '..'), { recursive: true });
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-i', join(dir, 'list.txt'),
        '-vf', `scale=${outW}:${outH}:flags=lanczos,format=yuv420p`, '-r', '30', '-fps_mode', 'cfr',
        '-c:v', 'libx264', '-crf', '14', '-an', file], { cwd: dir });
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
