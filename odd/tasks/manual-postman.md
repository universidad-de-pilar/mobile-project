# Manual de Postman de la API de Mostrador

## Objective
A Postman collection and environment for the Mostrador API, executed against the local backend, plus a user manual in Google Docs that teaches how to use it. Academic practical assignment.

## Problem
The API is exercised only through `backend/http/*.http` (98 requests in 13 files, VS Code REST Client). There is no Postman collection and no user-facing manual.

## Scope
- In: collection v2.1 and local environment under `backend/postman/`, built from `backend/http`, with test scripts that chain tokens and ids; a full run against `http://localhost:3000`; a manual draft in the repo; the Google Doc created from it.
- Out: changes to backend behavior, publishing to a Postman cloud workspace (not requested).

## Constraints
- The user confirmed on 2026-11-02 that the backend uses a development database and authorized all needed test calls. No database reset or drop, no reading `backend/.env`.
- Branch `docs/manual-postman` from `feat/adaptacion`. Commits in Spanish, conventional. No push.
- Manual in neutral professional Spanish. The collection holds no real secrets: dev credentials from the seed and `admin.http` only.
- TDD: not applicable (no behavior module). Checks: the collection run itself.

## Tasks
- [x] T1: collection, environment and full run. Route: delegated (mapping and writer triggers, 13 input files). 101 requests (98 from the `.http` files plus 3 support requests), 183 assertions, 0 failed in two Newman runs; the parent re-ran it with Postman CLI 1.75 with the same result. Commit `c4dc7e0`.
- [x] T2: manual draft `docs/postman/manual-usuario.html` from the run results. Route: delegated with T1. Commit `c4dc7e0`.
- [x] T4: Word version `docs/postman/manual-usuario.docx`, requested by the user instead of the Google Doc. Generated from the HTML with docx-js (script kept out of the repo). Schema validation passed; visual check with docx-preview in a browser because Word and LibreOffice are not installed.
- [ ] T3: Google Doc created from the draft, and link recorded. Route: inline (one upload). Blocked: the Google Drive connector session expired on upload; the user must reconnect it.

## Acceptance
- The collection imports into Postman and runs top to bottom on a seeded local backend, with every request's status matching its documented expectation.
- The manual explains import, environment, authentication, run order, each folder with examples from the real run, and the Collection Runner.

## Progress
- Created 2026-11-02.

## Next step
T1.
