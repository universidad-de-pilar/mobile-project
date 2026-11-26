# Screen pairing with a short code

## Objective
A TV opens `/screen` (no token), shows a short code, the owner types it in the backoffice, and the TV starts playing that screen. Nobody types the 43-char token.

## Problem / why
TVs are hard to type on. Today the owner must enter `/screen/<43-char token>` by hand.

## Scope
- In scope: `screen_pairings` table (idempotent SQL script), public pairing endpoints, authenticated "pair" endpoint, player pairing mode at `/screen`, "Vincular TV" in the screen detail, `docs/testing.md` + `docs/api.md` cases.
- Out of scope: token rotation/regeneration, QR on the TV that opens the backoffice.
- Existing `/screen/<token>` URLs keep working.

## Design
- `POST /player/pairings` (public, tenant from host/`X-Tenant-Slug`) → `{ code, claim_secret, expires_at }`. Code: 6 chars from an alphabet without ambiguous chars (no 0/O/1/I), shown as `XXX-XXX`, 10-minute TTL. `claim_secret`: random base64url, only the TV knows it.
- `GET /player/pairings/:claim_secret` (public) → `{ status: 'pending' }` or `{ status: 'paired', token }` (then the row is deleted); 404 if expired/unknown.
- `POST /screens/:id/pair` `{ code }` (`screens:update`) → binds a pending, non-expired code of the same tenant to the screen.
- TV stores the token in `localStorage`; `/screen` with a stored token goes straight to the player.

## Tasks
- [x] T1 Backend: SQL script, domain/use cases/endpoints, unit tests. Route: delegated (writer trigger: 2+ non-trivial files).
- [x] T2 Frontend: `/screen` pairing mode + "Vincular TV" in backoffice + docs. Route: delegated (writer trigger).

## Acceptance criteria
- Backend jest green, `tsc`/`eslint` clean in backend and mobile, mobile jest green.
- Manual: open `/screen` on a TV/browser, pair from backoffice, content shows; reload keeps playing.

## TDD
Mode: on (global CLAUDE.md, behavior modules only). Runner: `npm test` (jest) in `backend/` and `mobile/`.

## Delivery
Strategy: chained PRs to `develop` (stacked), squash in order — per project preference.

## Progress
- Branch `feat/pantallas-vinculacion` created from `develop`.
- T1 done, commit 994bf0a (`feat(pantallas): vinculación de TV con código corto (backend)`). Route: delegated writer.
  - Tests: RED observed (`screen-pairing.spec.ts` failed: modules not found), GREEN 16 new specs; full backend jest 44 suites / 419 tests pass.
  - `tsc --noEmit` clean. `eslint src/screens` reports prettier/unsafe-any errors, but the baseline already had 297 errors (repo uses 4-space style); new files follow the existing screens style.
  - SQL `database/scripts/005_screen_pairings.sql` NOT applied to any database (none available); needs applying before manual checks.
  - Decisions: `POST /screens/:id/pair` returns 204; errors `PAIRING_NOT_FOUND` (claim) and `PAIRING_CODE_INVALID` (pair), both 404; inactive screen keeps the claim `pending`; no rate limit on pair attempts (noted in testing.md TC-244).
- T2 done, commit ac89ad9 (`feat(pantallas): la TV se vincula con un código desde el panel`). Route: delegated writer.
  - Tests: RED observed (`pairing-rules.test.ts` failed: module not found), GREEN 8 new specs; full mobile jest 21 suites / 245 tests pass. `tsc --noEmit` and `eslint` on changed files clean.
  - Built: `/screen` route (stored token -> player, else code + 4 s poll, auto-renew on 404/expiry), `WebPlayer` extracted to `components/player/web-player.tsx`, `usePairing` hook, player-api `createPairing/claimPairing/*StoredToken`, `pairScreen` in admin-api, "Vincular TV" inside "Conectar al televisor" (needs `screens:update`).
  - Gaps: UI not exercised in a browser (no DB with script 005 applied); manual cases in testing.md pending.
