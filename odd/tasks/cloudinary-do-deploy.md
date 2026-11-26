# Cloudinary storage + DigitalOcean deploy

Branch: `feat/cloudinary-do-deploy` (from `feat/video-presentacion-v2` @ 106d8ea; stacks on it because `main` lacks the media/content code). Worktree: `../mobile-project-worktrees/cloudinary-do-deploy`.

## Objective
Store uploaded media (product images, screen content) in Cloudinary instead of Azure Blob, and deploy the backend to DigitalOcean App Platform from GitHub (deploy on push to `main`).

## Why
User decision (2026-11-09): "storage: cloudinary, deploy: digital ocean desde github". The work Azure tenant may block app registrations/role assignments needed for OIDC; App Platform deploys from the GitHub integration without cloud credentials in CI.

## Scope
- In:
  - Cloudinary adapters for `IImageStorage` and `IContentStorage`; Azure Blob adapters and `@azure/storage-blob` are removed. Local adapters stay for dev.
  - One function in `src/media` decides the backend (`CLOUDINARY_URL` set → Cloudinary, otherwise local); content.module, products.module and main.ts all use it.
  - `/media/*` keeps the public contract (302 redirect, same stored relative paths, no mobile change) via a path → URL resolver.
  - Postgres TLS compatible with DO Managed PostgreSQL (its CA is not publicly trusted).
  - App Platform app spec, CI workflow reduced to tests, `docs/deploy.md` rewritten, `docs/testing.md` cases.
- Out: mobile build/distribution, wildcard tenant domains/certificates (documented as gap), CDN, signed/private media.

## Constraints
- TDD: on (global CLAUDE.md, strict). Runner from `backend/`: `npm test` (jest); typecheck `npx tsc --noEmit -p tsconfig.json`.
- DB changes only via idempotent SQL scripts (none expected).
- `backend/.env.example` is behind a deny rule: the user adds `CLOUDINARY_URL=` by hand.
- Size limits: app caps images at 5 MB and videos at 50 MB; Cloudinary free plan caps (image 10 MB, video 100 MB) are above them — confirm on the real plan.
- RDD: not run here (follows global switch).

## Tasks
- [x] T1 Cloudinary storage: resolver + adapters + single backend selector, remove Azure Blob, tests, `docs/testing.md`. Route: delegated (writer trigger, 2+ non-trivial files).
- [x] T2 DB TLS for DO Managed PostgreSQL (CA cert via env) in app and `db:apply`, tests. Route: delegated (same writer).
- [x] T3 App Platform spec (`.do/app.yaml`), workflow tests-only, `docs/deploy.md` rewrite. Route: delegated (same writer).

## Acceptance criteria
- With `CLOUDINARY_URL` set, uploads go to Cloudinary and `/media/<path>` redirects to the right `image/upload` or `video/upload` URL; deletes use the matching `resource_type`.
- Without it, local disk works as today.
- `npm test` and `tsc --noEmit` pass; no `@azure/*` import remains.
- Pushing to `main` deploys on App Platform (manual one-time setup documented).

## Progress
- Feature doc created.
- T1 done: `src/media/cloudinary-media.ts` (selector `cloudinaryEnabled`, `cloudinaryUrl`, `uploadMedia`, `removeMedia`), Cloudinary adapters, `serveMedia(app, dir, resolveUrl)`, Azure removed. RED observed (modules missing) then GREEN. Verification (backend/): `tsc --noEmit` OK; `npm test` 41 suites / 373 tests pass; `grep @azure src scripts package.json` empty. User must add `CLOUDINARY_URL=` to `backend/.env.example`.
- T2 done: verified in `pg` 8.23.0 (`connection-parameters.js`): `PGSSLMODE=require` gives `ssl: true`, i.e. default CA verification, so DO's private CA fails. `src/db/db-ssl.ts` `dbSsl()` used by `app.module.ts` and `scripts/db/apply-scripts.ts`. RED observed (module missing) then GREEN; `tsc` OK; `npm test` 42 suites / 375 tests pass.
- T3 done: `.do/app.yaml`, workflow renamed `backend-ci.yml` (tests only), `docs/deploy.md` rewritten, `docs/testing.md` deploy section updated. Spec checked against DO app-spec reference: `dockerfile_path` is relative to repo root, `source_dir` is the build context. Unverified: bindable names `USERNAME/PASSWORD/DATABASE/CA_CERT` (docs page only lists HOSTNAME/PORT/DATABASE_URL), wildcard domains. No `/health` route exists (tenant middleware 404s everything), so TCP check.

## Next step
User: add `CLOUDINARY_URL=` to `backend/.env.example`, create Cloudinary account and DO resources per `docs/deploy.md`.
