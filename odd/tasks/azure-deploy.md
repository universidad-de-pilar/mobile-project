# Azure deploy: Blob Storage + Container Apps

Branch: `feature/azure-deploy` (from `develop`).

## Objective
Deploy the backend to Azure Container Apps from GitHub Actions, with uploaded media (product images, screen content) stored in Azure Blob Storage instead of the local disk.

## Why
User decision (2026-10-29): "hagamoslo con blob ahora, y vamos a usar container app". Container Apps has no persistent local disk, and video upload (ffprobe) must work on the first deploy.

## Scope
- In:
  - Blob adapters for `IImageStorage` and `IContentStorage`; local adapters stay for dev. Selection by env: `AZURE_STORAGE_CONNECTION_STRING` set → Blob, otherwise local disk.
  - `IVideoProbe` measures from the buffer (temp file in `os.tmpdir()`), before saving, so it does not depend on where the file lives.
  - `/media/*` keeps the public contract: with Blob it answers 302 to the blob URL (same relative paths stored in the DB, no mobile change).
  - Dockerfile (Node + ffmpeg) and `.dockerignore` for the backend.
  - GitHub Actions workflow: test → build image → push to ACR → deploy to Container App (OIDC).
  - `docs/deploy.md` with the one-time Azure setup; `docs/testing.md` cases; `.env.example`.
- Out: mobile build/distribution (EAS), wildcard tenant domains/certificates, private blobs with SAS, CDN.

## Constraints
- TDD: on (global CLAUDE.md). Runner from `backend/`: `npx jest --rootDir . --modulePaths "<rootDir>"`; typecheck `npx tsc --noEmit -p tsconfig.json`.
- DB changes only via idempotent SQL scripts (none expected).
- RDD: off (decided by global).

## Tasks
- [x] T1 Blob storage: Blob adapters + env selection, probe from buffer before save, `/media` redirect, tests, `.env.example`, `docs/testing.md`. Route: delegated (writer trigger, 2+ non-trivial files).
- [x] T2 Container + pipeline: Dockerfile with ffmpeg, `.dockerignore`, GitHub Actions workflow to ACR + Container Apps, `docs/deploy.md`. Route: delegated (writer trigger).

## Progress
- Feature document created.
- T1 done: commit `d347f3e` (RED: 4 failing tests + new blob suite not loading; GREEN 297 tests, re-run by parent; tsc clean). Shared sharp processing in `process-image.ts`; `/media` 302 in blob mode with decoded traversal check. Not run against Azurite or a real account; ffprobe temp-file cleanup covered only by a manual case.

- T2 done: commit `ad40ce4`. Docker image built locally, ffprobe 5.1.9 present, modules load as non-root; workflow YAML parses. Deploy via `az acr build` + `az containerapp update`. Postgres TLS via `PGSSLMODE=require` (documented, no code change). Not verified: pipeline on GitHub, `az` commands in `docs/deploy.md`, `/media` redirect against real Blob.

## Next step
Run the one-time setup in `docs/deploy.md` (Azure resources, OIDC, GitHub secrets/variables, `db:apply`), then merge to `main` to trigger the first deploy.
