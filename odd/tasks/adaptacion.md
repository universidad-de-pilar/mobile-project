# Adaptacion: autopedido to the Mostrador Figma

## Objective
Make the customer self-order flow demoable on 2026-11-02: catalog -> cart -> confirmation -> saved order -> WhatsApp parts, matching the Figma file `IUW1LoR1uxB65C2ZzfZEAb` (section "Autopedido (web del cliente)", frames SO-01 to SO-04).

## Problem
The mobile app calls the Mostrador API, but its UI still has EduKit leftovers and does not match the design. There is no order-registered screen or WhatsApp button, the catalog has no category chips, and `Alert.alert` is a no-op on web, so customers see no confirmation or errors.

## Scope
- In: autopedido web and Android UI, design tokens and fonts, tenant from subdomain on web, cart persistence, WhatsApp parts, demo seed, docs.
- Added by the user after T7: backoffice (BO-01 to BO-07) and screen player (PL-01), from `docs/mostrador_figma/`.
- Out: regenerate screen token (HU-13 asks for it, `docs/api.md:712` puts it in R2, no endpoint, not in the design), screen delete, product reorder, service worker.

## Constraints
- Base: `feat/adaptacion`, from `develop`. One `feat/adaptacion-*` branch per task, squash merged into `feat/adaptacion`. No push or PR unless the user asks.
- Commits in Spanish, conventional, no AI attribution.
- Database changes only through idempotent SQL scripts.
- TDD: strict, from the global user config, for behavior modules only. Runner: `jest-expo`, added in T1 because mobile had none. Backend runner: existing `npm test`.
- Delivery: feature-branch chain, decided by the user. Forecast is above 400 lines, so each task is one slice.

## Tasks
- [x] T1 `feat/adaptacion-tema`: Mostrador tokens and fonts, rename `ui/edukit`, shared components, remove `explore.tsx`, add test runner. Route: delegated (writer trigger). Risk: medium, RDD off, no review.
- [x] T2 `feat/adaptacion-dominio`: tenant resolution, API client without fake `stock` and `bookstore`, cart rules and persistence. Route: delegated (writer trigger). Risk: medium, RDD off, no review.
- [x] T3 `feat/adaptacion-catalogo`: SO-01 with store routes and category chips. Route: delegated (writer trigger). Risk: medium, RDD off, no review.
- [x] T4 `feat/adaptacion-pedido`: SO-02, SO-03, SO-04, inline errors, WhatsApp parts, no-number message. Route: delegated (writer trigger). Risk: medium, RDD off, no review.
- [x] T5 `feat/adaptacion-demo`: demo seed with WhatsApp number, env example, README, `docs/testing.md`, browser check with an intercepted API. Route: delegated (writer trigger). Risk: medium, RDD off, no review.
- [ ] T6: run the flow against the real backend and a local database, applying the seed for the first time. Reopened from T5: blocked because this machine has no local database (no Postgres, Docker off) and `backend/.env` cannot be read.
- [x] T7 `feat/adaptacion-figma`: align SO-01 to SO-04 and shared components with the exported design in `docs/mostrador_figma/`. Route: delegated (writer trigger). Risk: medium, RDD off, no review.
- [x] T8 `feat/adaptacion-bo-base`: web output `single`, session and authenticated client, BO-01, backoffice shell, Badge, Toggle, ListRow, TopBar, TabBar. Route: delegated (writer trigger). Risk: medium, RDD off, no review. Verified by the parent: lint and `tsc` exit 0, 58 tests. Browser check with an intercepted API. Web hosting must rewrite all routes to `index.html`.
- [x] T9 `feat/adaptacion-bo-catalogo`: BO-02, BO-03 with image upload and adding categories. Route: delegated (writer trigger). Risk: medium, RDD off, no review. Verified by the parent: lint and `tsc` exit 0, 86 tests. Browser check with an intercepted API. Pending manual check: pick a real image in a real browser, because under Playwright the web picker raised a `removeChild` dev overlay, likely from the simulated upload.
- [x] T10 `feat/adaptacion-bo-ordenes`: BO-06 with status changes, BO-07. Route: delegated (writer trigger). Risk: medium, RDD off, no review. Verified by the parent: lint and `tsc` exit 0, 99 tests. Browser check with an intercepted API. The parent added 15 s polling while focused, because web had no way to see new orders without reloading.
- [x] T11 `feat/adaptacion-bo-pantallas`: BO-04, BO-05. Route: delegated (writer trigger). Risk: medium, RDD off, no review. Verified by the parent: lint and `tsc` exit 0, 117 tests. Browser check with an intercepted API, including orders polling. Design differences: up and down buttons instead of drag, and `Activa`/`Inactiva` instead of online status, because `Screen` has no last-seen field.
- [x] T12 `feat/adaptacion-reproductor`: PL-01 with polling, offline playback and QR, and `source_screen_id` from the QR in autopedido orders. Route: delegated (writer trigger). Risk: medium, RDD off, no review. Verified by the parent: lint and `tsc` exit 0, 151 tests. Browser check with an intercepted API. Pending manual checks: H.264 MP4 in real Chrome (Playwright's Chromium could not play it, WebM played), real phone scan, a real network cut.

- [x] T13 `feat/adaptacion-desktop`: desktop web layout. Backoffice: left sidebar and wider content with grids. Autopedido: wider catalog grid, centered cart, confirm and done. Requested by the user after opening the backoffice in a browser. No desktop frames exist in the design, so the layout is our decision. Route: delegated (writer trigger, 2+ non-trivial files). Risk: high by assessment, RDD off, so an independent verifier read the diff and found no defects. Squash `4e62c92`, lint and `tsc` exit 0, 151 tests. Browser check at 390, 1280 and 1920 with the real backend for login, catalog, settings and new product, and intercepted GETs for populated screens, content and orders. Pending: Android.

## Acceptance
- A customer at `local1.localhost:8081/palermo` can browse by category, build a cart that survives reload, confirm, and see order number, total and WhatsApp part buttons.
- A store without a number shows "Tu pedido fue registrado, el comercio lo verá en su panel".
- An unavailable product shows a message naming it and asks to review the cart.
- `npx tsc --noEmit`, `npx expo lint` and the mobile tests pass.

## Progress
- Squash merged `feature/azure-deploy` into `develop` as `d300f38`, local only. `feat/adaptacion` created from it.
- T1 verified by the parent: `tsc` clean, mobile tests 2 passed, writer reported backend roles 31 passed. `expo lint` has 1 error, `set-state-in-effect` in `[storeSlug].tsx:44`, pre-existing and left for T3.
- Pending check: the Figma call limit was hit in T1. Only Button/Primary, Input and ProductCard were read from the design. Button/Secondary, Button/WhatsApp, Stepper and Chips use the palette and fonts, not checked against the design.
- T2 verified by the parent: `tsc` clean, mobile tests 25 passed (RED observed by the writer before GREEN). CORS already allows `*.localhost` and `X-Tenant-Slug`. Native cart stays in memory, a known ceiling.
- T3 verified by the parent: lint exit 0, `tsc` exit 0, mobile tests 29 passed. `products/[id]` removed because HU-16 to HU-20 do not ask for a detail screen. Default product image is a "Sin foto" placeholder, decided as enough for the demo.
- Pending check: Figma call limit still active in T3, so SO-01 layout and typography are unchecked against the design, and its button label `Ver pedido · {total}` is assumed.
- T4 verified by the parent: lint exit 0, `tsc` exit 0, mobile tests 35 passed. Added beyond the frames: `Quitar` on each cart card, because HU-18 needs removal.
- Pending check: SO-02 to SO-04 unchecked against Figma because of the call limit. Assumed labels: `Continuar`, `Seguir agregando`, `Quitar`, `Volver al catálogo`, `Volver al pedido`, `Tu nombre (opcional)`, `Nota para el local (opcional)`.
- T5 verified by the parent: lint exit 0, `tsc` exit 0, mobile tests 37 passed. Browser cases a to i passed in Chromium with an intercepted API, at 390x844 and 1280x800. Bug fixed: same-tick clicks on confirm created several orders.
- Pending check: backend, seed, real CORS and database never ran with this frontend. The seed has never been applied.
- T7 verified by the parent: lint exit 0, `tsc` exit 0, mobile tests 38 passed, and screenshots of SO-01 to SO-04 read against the PNG exports, which replaced the blocked Figma calls. Decision: minus at quantity 1 removes the product, because the design has no remove button. New dependency: `@expo/vector-icons`.
- Remaining design differences: the note box does not grow on web, the focus ring is the browser's black outline, and on SO-04 the check is thinner and the order number and texts slightly larger. Exact measures come from images, so they are approximate. `docs/mostrador_figma/` stays untracked.
- Known limits: `WHATSAPP_MAX_PART_CHARS` is a constant in `whatsapp-message.ts` although `docs/api.md` lists it as an env var, so a real multi-part order needs about 30 products. The "enviado" mark is lost on reload. After a 409, "Volver al pedido" stacks history. The seed number is fake, so a real send needs a real number.

- Demo risk: the repo only has a backend deploy pipeline, nothing publishes the web app. `qr_url` comes from `WEB_ORIGIN_TEMPLATE`, so locally it points to `local1.localhost:8081`, which a phone cannot open.

- T6 partly unblocked: the user started the backend on 2026-11-01. Real `POST /auth/login` with the seed user returned 200 and the seeded catalog loaded. Only reads and login ran against it: no real write yet (create product, upload, order, status change).

## Next step
Finish T6: real writes against the backend for autopedido, backoffice and player. Android is unverified for all screens.
