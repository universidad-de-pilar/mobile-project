# Reusable playlists with schedules for screens

Branch: `feat/playlists-pantallas` (from `develop`).

## Objective
Replace per-store screen content with a tenant-wide media library and reusable playlists. Each playlist can be assigned to screens of any store in the tenant, as the screen's default or in a weekly time slot.

## Problem / why
Today the content (`content_items`) lives per store, and every screen of the store plays the same list. Content cannot be reused across stores or screens, and it cannot change by time of day.

## Decisions (user, 2026-11-03)
- Scope is the tenant. The media library and playlists are shared across stores, and a playlist can go to screens of any store in the tenant.
- A screen has one default playlist (optional) plus zero or more weekly slots (days of week + start/end time).
- Slots of the same screen must not overlap, and the backend rejects overlaps. Outside every slot, the default plays. No priorities.
- Slots do not cross midnight (`end_time > start_time`).
- The player picks the active slot with its own local clock. The backend sends the default plus all slots with their items. No store timezone is added. Offline keeps working with the cached payload.
- Existing content data is discarded (dev data only). The schema changes in place; there is no data migration.
- An image's duration is set per playlist item. The same media can appear several times in a playlist. Videos use their real duration.

## Scope
- In:
  - DB schema
  - backend modules (library, playlists, screen schedule, player payload)
  - player selection logic
  - backoffice UI (library, playlists, playlist editor with a "Screens" section, screen schedule)
  - docs (`docs/api.md`, `docs/modelo-datos.md`, `docs/testing.md`)
- Out:
  - slots that cross midnight
  - specific dates
  - priorities
  - store timezone
  - realtime push

## Data model
- `media_items` replaces `content_items` and has no `store_id`. Columns: `media_id`, `tenant_id`, `type` ('image'|'video'), `file_path`, `original_name`, `mime_type`, `size_bytes`, `duration_seconds` (the real duration for videos, null for images), and timestamps.
- `playlists`: `playlist_id`, `tenant_id`, `name` (trimmed, 1-80 chars), timestamps.
- `playlist_items`:
  - `playlist_item_id`, `playlist_id` (FK, cascade on delete), `media_id` (FK, restrict on delete), `position`.
  - `duration_seconds`: required for images (3-60), null for videos.
- `screen_playlists`:
  - `screen_playlist_id`, `screen_id` (FK, cascade), `playlist_id` (FK, cascade).
  - `days`: smallint bitmask, Mon=1 … Sun=64; null means default.
  - `start_time` and `end_time` (TIME); null means default.
  - CHECK: either all three schedule fields are null (default), or `days > 0 AND end_time > start_time`.
  - A partial unique index allows one default per screen.
- Permissions: library and playlists use `content:read|create|update|delete`. Assigning playlists to screens uses `screens:update`.

## Player payload
`GET /player/:token/playlist` returns `{version, poll_interval_seconds, store, qr_url, default: {items} | null, slots: [{days, start, end, items}]}`, where each item is `{media_id, type, url, duration_seconds}`. ETag/304 stays as it is.

## Constraints
- Every query is scoped by `tenant_id` from `@CurrentTenant()`. Assigning a playlist to a screen requires both to belong to the tenant.
- Schema changes go only through the idempotent SQL in `database/scripts/` (no migrations). Every new important column and every index gets a short comment. Seeds in `database/seeds/dev_local1.sql` are updated.
- The existing hexagonal layout is followed (`api/`, `application/`, `domain/`, `infraestructure/`).
- TDD: on (source: global CLAUDE.md), for behavior only (use cases, domain rules, the player's `activeItems`).
  - Backend: run from `backend/`: `npx jest --rootDir . --modulePaths "<rootDir>"`, plus `npx tsc --noEmit -p tsconfig.json`.
  - Mobile: run from `mobile/`: `npm test`, plus `npx tsc --noEmit`.
- RDD: off (global).
- Artifacts are in English. Commits are in Spanish with conventional prefixes and no AI attribution.
- Do not commit `backend/.env.example`, `.claude/` or `docs/mostrador_figma/` (pre-existing local changes).

## Tasks
- [x] T1 Schema plus backend library and playlists:
  - SQL for `media_items`, `playlists` and `playlist_items`.
  - Rework the `content` module into a tenant-wide library (upload, list, delete with a 409 when the media is in use).
  - CRUD for playlists, and `PUT /playlists/:id/items` (order and durations).
  - Tests: use cases, tenant isolation, blocked delete, duration validation.
  - Route: delegated (writer trigger).
- [x] T2 Screen schedule and player payload:
  - SQL for `screen_playlists`.
  - `GET` and `PUT /screens/:id/schedule` (default plus slots, overlap validation as a pure domain function).
  - `GET /playlists/:id/screens` for the editor's "Screens" section.
  - Rework `GetPlaylistUseCase` to the new payload.
  - Tests: overlap rules, the payload builder, tenant checks.
  - Route: delegated.
- [x] T3 Player: a pure `activeItems(payload, now)` in `mobile/src/lib/playlist-rules.ts` (slot boundaries, day of week, default fallback, no default and no slot means empty), wired into `use-player.ts` and the cache. Tests in `playlist-rules.test.ts`. Route: delegated.
- [x] T4 Backoffice UI:
  - Library screen.
  - Playlists list and editor (add from the library, reorder, durations, a "Screens" section to assign as default or in a slot, on screens of any store).
  - Screen schedule view and editor.
  - Replace the old `contenido.tsx` and the API client calls.
  - Route: delegated.
- [ ] T5 Docs: `docs/api.md` (§7, §8, §10), `docs/modelo-datos.md`, and the cases in `docs/testing.md`. Route: delegated with each task.
- [x] T6 Simplified screens UX (frontend only, existing API):
  - Pantallas home with tabs Pantallas / Listas / Imágenes y videos; screen cards show "Ahora: <lista>" and thumbnails computed client-side from schedule + clock.
  - Screen detail replaces the agenda: "Siempre muestra", "Horarios especiales" (modal sheet, day shortcuts, 30-min time picker, delete confirmation), collapsed "Conectar al televisor", autosave with Guardado/error indicator and revert on error.
  - List editor: add by upload or from the library, thumbnails, Stepper durations, arrows, debounced autosave, inline rename, "Se muestra en" checklist (sets/clears the screen's default), special schedules read-only, delete with confirmation.
  - Media tab: grid, upload, delete with confirmation and in-use message.
  - First-use shortcut on an empty screen: upload, auto-create list named after the screen, set as default.
  - Dead code removed (`agenda/[id]`, `playlists`, `biblioteca`, `playlist-screens`, `slot-form`). Permissions kept (`content:*`, `screens:update`).
  - TDD for new pure helpers in `schedule-rules.ts`. `docs/testing.md` cases PL-40..45 replaced.
  - Route: inline by the single writer (user brief).

## Acceptance
- Media is uploaded once and reused in many playlists.
- A playlist can be assigned to screens of different stores in the tenant.
- A screen plays the slot playlist during its slot and the default outside it. Overlapping slots are rejected.
- An image's duration differs per playlist item.
- Other tenants' data is never visible or assignable.

## Delivery
The forecast exceeds about 400 authored lines, so the work goes as one work-unit commit per task on the feature branch. Integration into develop with a squash is the user's decision.

## Progress
- T6 done (inline, single writer). Autosave on screen detail (optimistic PUT, revert on error) and list editor (600 ms debounce, flush on leave). Cards compute "Ahora" client-side with `activePlaylistId`.
- T4 done (route: delegated writer). Screens in `pantallas/`: `biblioteca`, `playlists`, `playlist/[id]` (editor + `PlaylistScreens`), `agenda/[id]`; old `contenido.tsx` and `/content/:id` PATCH / `/content/order` client calls removed. Store picker for assignment uses `me.stores` + `GET /screens?store_id=` (no backend change needed). Not run in a browser.
- T3 done (route: delegated writer). Slot with empty playlist falls back to default (decision).
- Branch created. Feature document created.
- T2 done (route: delegated writer). `GET`/`PUT /screens/:id/schedule`, overlap as pure domain function `slotsOverlap`/`findOverlap`, `GetPlaylistUseCase` reworked to `default` + `slots` payload. Empty slot playlists are sent with `items: []` (player decides). Caps added as safeguards: 100 items per playlist, 50 slots per screen.
- T1 done (route: delegated writer). Library at `/content` (GET, POST, DELETE with 409 `MEDIA_IN_USE`); playlists CRUD, `PUT /playlists/:id/items`, `GET /playlists/:id/screens` at `/playlists`. Schema script edited in place with all four tables (the `screen_playlists` DDL lands here because it is one script; its code is T2). `GetPlaylistUseCase` stubbed to `default: null, slots: []` so the tree compiles until T2.

## Evidence
- T6 RED: `schedule-rules.test.ts` 13 failed / 14 passed (new helpers missing), `content-rules.test.ts` `itemsPayload` failed. GREEN: 19 suites / 210 tests, `tsc --noEmit` and `expo lint` clean. Routes now `pantallas/index` (tabs), `pantalla/[id]`, `lista/[id]`. Not run in a browser or against the API. Commit `62b18c2`.
- T4 RED: `schedule-rules.test.ts` suite failed (missing module). GREEN: 19 suites / 214 tests, `tsc --noEmit` and `expo lint` clean. UI is markup (no tests); manual cases PL-41 to PL-45.
- T3 RED: `playlist-rules.test.ts` 14 failed / 19 passed (`activeItems` missing, old payload shape). GREEN: 18 suites / 198 tests, `tsc --noEmit` and `expo lint` clean. `PlayerState` gained `items` (active list); `advance` re-evaluates `activeItems` with the local clock, a slot change restarts at item 0; an idle player (nothing to play) re-checks every 15 s. Commit `4ab67ba`.
- T1 commit `3660989`.
- T2 RED: `screen-schedule.spec.ts` suite failed to compile (missing modules) and `get-playlist.use-case.spec.ts` 10 failed. GREEN: 40 suites / 367 tests, `tsc --noEmit` clean. Schedule SQL (default + slots insert with `unnest` and tenant `JOIN`, ordering, other tenant sees nothing, unique default, CHECK, playlist delete cascades) run on the scratch Postgres DB via psql PREPARE/EXECUTE with untyped params. Commit `c7fdffd`.
- T1 RED: `content.use-cases.spec.ts` 11 failed + `playlists.use-cases.spec.ts` suite failed to compile (missing module). GREEN: 39 suites / 329 tests, `tsc --noEmit` clean. Schema applied twice on a scratch Postgres DB (idempotent); repository SQL (`findMany`, `unnest ... WITH ORDINALITY` insert, `listItems`, RESTRICT 23503, CHECK and unique position) run via psql PREPARE/EXECUTE. Commit: see git log (`feat(pantallas): se agrega biblioteca de medios y playlists por tenant`).

## Next step
T5 docs remainder and integration (user decision).
