# Video promocional de Mostrador

## Objetivo
Video promocional de al menos 1 minuto que recorra la app completa (autopedido, backoffice y pantallas), armado con Remotion a partir de grabaciones reales de la app levantada en local.

## Alcance
- `promo/capture/`: script Playwright que recorre la app (tenant `local1`, local `palermo`) y graba clips.
- `promo/`: proyecto Remotion que combina los clips con textos, transiciones y la marca (tokens de `mobile/src/components/ui/mostrador/tokens.ts`).
- Los clips grabados y el MP4 final no se versionan (son binarios regenerables).

## Restricciones
- No se modifica el codigo de la app.
- Datos de demo: seed `database/seeds/dev_local1.sql`.
- TDD: no aplica (no hay logica de dominio; son guiones de captura y composicion visual).

## Tareas
- [x] T1 Levantar backend + web y verificar datos de demo (ruta: inline). La web debe abrirse en `http://local1.localhost:8081` (tenant por subdominio, CORS solo 8081 y *.localhost).
- [x] T2 Script de captura Playwright de todos los flujos (ruta: delegado, 2+ archivos). `npm run capture` genero los 5 clips (autopedido-mobile, backoffice-ordenes, backoffice-catalogo, backoffice-pantallas, pantalla-player) con PNG del estado final revisados.
- [x] T3 Proyecto Remotion con escenas de 60s o mas (ruta: delegado, 2+ archivos). Enfoque cambiado a video de presentacion: dispositivos dibujados en CSS con los clips reales y 2 videos de Veo (apertura y cierre en `promo/ai/`).
- [x] T4 Render del MP4 y revision visual (ruta: inline). `npm run render` genera `out/mostrador-presentacion.mp4`: 71 s, 1080p, 30 fps, con audio. Sin cuadros negros y con todas las secciones revisadas.

## Criterios de aceptacion
- MP4 de 60 s o mas, 1080p, que muestra autopedido (catalogo, carrito, confirmacion, pedido registrado), backoffice (login, ordenes, catalogo, alta/edicion de producto, pantallas, contenido, ajustes) y el reproductor de pantallas.
- Se regenera con `npm run capture` y `npm run render` dentro de `promo/`.

## Progreso
- Rama `feat/video-promocional`.
- T1 y T2 cerradas. Pendiente para la version final: fotos en todos los productos del seed y nombre legible en el contenido de pantallas (hoy muestra el UUID del archivo).
- Cada corrida de captura registra un pedido real en la base de desarrollo.
- Capturas fijas para Veo (`npm run stills`): celular 1215x2160 (9:16), escritorio y reproductor 3840x2160 (16:9), dimensiones verificadas.
- Clips por escena del guion (`npm run scenes`), recortados a MP4 en `promo/scenes/mp4/` sin la carga inicial. Los clips de celular se graban a 540x960 y se escalan a 1080x1920.
- El clip `backoffice-ordenes` ahora termina con el pedido en estado "lista".
- Cada grabacion corre antes `npm run reset` (`promo/sql/reset_demo_orders.sql`): borra los pedidos de local1/palermo, rebobina `tenants.last_order_number` y borra las copias de "Promo hamburguesa". El pedido de la escena vuelve a ser #1.
- Las escenas se graban con screencast CDP: celular a 405x720 @3x reducido a 1080x1920 y escritorio a 1920x1080, en MP4 30 fps y sin carga inicial. Ya no hace falta recortarlas a mano.
- Se regrabo todo con las fotos nuevas del catalogo.
- Pendiente: el logo es provisorio (wordmark tipografico; los iconos de la app son los de Expo), falta el contenido de pantallas todavia muestra un UUID como nombre.
- Musica: `promo/ai/musica.mp3` (Suno, 71 s, igual que el video) al 60 % con fades cortos.
- Rama `feat/video-presentacion-v2`: el video se actualizo a la app nueva. Autopedido muestra el detalle de producto con cantidad (s3 y s4, still `02b-detalle-producto`). Pantallas muestra listas reutilizables (`s7a-lista`) y horarios (`s7c-horario`), y el TV sigue con `ai/pantalla-player.png`.
- `reset_demo_orders.sql` ahora borra las listas "Promo del dia"/"Desayunos" (con sus items y horarios por cascada) y el medio "Promo hamburguesa" que crean las escenas; ya no toca `content_items` (tabla eliminada). Las listas y medios creados a mano no se tocan.
- Las escenas de pantallas se graban a 960x540 @2x para que la UI llene el marco del laptop; `rec.skip()` recorta las esperas de red (spinners) del screencast.
- Duracion final ~71 s (musica de 71.4 s): se aceleraron ordenes (1.2x) y catalogo (1.3x) y se acortaron intro, problema, cierre y outro para dar lugar a la seccion nueva.
