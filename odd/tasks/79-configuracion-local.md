# #79: Store configuration (RF-003, RF-004, RF-033)

Branch: `feature/79-configuracion-local` (from `develop`).

## Objective
Backoffice endpoints from `docs/api.md` section 4: `GET /stores`, `GET /stores/:storeId` and `PATCH /stores/:storeId`, returning the `Store` schema plus `self_order_url`.

## Scope
- In: backend only (same decision as #43/#51/#80). The `stores` table, its slug constraints and the `stores:read`/`stores:update` permissions already exist in `002_mostrador_r1.sql`, so no SQL script is needed.
- Out:
  - Backoffice UI: blocked by #20 (login) and #14 (navigation). The "360 px" criterion (RNF-007) moves to the UI issue.
  - `POST /stores` and slug editing: R2 (`docs/api.md` 4: the slug is part of printed QRs). Slug validity and per-tenant uniqueness are guaranteed by `ck_stores_slug_format`, `ck_stores_slug_reserved` and `uq_stores_tenant_slug`.
  - The supertest/e2e harness, which does not exist yet.

## Constraints
- The tenant comes only from `@CurrentTenant()`. Every query is scoped by `tenant_id`; a store of another tenant returns 404 `STORE_NOT_FOUND`.
- PATCH: all fields optional, at least one. `name` 1-150, `address` up to 255 or null, `phone` up to 50 or null, `whatsapp_number` E.164 `^\+[1-9][0-9]{7,14}$` or null. 400 message mentions the international format. `slug` and `is_active` are not updatable.
- `self_order_url` = `WEB_ORIGIN_TEMPLATE` with `{slug}` replaced by the tenant slug, + `/` + store slug (same template as `player_url` in #80). Added to the `Store` schema in `docs/api.md`.
- Orders without `whatsapp_number` are already handled by #55 (no `wa.me`); nothing to change.
- TDD: on (source: global CLAUDE.md). Run from `backend/`: `npx jest --rootDir . --modulePaths "<rootDir>"`.
- RDD: off (global).

## Tasks
- [x] T1 `stores` module: `ListStores`, `GetStore`, `UpdateStore` use cases, repository (interface + Postgres), `self_order_url` builder, DTOs, `StoresController` with `stores:read`/`stores:update`, registered in `AppModule`; `docs/api.md` and `docs/testing.md` updated. Route: delegated (writer trigger, 2+ non-trivial files).

## Acceptance (from issue)
- The single store of the tenant can be viewed and edited.
- The store slug is valid and unique within the tenant (DB constraints; not editable in R1).
- The self-order URL including the store slug is shown.
- The WhatsApp number can be saved and edited with format validation.
- Without a number, orders are still registered (covered by #55).
- Data is scoped to the user's tenant.
- 360 px: out of scope (no UI).

## Delivery
Forecast is about 300 authored lines on one feature branch, integrated into develop with a local squash, as in #80.

## Progress
- Branch created.
- T1 implemented (uncommitted): `backend/src/stores/` (list/get/update use cases, Postgres repository, DTO, controller, module in `AppModule`), `backend/test/stores/stores.use-cases.spec.ts`, `docs/api.md` (`self_order_url`) and `docs/testing.md` (#79 section, TC-104, traceability).
- Added `EMPTY_UPDATE` (400) for a PATCH without fields. Unknown fields (`slug`, `is_active`) are dropped by the global `ValidationPipe` (`whitelist: true`).

## Evidence
- RED: new spec failed to run (`Cannot find module 'src/stores/application/get-store.use-case'`), 1 suite failed, 198 existing tests passed.
- GREEN: `npx jest --rootDir . --modulePaths "<rootDir>"`: 30 suites / 205 tests passed (7 new).
- `npx tsc --noEmit -p tsconfig.json`: clean.

- Commit `feat(locales): ... ref #79` (T1). Parent re-ran the full suite: 30 suites, 205 tests passed.

## Next step
The user decides the squash into develop.
