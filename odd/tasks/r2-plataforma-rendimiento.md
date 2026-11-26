# R2 platform and performance (RF-035, RNF-017, RNF-003, RNF-002, RNF-018)

## Objective
Implement five R2 requirements: Root tenant administration (RF-035), structured logging (RNF-017), API response time (RNF-003), self-order load time (RNF-002) and multiplatform backoffice (RNF-018).

## Problem
- RF-035: Root can already list/create/patch tenants (task 76), but a suspended tenant returns 404, login is not blocked, there are no `/suspend` `/reactivate` routes and there is no Root panel.
- RNF-017: backend has no logger setup, no requestId, no redaction.
- RNF-003 / RNF-002: no compression, no catalog cache headers, no k6 or Lighthouse tooling.
- RNF-018: no CI for the mobile app (web export, APK) and no shared-code measurement.

## Scope
- In: backend, mobile (Root panel, maintenance screen), tooling (k6, Lighthouse config, CI workflow, measurement script), docs (`docs/api.md`, `docs/no-funcional.md`, `docs/testing.md`).
- Out: staging/production infrastructure. Measured targets that need it (p95 < 500 ms, LCP ≤ 2.5 s, Lighthouse ≥ 80, builds ≤ 30 min in CI) stay **pending infra**: tooling is delivered, the measurement is not checked off.

## Constraints
- TDD: on (source: global CLAUDE.md). Runners: `npm test` in `backend/` and in `mobile/`; typecheck `npx tsc --noEmit -p tsconfig.json` in `backend/`.
- RDD: off (global). Per commit: `gentle-ai review assess` tier decides verification.
- DB changes only via a new idempotent `database/scripts/002_*.sql` (never edit `001`); comment important columns and every index.
- Uncommitted user edits to `mobile/app.json` and `mobile/package.json` stay out of commits unless the user decides otherwise. Stage explicit paths only.
- Planning heuristic ~400 authored lines per task; advisory only.

## Delivery
One branch per requirement, stacked (each from the previous one) so they squash into `develop` in order. The user decides the squashes.

## Tasks
- [x] T1 RNF-017 structured logging: JSON logger (Nest + TypeORM), requestId via AsyncLocalStorage + response header, tenantId (`null` when unresolved), redaction of password/token/authorization/cookie. Branch `feat/r2-logging`. Route: delegated (writer trigger).
- [x] T2 RF-035 tenant suspension: 503 `TENANT_SUSPENDED` for known inactive tenant (login included), `/tenants/:id/suspend` and `/reactivate`, maintenance screen in self-order, Root panel on admin host. Branch `feat/r2-tenants-root`. Route: delegated.
- [x] T3 RNF-003 API response time: compression, k6 scripts (TC-112 and stress), index review. Target measurement pending infra. Branch `feat/r2-api-rendimiento`. Route: delegated.
- [x] T4 RNF-002 self-order load: catalog cache headers, image resizing, Lighthouse CI config with budget (TC-184). Target measurement pending infra. Branch `feat/r2-selforder-carga`. Route: delegated.
- [x] T5 RNF-018 multiplatform backoffice: shared-code measurement script, CI workflow for web export and debug APK (TC-128). Build-time target pending CI run. Branch `feat/r2-backoffice-multiplataforma`. Route: delegated.

## Progress
- Feature document created.
- T1 done (commit c24fba7 on `feat/r2-logging`): RED = 3 suites failed with "Cannot find module src/logging/*"; GREEN = 4 logging suites, 12 tests; full `npm test` 36 suites / 309 tests pass; `tsc --noEmit` clean. `backend/.env.example` not updated (edit blocked by permissions): add `LOG_MODE`, `SERVICE_NAME`, `SERVICE_VERSION`, `APP_ENV`; set `LOG_MODE=json` in the Container App.

- T1 assessed: risk high (RDD off) → independent verifier. Found: error filter turned http-errors (413 body too large) into 500 and changed the default 500 body; aborted requests logged as 200. One correction `ff60cf8`: RED 3 tests, GREEN 36 suites / 313 tests, tsc clean; parent re-ran logging suites (16 green). Known limits: error messages/stacks are not redacted (pg duplicate-key may carry an email); lines outside a request have `request_id: null`.

- T2 done: `c28b117` backend (503 `TENANT_SUSPENDED` incl. login, `/suspend` `/reactivate` via `SetTenantActiveUseCase`, owner 403 already from 001 grants, no DB script) and `61ffea6` mobile (maintenance screen in catalog and confirm, Comercios tab for root on admin host). RED observed both sides; GREEN backend 36 suites / 323, mobile 17 suites / 176; tsc and lint clean; parent re-ran tenant suites (73 green). Assessed high → independent verifier: no defects. Not run: screens in a browser, backend against a DB, Playwright TC-005/TC-075, k6 TC-180. Note: `/media` stays public for suspended tenants; a 503 on `/me` signs the owner out.

- T3 done: `493bb7e` gzip via `compression` (after logging, before media/body parsers), k6 scripts `perf/k6/` (TC-112, stress load/breakpoint, TC-180), no index script (existing indexes cover hot queries). RED observed, GREEN 37 suites / 327, tsc clean; parent re-ran http suite (4 green). Assessed high → verifier: no defects; weak spot: 304 test body under the 1 KB gzip threshold. **Pending infra:** p95 < 500 ms and errors < 1% not measured (no staging, no DB, no k6 binary; scripts only syntax-checked).

- T4 done: `38454f5` public catalog ETag + `Cache-Control: public, max-age=60, stale-while-revalidate=300` + 304; images already resized to 1280 px on upload (no change); Lighthouse config `perf/lighthouse/lighthouserc.json` (perf ≥ 0.8, LCP ≤ 2500, image ≤ 600 KB). Parent found a cross-tenant shared-cache risk (tenant via `X-Tenant-Slug`) → fix `b77a439` `Vary: X-Tenant-Slug` (RED 1 test, GREEN 68 products tests, tsc clean). Assessed high → verifier: no defects; stale catalog up to ~6 min is display-only (server re-prices orders). **Pending infra:** LCP / Lighthouse score not measured (web not published, no staging).

- T5 done: `49a1fca` shared-code script `mobile/scripts/shared-code*.js` (95.04% shared, threshold 90), workflow `.github/workflows/mobile-build.yml` (test, shared-code, web export, debug APK via prebuild + gradle, 30 min timeouts); user's `mobile/app.json` (`android.package`) and `mobile/package.json` (`expo run:*`) included by user decision. RED observed, GREEN 18 suites / 186, tsc clean, web export OK (~30 s); parent re-ran shared-code. Assessed high → verifier: no defects. **Pending CI:** first workflow run (APK build and ≤ 30 min target unverified); `com.anonymous.mostrador` is a placeholder id.

## Next step
User decides squash of the stacked branches into `develop` (T1 → T5) and push. Still pending outside code: add `LOG_MODE`, `SERVICE_NAME`, `SERVICE_VERSION`, `APP_ENV` to `backend/.env.example` and `LOG_MODE=json` in the Container App; run k6 and Lighthouse once staging exists.
