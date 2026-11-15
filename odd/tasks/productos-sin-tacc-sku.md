# Products: gluten-free flag and SKU

Branch: `feat/productos-sin-tacc-sku` (from `develop` @ origin/develop, 2026-11-15).

## Objective
Let the owner mark a product as "Sin TACC" (gluten-free) and give it a SKU; show the "Sin TACC" badge in the public menu.

## Why
Requested by the user: celiac customers need to spot gluten-free products, and the business needs a stable product code.

## Scope
- In: `gluten_free` boolean and `sku` on products (DB, backend entity/DTO/repository/use cases, public catalog), backoffice product editor (switch + SKU field), "Sin TACC" badge in the menu card and detail sheet, docs.
- Out: showing the SKU to customers, bulk SKU import, backfilling SKUs (the user fills existing products by hand).

## Decisions (validated by the user, 2026-11-15)
1. SKU unique per tenant (not per store).
2. SKU required on create and on update via API/backoffice.
3. Existing products have no SKU; the user adds them manually. Therefore the DB column stays nullable for now (a NOT NULL constraint would fail on existing rows); the API enforces "required". A later script can add NOT NULL once every product has one.
4. Uniqueness is case-insensitive and trimmed (`lower(sku)`), via a partial unique index ignoring NULLs (and soft-deleted rows if products use soft delete).
5. Duplicate SKU → 409 `SKU_ALREADY_EXISTS`.

## Constraints
- TDD: on (global CLAUDE.md, strict). Backend: jest + `tsc --noEmit -p .` in `backend/`; mobile: jest + `tsc --noEmit` in `mobile/` (run via `node node_modules/...` if npm/npx are not on PATH).
- DB changes only via a new idempotent SQL script (`database/scripts/003_...sql`); every column and index commented.
- Delivery: ~350 authored lines forecast, single PR to `develop`.

## Tasks
- [x] T1 DB + backend + mobile + docs in one work unit. Route: delegated (writer trigger: 2+ non-trivial files).

## Acceptance criteria
- Creating/updating a product without SKU → 400; duplicate SKU in the same tenant (any store, any case) → 409; same SKU in another tenant → OK.
- `gluten_free` defaults to false; public catalog returns it; menu shows "Sin TACC" badge only when true.
- Backoffice editor has the switch and the SKU field; editing an existing product without SKU requires filling it.
- Backend and mobile tsc + tests pass; `docs/api.md` and `docs/testing.md` updated.

## Progress
- T1: done. Commits 2df0923 (db + backend + docs), 226cf03 (mobile). Authored lines: 237 added + 36 deleted = 273 (tests and docs included).
  - Checks: backend jest 43 suites / 407 tests pass, `tsc --noEmit -p .` ok; mobile jest 20 suites / 231 tests pass, `tsc --noEmit` ok. RED observed first in backend (9 failing) and mobile (3 failing).
  - Badge uses the official `mobile/assets/images/frontend/sin-tacc.png` (card 22x24, sheet 29x32).
  - Script `003_products_gluten_free_sku.sql` not run against any DB.
