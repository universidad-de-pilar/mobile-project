# Video de presentacion v3

## Objetivo
Rehacer el video promocional (71 s, `promo/ai/musica.mp3`) con los cambios desde la v2, bajo la idea central: el tiempo que el cliente pasa en el local deja de ser tiempo perdido.

## Alcance
- Capturas Playwright contra el entorno desplegado (`https://mostrador-io.onrender.com`, local `cafeteria`). Se permite crear pedidos, productos, listas y vincular pantallas.
- Credenciales solo por variables de entorno (`PROMO_EMAIL`, `PROMO_PASSWORD`); nunca en archivos.
- Composicion Remotion nueva anclada a los beats de la musica.
- Videos IA nuevos (Veo) en `promo/ai/`: `apertura.mp4`, `mesa.mp4`, `tv.mp4`, `cierre.mp4` (los genera el usuario).

## Guion (71 s)
1. Apertura IA (espera) -> "¿Cuánto tiempo pasa tu cliente esperando?"
2. Giro: "Que no sea tiempo perdido."
3. Menu digital real (celular): encabezado, buscador/categorias, sin TACC, detalle con cantidad, barra de carrito, confirmar.
4. IA mesa/TV -> grabacion real del player a pantalla completa (reemplaza `ai/pantalla-player.png`).
5. Backoffice real: ordenes y estados, catalogo (buscador, SKU, sin TACC, vista compacta), vincular TV con codigo, listas y horarios, Equipo, QR descargable.
6. Cierre IA -> outro.

## Restricciones
- No se modifica la app.
- TDD: no aplica (guiones de captura y composicion visual).

## Tareas
- [x] T1 Capturas contra el entorno desplegado (ruta: delegado, 2+ archivos de `promo/capture/`). `npm run scenes` graba 9 escenas (m1-menu, m2-pedido, t1-vincular, t2-player, b1-ordenes, b2-catalogo, b3-pantallas, b4-equipo, b5-qr) en `promo/scenes/mp4/`, 6-13 s cada una. Sin buscador en el menu desplegado (m1 recorre categorias y el producto sin TACC).
- [x] T2 Composicion Remotion de 71 s anclada a beats (ruta: delegado, 2+ archivos de `promo/src/`). Grilla de ~110 bpm detectada por energia de `musica.mp3`; cortes en la tabla `BEATS` de `Presentacion.tsx`. Mascaras sobre el link con token (t1) y el email del dueño (b4).
- [x] T3 Render y revision visual (ruta: inline). `npm run render`: 2141 cuadros (71.37 s, igual a la musica), 1080p. Revisado con hoja de contactos y cuadros de privacidad; `tsc --noEmit` OK.

## Progreso
- Rama `feat/video-presentacion-v3`.
- Videos IA: solo `apertura.mp4` y `tv.mp4`. El cierre usa un collage de clips reales en vez de video IA.
- A difuminar en la edicion: link con token de pantalla en t1-vincular y email del dueño en b4-equipo.
- TV real: lista "Cafeteria - Unpilar" (video institucional + 4 imagenes).
