# #78: R1 schema and development seed

- Issue: #78
- Branch: `feature/78-esquema-r1` (from `develop`)
- TDD: not applicable (SQL scripts and seed, no behavior module). Checks: idempotency by running `npm run db:apply` twice, the seed twice, and the existing jest suite.
- Delivery strategy: ask-on-risk. Forecast: about 400 to 500 authored lines (mostly SQL with comments).

## Objective
Create the R1 database schema (`database/scripts/002_mostrador_r1.sql`) and the development seed (`database/seeds/dev_local1.sql`), following `docs/modelo-datos.md`.

## Scope
- `002_mostrador_r1.sql`, idempotent: changes to `tenants` and `stores`; new tables `categories`, `products`, `content_items`, `screens`, `orders`, `order_items`; constraints, indexes, and a `COMMENT` on every new table, important column and index. Seeds permissions and the `root`, `owner` and `employee` roles (`docs/api.md` §12). No demo data.
- `database/seeds/dev_local1.sql`, idempotent and run by hand: tenant `local1`, its store, an owner user and a sample catalog.
- Delete `database/modelo_relacional.sql` (`docs/api.md` §15, row 10).
- Check that `synchronize` is `false`.

Out of scope: ORM entities and code (#69, #73 and later cards).

## Tasks
- [x] T1: `002_mostrador_r1.sql` + seed + delete `modelo_relacional.sql` + docs (route: delegated writer; trigger: 2+ non-trivial files and preparation reading)

## Acceptance (from issue)
- Running it twice on a clean DB and on a DB with data changes nothing on the second run.
- Applied with `npm run db:apply` and recorded in `schema_versions`.
- Follows `docs/modelo-datos.md`.
- Every new table, important column and index has a `COMMENT`.
- No ORM migrations; `synchronize: false`.

## Progress
- Branch created from `develop`.
- T1 done (delegated writer): `002_mostrador_r1.sql` (272 lines; 3 roles, 19 permissions), `database/seeds/dev_local1.sql` (tenant `local1`, store `palermo`, owner `owner@local1.test` / `Local1-dev-2026`, 3 categories, 5 products), `modelo_relacional.sql` deleted, `docs/testing.md` and `backend/README.md` updated. `synchronize` was already `false`.
- Deviation: the `slug` uniques are unique indexes instead of named constraints (simpler to make idempotent).

## Evidence
- Throwaway DB `mostrador_verify`: first `db:apply` applied 001 and 002; second run applied 0, skipped 2. The seed run twice gave identical counts. DB dropped afterwards.
- `npx jest --rootDir . --modulePaths "<rootDir>"`: 13/13 suites, 46/46 tests.
- Readback: every index created in 002 has a `comment on index`; no drop/delete/truncate.
- Not done: 002 was not applied to the dev DB `edukit`, and login with the seeded user was not tested.

## Next step
#69 (tenant with slug and middleware).
