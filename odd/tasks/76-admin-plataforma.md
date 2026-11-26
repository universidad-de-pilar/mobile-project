# #76 (partial, pulled into R1): platform admin (root)

Branch: `feature/76-admin-plataforma` (from `develop`).

## Objective
Remove the need for the dev seed: the first user who registers on the `admin` host becomes `root`. Root administers the whole platform: creates tenants for new businesses (with their first store and owner) and can operate any tenant with every permission.

## Why
User decision (2026-10-28): "el primer user que se registre es admin, asi no aplicamos un seed"; "el slug debe ser admin, para acceder a un panel admin"; "un admin puede administrar todo, de hecho es quien crea los tenants para los comercios nuevos".

## Scope
- In:
  - Tenant middleware recognizes the reserved `admin` slug as the platform context (no tenant), instead of 404.
  - `POST /auth/register` on `admin`: if no root exists, the user gets the `root` role; afterwards registration on `admin` is refused.
  - Root bypasses the membership guard and the permissions guard on any tenant.
  - `GET /tenants`, `POST /tenants` (tenant + first store + owner link), `PATCH /tenants/:tenantId` (`name`, `is_active`), root only.
  - `GET /me` on `admin` for root.
  - Idempotent SQL script for `tenants:*` permissions granted to `root`, if needed.
  - Docs: `docs/api.md` (move these from section 14 into R1), `docs/testing.md`, `backend/http/` admin file.
- Out: 503 maintenance for suspended tenants on public routes, employees, metrics, admin UI.

## Constraints
- TDD: on (global CLAUDE.md). Runner from `backend/`: `npx jest --rootDir . --modulePaths "<rootDir>"`; typecheck `npx tsc --noEmit -p tsconfig.json`.
- DB changes only via idempotent SQL scripts with comments (never migrations).
- RDD: off.

## Tasks
- [x] T1 Platform admin: middleware `admin` context, first-register root, root bypass in guards, `/tenants` GET/POST/PATCH, `/me` for root, SQL script, docs, http file. Route: delegated (writer trigger, 2+ non-trivial files).

## Progress
- Feature document created.
- T1 done: commit `51e631c` (RED 25 failing tests, GREEN 289 tests, tsc clean) + `2ab65f5` (parent: root receives every permission in `003` so `/me` reflects "administers everything"). Single root via `pg_advisory_xact_lock` in `createRoot`. `003` also adds `tenants.created_at`. Legacy tenant use cases removed.
- Not run against a database or live server.

## Next step
Squashed into `develop` (user request). Next: `npm run db:apply` locally, then exercise `backend/http/admin/admin.http`.
