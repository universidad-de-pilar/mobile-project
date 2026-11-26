# BU-018: Versioned, idempotent SQL scripts

- Issue: #18
- Branch: `feature/BU-018-db-versioning` (from `develop`)
- TDD: strict. Runner: `npx jest --rootDir . --modulePaths "<rootDir>"` from `backend/`.

## Objective
Add an in-house mechanism that applies versioned SQL scripts and records them in a versions table. No ORM migrations.

## Acceptance (from issue)
- Versions table exists.
- Re-running the scripts causes no duplicates and no failures.
- Initial schema and constraints are in place, with no ORM migrations.

## Scope
- Move `database/schema.sql` to `database/scripts/001_initial_schema.sql`. Each script must stay idempotent.
- Add a `schema_versions` table (version, checksum, applied_at), created by the runner.
- Add the `npm run db:apply` runner: applies scripts in order, skips the ones already applied, runs each in a transaction, and fails if an applied script's checksum changed.
- Document how to run it.

Out of scope: catalog, orders, payments, donations (BU-007); the FK index and comment cleanup (follow-up).

## Tasks
- [x] T1: Runner + versions table + script move + docs (route: delegated writer; trigger: 2+ non-trivial files)

## Evidence
- RED observed: the planner spec failed with "Cannot find module". The CRLF checksum test also failed before its fix.
- GREEN: 13/13 suites and 46/46 tests pass. `tsc --noEmit` and `npm run build` pass.
- Line-ending fix: checksum normalizes CRLF to LF, so Windows and Linux checkouts produce the same hash.
- `db:apply` was run once against the local DB (unplanned). It recorded `001_initial_schema` with the pre-fix (CRLF) checksum, so that row must be deleted.
- Pending manual cases: run twice, edited script, rollback.
