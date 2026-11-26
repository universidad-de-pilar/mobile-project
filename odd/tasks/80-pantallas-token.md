# #80: Screen registration with token (RF-020)

Branch: `feature/80-pantallas-token` (from `develop`).

## Objective
Backoffice endpoints from `docs/api.md` section 8: `GET /screens?store_id=` (list the store's screens) and `POST /screens` (create a screen with its own token), both returning the `Screen` schema including `player_url`.

## Scope
- In: backend only (user decision 2026-10-28, same as #43/#51). The `screens` table, `uq_screens_token` and the `screens:read`/`screens:create` permissions already exist in `002_mostrador_r1.sql`, so no SQL script is needed.
- Out:
  - Backoffice UI: blocked by #20 (login) and #14 (navigation). The "360 px" criterion (RNF-007) moves to the UI issue.
  - `PATCH /screens/:screenId` and token regeneration (R2, TC-060).
  - The supertest/e2e harness, which does not exist yet.

## Constraints
- The tenant comes only from `@CurrentTenant()`. Every query is scoped by `tenant_id`.
- A `store_id` that is not in the tenant returns 404 `STORE_NOT_FOUND` (`tenantRepository.isStoreOfTenant`). `store_id` is a required UUID in the list query.
- Token: `crypto.randomBytes(32).toString('base64url')` (43 chars), stored in plain text (`docs/modelo-datos.md` 6.4). Single INSERT, no collision retry (2^256 space; `uq_screens_token` still guards).
- `name`: trimmed, 1-80 chars. Duplicate names are allowed.
- `player_url` = `WEB_ORIGIN_TEMPLATE` with `{slug}` replaced by the tenant slug, + `/screen/` + token.
- The list includes inactive screens (the backoffice manages them), ordered by `created_at`.
- Errors are Nest exceptions with `{statusCode, message, error, code}`.
- TDD: on (source: global CLAUDE.md). Run from `backend/`: `npx jest --rootDir . --modulePaths "<rootDir>"`.
- RDD: off (global).

## Tasks
- [x] T1 `screens` module: token generator, `player_url` builder, `ListScreens` and `CreateScreen` use cases, repository (interface + Postgres), DTOs, `ScreensController` with `screens:read`/`screens:create`, registered in `AppModule`. Route: delegated (writer trigger, 2+ non-trivial files).
- [~] T2 docs: `docs/testing.md` done (TC-059 at use-case level, new #80 section). `WEB_ORIGIN_TEMPLATE` in `.env.example` NOT added: reads/edits are blocked by a deny rule; the parent must add `WEB_ORIGIN_TEMPLATE=http://{slug}.localhost:8081`. Route: delegated with T1.

## Acceptance (from issue)
- A screen can be created and each one gets its own token.
- The created screen's player URL is shown.
- The store's screens are listed.
- Data is scoped to the user's tenant.
- 360 px: out of scope (no UI).

## Delivery
Forecast is about 300 authored lines on one feature branch, integrated into develop with a local squash, as in #43/#51/#55.

## Progress
- Branch created.
- T1 done by one delegated writer (uncommitted): `backend/src/screens/` (domain: repository, errors, `screen-player.ts` token and `player_url`; use cases `CreateScreen` and `ListScreens` taking the `Tenant`; Postgres repository; DTOs; `ScreensController`; module), registered in `AppModule`.
- T2 partial: `docs/testing.md` updated; `.env.example` blocked (see T2).

## Evidence
- RED: with only `test/screens/screens.use-cases.spec.ts` written, jest gave "1 failed, 28 passed" (Cannot find module `create-screen.use-case`).
- GREEN: full suite 29 suites, 198 tests passed (192 before, +6 new). `npx tsc --noEmit -p tsconfig.json` clean.

- Commit `87c4531` (T1 + T2 docs). Parent re-ran the full suite: 29 suites, 198 tests passed.

## Next step
The user adds `WEB_ORIGIN_TEMPLATE=http://{slug}.localhost:8081` to `backend/.env.example` (the deny rule blocks agents), then integrates into develop with a squash.
