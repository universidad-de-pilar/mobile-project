# Promo video assets

Records real-app clips with Playwright against the deployed app (clips are regenerable, not versioned).

```
npm install
npx playwright install chromium
PROMO_EMAIL=... PROMO_PASSWORD=... npm run scenes [filter]   # one .mp4 per scene -> scenes/mp4/ (+ final-state .png in scenes/png/)
```

Credentials are read only from the environment; nothing is stored in files. Optional overrides: `PROMO_WEB` (default `https://mostrador-io.onrender.com`), `PROMO_API`, `PROMO_TENANT` (`unpilar`), `PROMO_STORE` (`cafeteria`). Render free tier may cold-start, so the first request can take a minute. Requires `ffmpeg` on PATH.

Scenes: `m1-menu`, `m2-pedido` (phone, 405x720 @3x -> 1080x1920), `t1-vincular` (backoffice, TV pairing code), `t2-player` (linked player, 1920x1080), `b1-ordenes`, `b2-catalogo`, `b3-pantallas`, `b4-equipo`, `b5-qr` (backoffice, 960x540 @2x -> 1920x1080, still the wide layout). All H.264, 30 fps.

Scenes act on the real store: `m2-pedido` and `b1-ordenes` create real orders, and `t1`/`t2`/`b3` use a test screen named "Vitrina" (created if missing, reset before each of them; `b3` also creates and removes a "Promo del día" list). Nothing in Catálogo or Equipo is saved.

Clips are CDP screencasts started once the screen is settled and stopped 0.5 s after the last action, so they need no trimming. `rec.skip()` cuts spinner/network waits out of a clip.

## Presentation video (Remotion)

1080p / 30 fps product presentation (v3) built from `ai/apertura.mp4` and `ai/tv.mp4` (Veo, audio muted), the real clips in `scenes/mp4/*.mp4` and `ai/musica.mp3`.

```
npm run studio   # preview in Remotion Studio
npm run render   # -> out/mostrador-presentacion.mp4 (H.264, exactly the music length, 71.37 s)
```

Both scripts first copy the media into `public/` (gitignored) via `scripts/prepare-media.mjs`.

The video length and every section cut are anchored to the beats of `ai/musica.mp3` (table at the top of `src/Presentacion.tsx`); the music plays under the whole video with fades. `t1-vincular` and `b4-equipo` are masked in the composition because the recordings show a screen link token and the owner's email; re-check the masks if those scenes are re-recorded.
