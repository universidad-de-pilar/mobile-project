# R1 remaining backend (#70, #71, #21, #80, #45, #73)

## Objective
Close every backend gap between `docs/api.md` and the code before the R1 demo (02/11), then leave `.http` files under `backend/http/` to exercise every R1 endpoint.

## Problem
The contract defines 32 R1 endpoints. Missing in code: `/content` (5), `GET /player/:token/playlist`, `GET /me`, `PATCH /screens/:screenId`. Critical-rule tests (#45) and the §15 cleanup (#73) are also pending.

## Scope
- In: backend only, following the module layout of `screens`, `products` and `stores` (api / application / domain / infraestructure).
- Out: UI, R2 items (#49, #75, #76, #77), supertest/e2e harness.

## Constraints
- Tenant only from `@CurrentTenant()`; every query scoped by `tenant_id`.
- Schema already exists in `database/scripts/002_mostrador_r1.sql` (`content_items`, `screens`); no SQL unless a gap appears (then an idempotent script, never a migration).
- Video duration via `ffprobe` (installed on the dev machine).
- TDD: on (source: global CLAUDE.md). Runner from `backend/`: `npx jest --rootDir . --modulePaths "<rootDir>"`. Typecheck: `npx tsc --noEmit -p tsconfig.json`.
- RDD: off (global, as in previous features).
- Planning heuristic ~400 authored lines per task; advisory only.

## Delivery
One branch per issue, each created from the previous one (stacked) so they can be squashed into `develop` in order. The user decides the squashes.

## Tasks
- [x] T1 #70 `/content`: GET, POST (multipart, real-type validation, 5 MB image / 50 MB video, ffprobe duration ≤ 60 s), PATCH, PUT `/content/order`, DELETE (file removed, order compacted). Branch `feature/70-contenido-pantalla`. Route: delegated (writer trigger).
- [x] T2 #71 `GET /player/:token/playlist`: public, token credential, ETag/304, version = SHA-256 prefix, `qr_url`, 404 `SCREEN_NOT_FOUND` uniform. Branch `feature/71-reproductor-playlist`. Route: delegated.
- [x] T3 #21 `GET /me`: user, tenant, stores, permissions. Branch `feature/21-me`. Route: delegated.
- [x] T4 #80 `PATCH /screens/:screenId`: `name` and/or `is_active`. Branch `feature/80-patch-pantallas`. Route: delegated.
- [x] T5 #45 critical-rule tests gap review (order transitions, server-side prices, tenant isolation). Branch `feature/45-tests-reglas`. Route: delegated.
- [x] T6 #73 §15 cleanup: in-memory products stub, `database/modelo_relacional.sql`, tenant_id in repositories; update §15. Branch `feature/73-alinear-contrato`. Route: delegated.
- [ ] T7 `.http` files in `backend/http/` for every R1 endpoint. Branch `feature/http-files`. Route: delegated.

## Progress
- Feature document created.
- T1 done: commit `4f6686a` on `feature/70-contenido-pantalla`. RED observed (missing module), GREEN 31 suites / 230 tests (parent re-ran), tsc clean, real ffprobe checked. New error codes not in the contract: `DURATION_NOT_ALLOWED`, `CONTENT_LIST_MISMATCH`, `CONTENT_NOT_FOUND`. Pending: repository SQL not run against a database (no e2e harness); corrupt images are not rejected (only videos via ffprobe). `DEFAULT_IMAGE_SECONDS` falls back to 10.
- T2 done: commit `455367f` on `feature/71-reproductor-playlist`. RED observed, GREEN 32 suites / 241 tests (parent re-ran), tsc clean. Shared `webOrigin` helper extracted (`src/tenants/domain/web-origin.ts`). Pending: SQL, 304 and headers not run against a live server.
- T3 done: commit `547550f` on `feature/21-me`. RED observed, GREEN 33 suites / 242 tests, tsc clean. `IUserRepository.getById` implemented (was a stub); `StoresModule` exports `STORE_REPOSITORY`.
- T4 done: commit `960652e` on `feature/80-patch-pantallas`. RED observed, GREEN 33 suites / 246 tests (parent re-ran), tsc clean.
- T5 done: commit `7f1b0a7` on `feature/45-tests-reglas`. +24 tests (transitions matrix, order DTO limits, route permissions); no bugs found. 35 suites / 270 tests.
- T6 done: commit `1d2f3be` on `feature/73-alinear-contrato`. Only `docs/api.md` changed: all repositories already scoped by tenant, stub and `modelo_relacional.sql` already gone, new error codes added to 1.4. Parent re-ran: 270 tests green. Pending outside backend: `mobile/src/lib/products.ts` still calls the old `/products`; EduKit wording left in `backend/test/roles/*.spec.ts` and `001_initial_schema.sql` header.
- T7 committed (partial): `4c1c7bb` on `feature/http-files`. One `.http` per resource under `backend/http/` (REST Client syntax, login chained per file, seed `local1` / `owner@local1.test`), samples 31 KB. Live smoke failed: local Postgres lacks the R1 schema (42703 in `tenant.middleware.ts`). No employee in seed, so no 403 request. The writer's `taskkill //F //IM node.exe` closed every node process (MCP servers dropped).

- Squashed into `develop` in order (user request): `d2cfacf` #70, `15efb42` #71, `a8c37f9` #21, `bf531ed` #80, `a592658` #45, `0545d19` #73, `5b04ab3` http. `develop` tree equals `feature/http-files`; 270 tests green, tsc clean.

## Next step
Apply `002_mostrador_r1.sql` + `database/seeds/dev_local1.sql` locally (user decision), then run the live smoke with the `.http` files.
