import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DESKTOP, STORE, WEB, apiLogin, pause, phone, placeOrder, settle, startScreencast, type } from './shared.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'scenes');
const filter = process.argv[2];

// Phone: 405x720 @3x = 1215x2160 source, downscaled to 1080x1920 (supersampled); TV: 1920x1080 @1x.
const PHONE = phone({ width: 405, height: 720 });
const WIDE = { viewport: DESKTOP };
// Backoffice: a 960x540 @2x viewport (still the wide layout, >= 900) fills the laptop frame at 1920x1080.
const COMPACT = { viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 };
const COMPACT_CAST = { dsf: 2, out: [1920, 1080] };

const MENU = `${WEB}/${STORE}`;
const PROMO_LIST = 'Promo del día';
const CODE = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/;

const scroll = async (page, dy) => {
  for (let i = 0; i < Math.abs(dy) / 40; i++) {
    await page.mouse.wheel(0, Math.sign(dy) * 40);
    await page.waitForTimeout(16);
  }
};

const openMenu = async (page) => {
  await page.goto(MENU);
  await page.getByRole('button', { name: /^Agregar / }).first().waitFor();
  await settle(page);
};

// Pantalla de prueba "Vitrina": se crea si falta y queda mostrando la lista real, sin horarios ni listas de la demo.
async function resetVitrina({ call, storeId }) {
  const [screens, lists] = await Promise.all([call(`/screens?store_id=${storeId}`), call('/playlists')]);
  const screen = screens.find((s) => s.name === 'Vitrina') ?? await call('/screens', { method: 'POST', body: JSON.stringify({ store_id: storeId, name: 'Vitrina' }) });
  const real = lists.find((l) => l.name !== PROMO_LIST);
  await call(`/screens/${screen.screen_id}/schedule`, { method: 'PUT', body: JSON.stringify({ default_playlist_id: real.playlist_id, slots: [] }) });
  for (const l of lists.filter((l) => l.name === PROMO_LIST)) await call(`/playlists/${l.playlist_id}`, { method: 'DELETE' });
  return `${WEB}/admin/pantallas/pantalla/${screen.screen_id}`;
}

// Abre /screen (muestra el código de vinculación) y devuelve el código.
const pairingCode = async (player) => {
  await player.goto(`${WEB}/screen`);
  return (await player.getByText(CODE).textContent()).trim();
};

const linkTv = async (page, code) => {
  await page.getByText('Conectar al televisor').click();
  await type(page.getByLabel('Código del televisor'), code);
  await pause(page, 600);
  await page.getByRole('button', { name: 'Vincular' }).click();
};

// setup() gets the page to its settled starting screen (not recorded); run() is the recorded scene.
const scenes = {
  'm1-menu': {
    context: PHONE,
    setup: openMenu,
    async run(page) {
      await pause(page, 1500);
      for (const cat of ['Bebidas frías', 'Pastelería', 'Opciones saladas']) {
        await page.getByRole('button', { name: cat }).click();
        await pause(page, 1400);
      }
      await page.getByRole('button', { name: /^Ver Porción de chipá/ }).click(); // único producto sin TACC
      await page.getByRole('button', { name: /^Agregar · / }).waitFor();
      await pause(page, 2200);
    },
  },
  'm2-pedido': {
    context: PHONE,
    setup: openMenu,
    async run(page, { rec }) {
      await pause(page, 900);
      await page.getByRole('button', { name: /^Ver Cappuccino/ }).click();
      await page.getByRole('button', { name: /^Agregar · / }).waitFor();
      await settle(page);
      await pause(page, 1000);
      await page.getByRole('button', { name: 'Agregar uno' }).click();
      await pause(page, 900);
      await page.getByRole('button', { name: /^Agregar · / }).click();
      await page.getByRole('button', { name: /^Agregar · / }).waitFor({ state: 'hidden' });
      await pause(page, 1200); // aparece la barra del carrito
      await page.getByRole('button', { name: 'Pastelería' }).click();
      await pause(page, 900);
      await page.getByRole('button', { name: /^Agregar Medialuna clásica/ }).click();
      await pause(page, 1000);
      await page.getByRole('button', { name: /^Ver carrito · / }).click();
      await page.getByRole('button', { name: 'Continuar' }).waitFor();
      await pause(page, 1500);
      await page.getByRole('button', { name: 'Continuar' }).click();
      await type(page.getByLabel('Tu nombre'), 'Sofia');
      await pause(page, 800);
      await rec.skip(async () => {
        await page.getByRole('button', { name: 'Confirmar pedido' }).click(); // pedido real
        await page.getByText('Pedido registrado').waitFor();
        await settle(page);
      });
      await pause(page, 2000);
    },
  },
  't1-vincular': {
    context: COMPACT,
    cast: COMPACT_CAST,
    auth: true,
    async setup(page, ctx, context) {
      const url = await resetVitrina(ctx);
      ctx.player = await context.newPage(); // el "televisor": queda abierto mostrando su código
      ctx.code = await pairingCode(ctx.player);
      await page.bringToFront();
      await page.goto(url);
      await page.getByText('Conectar al televisor').waitFor();
      await settle(page);
    },
    async run(page, { code, rec }) {
      await pause(page, 900);
      await page.getByText('Conectar al televisor').click();
      await scroll(page, 400);
      await pause(page, 600);
      await type(page.getByLabel('Código del televisor'), code);
      await pause(page, 800);
      await rec.skip(async () => {
        await page.getByRole('button', { name: 'Vincular' }).click();
        await page.getByText('TV vinculada').waitFor();
      });
      await pause(page, 1800);
    },
  },
  't2-player': {
    context: WIDE,
    auth: true,
    async setup(player, ctx, context) {
      const url = await resetVitrina(ctx);
      const code = await pairingCode(player);
      const admin = await context.newPage();
      await admin.goto(url);
      await admin.getByText('Conectar al televisor').waitFor();
      await linkTv(admin, code);
      await admin.waitForTimeout(2500);
      await admin.close();
      await player.bringToFront();
      await player.getByText('Ingresá este código en el panel').waitFor({ state: 'hidden' });
      await settle(player);
    },
    async run(player) {
      // Dos imágenes completas: el video la reproduce a 2x para mostrar el cambio.
      await pause(player, 15000);
    },
  },
  'b1-ordenes': {
    auth: true,
    context: COMPACT,
    cast: COMPACT_CAST,
    async setup(page) {
      await page.goto(`${WEB}/admin/ordenes`);
      await page.getByRole('button', { name: /Pedido #/ }).first().waitFor();
      await settle(page);
    },
    async run(page, { rec }) {
      await pause(page, 800);
      await rec.skip(async () => {
        await placeOrder('Sofia');
        await page.reload();
        await page.getByText('Generada').first().waitFor();
        await settle(page);
      });
      await pause(page, 1200); // el pedido recién llegado
      await page.getByRole('button', { name: /Pedido #/ }).first().click();
      await page.getByRole('button', { name: 'Empezar preparación' }).waitFor();
      await pause(page, 1200);
      await page.getByRole('button', { name: 'Empezar preparación' }).click();
      await pause(page, 1400);
      await page.getByRole('button', { name: 'Marcar lista' }).click();
      await page.getByRole('button', { name: 'Marcar entregada' }).waitFor(); // estado "lista"
      await pause(page, 1500);
    },
  },
  'b2-catalogo': {
    auth: true,
    context: COMPACT,
    cast: COMPACT_CAST,
    async setup(page) {
      await page.goto(`${WEB}/admin/catalogo`);
      await page.getByText('Americano').first().waitFor();
      await settle(page);
    },
    async run(page, { rec }) {
      const search = page.getByLabel('Buscar por nombre o SKU');
      await pause(page, 700);
      await type(search, 'cap');
      await pause(page, 1300);
      await search.fill('');
      await type(search, 'unpilar-1');
      await pause(page, 1500);
      await search.fill('');
      await pause(page, 500);
      await page.getByRole('button', { name: 'Vista compacta' }).click();
      await pause(page, 1500);
      await rec.skip(async () => {
        await page.getByText('Porción de chipá').first().click();
        await page.getByLabel('Nombre').waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll('input')].some((i) => i.value.startsWith('Porción de chipá')));
        await settle(page);
      });
      await pause(page, 1200);
      await scroll(page, 600); // precio y Sin TACC; no se guarda nada
      await pause(page, 1800);
    },
  },
  'b3-pantallas': {
    auth: true,
    context: COMPACT,
    cast: COMPACT_CAST,
    async setup(page, ctx) {
      ctx.vitrina = await resetVitrina(ctx);
      await page.goto(`${WEB}/admin/pantallas?tab=listas`);
      await page.getByRole('button', { name: '+ Nueva lista' }).waitFor();
      await settle(page);
    },
    async run(page, { vitrina, rec }) {
      await pause(page, 700);
      await page.getByRole('button', { name: '+ Nueva lista' }).click();
      await type(page.getByLabel('Nombre de la lista'), PROMO_LIST);
      await pause(page, 400);
      await rec.skip(async () => {
        await page.getByRole('button', { name: 'Crear lista' }).click();
        await page.getByText('Qué se muestra').waitFor();
        await settle(page);
      });
      await pause(page, 600);
      await page.getByRole('button', { name: '+ Agregar' }).click();
      await pause(page, 500);
      await page.getByRole('button', { name: 'Elegir de los ya subidos' }).click();
      await pause(page, 900);
      await rec.skip(async () => {
        await page.getByRole('button', { name: /pantalla-3\.png/ }).click();
        await page.getByRole('button', { name: 'Quitar pantalla-3.png' }).waitFor();
        await settle(page);
      });
      await pause(page, 1000);
      await rec.skip(() => page.goto(vitrina).then(() => page.getByText('Horarios especiales').waitFor().then(() => settle(page))));
      await pause(page, 700);
      await page.getByRole('button', { name: '+ Agregar horario' }).click();
      await page.getByText('Nuevo horario especial').waitFor();
      await pause(page, 600);
      await page.getByRole('dialog').getByRole('button', { name: PROMO_LIST }).click();
      await pause(page, 700);
      await page.getByRole('dialog').getByRole('button', { name: 'Lun a Vie' }).click();
      await pause(page, 800);
      await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click();
      await page.getByText('Guardado').waitFor();
      await pause(page, 1500);
    },
  },
  'b4-equipo': {
    auth: true,
    context: COMPACT,
    cast: COMPACT_CAST,
    async setup(page) {
      await page.goto(`${WEB}/admin/equipo`);
      await page.getByRole('button', { name: '+ Nuevo empleado' }).waitFor();
      await settle(page);
    },
    async run(page) {
      await pause(page, 1800);
      await page.getByRole('button', { name: '+ Nuevo empleado' }).click();
      await pause(page, 900);
      // Datos ficticios; el formulario no se envía.
      await type(page.getByLabel('Email'), 'empleado@ejemplo.com');
      await type(page.getByLabel('Nombre'), 'Lucia');
      await type(page.getByLabel('Apellido'), 'Perez');
      await pause(page, 500);
      await scroll(page, 400);
      await pause(page, 1800);
    },
  },
  'b5-qr': {
    auth: true,
    context: COMPACT,
    cast: COMPACT_CAST,
    async setup(page) {
      await page.goto(`${WEB}/admin/ajustes`);
      await page.getByRole('button', { name: 'Descargar PNG' }).waitFor();
      await settle(page);
    },
    async run(page) {
      await pause(page, 1200);
      await scroll(page, 700);
      await pause(page, 900);
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Descargar PNG' }).click();
      await download;
      await pause(page, 1500);
    },
  },
};

const names = Object.keys(scenes).filter((n) => !filter || n.includes(filter));
if (!names.length) throw new Error(`No scene matches "${filter}". Options: ${Object.keys(scenes).join(', ')}`);

mkdirSync(join(OUT, 'mp4'), { recursive: true });
mkdirSync(join(OUT, 'png'), { recursive: true });
const browser = await chromium.launch();
let failed = 0;

for (const name of names) {
  const scene = scenes[name];
  const ctx = await apiLogin(); // el token dura 20 min: uno nuevo por escena
  const context = await browser.newContext(scene.context);
  if (scene.auth) await context.addInitScript((t) => window.localStorage.setItem('mostrador.token', t), ctx.jwt);
  context.setDefaultTimeout(90_000); // el primer request puede ser un cold start
  const page = await context.newPage();
  try {
    await scene.setup(page, ctx, context);
    await page.bringToFront();
    const rec = await startScreencast(page, scene.cast ?? (scene.context === PHONE ? { dsf: 3, out: [1080, 1920] } : {}));
    await scene.run(page, { ...ctx, rec });
    await pause(page, 500);
    await rec.stop(join(OUT, 'mp4', `${name}.mp4`));
    await page.screenshot({ path: join(OUT, 'png', `${name}.png`) });
    console.log(`ok ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}: ${e.message.split('\n')[0]}`);
  } finally {
    await context.close();
  }
}

// Deja la pantalla "Vitrina" sin el horario ni la lista que crea b3-pantallas.
if (names.includes('b3-pantallas')) await resetVitrina(await apiLogin());
await browser.close();
process.exit(failed ? 1 : 0);
