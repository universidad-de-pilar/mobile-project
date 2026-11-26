# BU-021 — Roles (read-only roles and permissions module)

- Issue: #21 (BU-021, authorization and tenant isolation in NestJS)
- Branch: `feature/BU-021-roles` (from `develop`)
- TDD: strict, enabled (session config). Runner: `npx jest --rootDir . --modulePaths "<rootDir>"` from `backend/`. The default `npm test` uses `rootDir: src` and finds no specs under `test/`, which is a pre-existing problem.

## Objective
Give `backend/src/roles` the use cases specified by the existing specs in `backend/test/roles`, with the persistence they need.

## Scope
- Use cases: `GetRolesUseCase`, `GetRoleByIdUseCase`, `GetRolePermissionsUseCase` (dedup by `permission_id`).
- Domain entity + repository port (`getAll`, `getById`, `getPermissionsByRoleId`), Postgres adapter, ORM entities.
- Fix `roles.module.ts` (it is a copy-paste of TenantsModule) and register it in `AppModule`.
- `database/schema.sql`: idempotent `permissions` + `roles_permissions`, with comments.

Out of scope (rest of BU-021): guards, user↔tenant link, tenant isolation, seeds, HTTP controller.

## Tasks
- [x] T1 — Roles module + permissions schema (route: delegated writer, trigger: 2+ non-trivial files)

## Acceptance
- `test/roles` green and `test/auth` + `test/tenants` still green.
- `tsc --noEmit` passes.

## Evidence
- RED observed: 3 roles suites fail with `Cannot find module 'src/roles/application/...'`. 7 suites (auth/tenants) pass, 19 tests.
- GREEN: `npx jest --rootDir . --modulePaths "<rootDir>"` gives 10/10 suites and 29/29 tests. `tsc --noEmit` passes.
- SQL not yet applied against a real DB.

## Next step
Guards + tenant isolation (rest of BU-021). `users_stores` already links users and stores.
