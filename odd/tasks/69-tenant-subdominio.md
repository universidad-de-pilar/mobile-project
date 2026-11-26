# #69: Tenant resolution by subdomain (RF-001, RF-002)

- Issue: #69
- Branch: `feature/69-tenant-subdominio` (stacked on `feature/78-esquema-r1`, which is not merged yet)
- TDD: on (user CLAUDE.md, behavior modules only). Runner: `npx jest --rootDir . --modulePaths "<rootDir>"` in `backend/`.
- Delivery strategy: ask-on-risk. Forecast: about 250 to 350 authored lines.

## Objective
Resolve the tenant from the `Host` subdomain or the `X-Tenant-Slug` header (`docs/api.md` §1.2), align `TenantOrmEntity` with the DB, and open CORS for tenant subdomains.

## Scope
- Slug validation (format + reserved `www`, `api`, `app`, `admin`) as domain logic with tests.
- `TenantMiddleware`: Host `{slug}.{BASE_DOMAIN}` first, `X-Tenant-Slug` only when Host has no usable slug; 404 `TENANT_NOT_FOUND` when missing, reserved, invalid, or inactive. Skips `/auth/*`.
- `TenantOrmEntity`: `name` varchar(150) without UNIQUE, add `slug`, `last_order_number`.
- CORS for `*.localhost` and `*.mostrador.io`, allowed headers `Authorization`, `Content-Type`, `X-Tenant-Slug`, `If-None-Match`; exposes `ETag`.
- `docs/testing.md` cases for RF-001/RF-002.

Out of scope: `users_tenants` membership guard and `tenant_id` in repositories (later cards), `/media` static serving.

## Tasks
- [x] T1: slug rules + middleware + ORM entity + CORS + tests + docs (route: delegated writer; trigger: 2+ non-trivial files)

## Acceptance (from issue)
- Slug unique, rejects `www`, `api`, `app`, `admin`.
- `local1.localhost` resolves in dev, `local1.mostrador.io` in prod.
- Unknown subdomain returns a clear error.
- Middleware resolves from Host or `X-Tenant-Slug`.
- ORM entity aligned with DB.
- CORS as above.

## Progress
- Branch created.
- T1 done (delegated writer): `tenant-slug.ts` (pure slug rules), `api/tenant.middleware.ts` (applied to `*` except `auth/{*path}`), `findBySlug` in port and adapter, ORM entity aligned, CORS in `main.ts`, `BASE_DOMAIN` in `.env.example`, docs updated.
- Deviation: middleware reads `process.env.BASE_DOMAIN` (ConfigService breaks under Jest here); `ConfigModule.forRoot` still loads `.env`.

## Evidence
- RED: both new suites failed with "Cannot find module" before implementation.
- `npx jest --rootDir . --modulePaths "<rootDir>"`: 15/15 suites, 81/81 tests (parent re-ran it).
- `npx tsc --noEmit`: clean. ESLint: not usable (existing CRLF/prettier errors repo-wide).
- Temporary route probe: `/auth/login` not gated, `/products` 404 without tenant, `local1.localhost` 200, `X-Tenant-Slug` works on an IP host.

## Open points
- Tenant create use case does not take `slug` yet (NOT NULL in 002); no controller exposes it in R1 (`docs/api.md` §15 row 6).
- `/products` (in-memory EduKit module) is now tenant-gated.
- `users_tenants` membership guard and `/media` serving remain for later cards.
