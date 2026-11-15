# Employee management (RF-008 / HU-05)

Branch: `feat/gestion-empleados` (from `develop` @ 01cf23b).

## Objective
Let a tenant owner create, edit, activate/deactivate employees and assign them stores (RF-008, HU-05 `docs/funcional.md:235`, endpoints planned in `docs/api.md:820`).

## Why
There is no user management today: `backend/src/users` has only domain + infrastructure, the repository stubs `update`/`delete`/`getAll`, and the only user endpoints are register/login/me. RF-008 was planned for R2.

## Scope
- In: `GET/POST /employees`, `PATCH /employees/:id` (names, `is_active`), `PUT /employees/:id/stores`; permissions `employees:read/create/update` for owner; mobile "Equipo" tab (list with toggle, create, detail with stores).
- Out: filtering orders by `users_stores` (`docs/api.md:781`), email length mismatch (ORM 320 vs SQL 255), password reset, invitations, fixing the global `users_roles` vs per-tenant role gap in `PermissionsGuard`.

## Decisions (validated by the user)
1. Routes `/employees` (per `docs/api.md`).
2. Owner sets the initial password; same rules as register.
3. Existing email → 409 (one tenant per user).
4. Soft delete per tenant: `users_tenants.is_active = false`.
5. Role `employee` written to both `users_roles` and `users_tenants`.
6. New permissions `employees:read/create/update`, granted to owner only.

## Constraints
- TDD: on (global CLAUDE.md, strict). Backend runner `npm test` (jest) + `npx tsc --noEmit -p tsconfig.json` in `backend/`; mobile runner `npm test` (jest) + `npx tsc --noEmit` in `mobile/`. npm via `$APPDATA/fnm/node-versions/v26.13.0/installation`.
- DB changes only via idempotent SQL scripts; `001_schema.sql` is checksummed by `db:apply`, so changes go in a new script.
- Delivery: ~900 authored lines forecast; chained PRs (T1+T2, T3, T4). Chain strategy to be asked before the first PR.

## Tasks
- [x] T1 DB: `database/scripts/002_employees_permissions.sql` with `employees:*` permissions and owner grant (root too, following the existing "root has every permission" convention so `/me` reflects it). Route: inline (one mechanical file).
- [x] T2 Backend: tenant-scoped employee repository (list members with stores, transactional create, update names, set membership active, replace stores validated against tenant) + use cases with TDD. Route: delegated (writer trigger, 2+ non-trivial files).
- [x] T3 Backend: `EmployeesController`, DTOs, module wiring, `route-permissions.spec`, `docs/api.md`, `docs/testing.md`. Route: delegated (writer trigger).
- [x] T4 Mobile: "Equipo" tab gated by `employees:read`, list/create/detail screens, `admin-api` functions, `employee-rules` with tests, `docs/testing.md`. Route: delegated (writer trigger).
- [x] T5 Backend: employees only see assigned stores (HU-05 "unassigned store hidden"). `allowedStoreIds(tenantId, userId)` next to `isStoreOfTenant` (null = unrestricted for owner/root); applied to `GET /me` stores, `GET /stores`, `GET /stores/:id`, category/product lists, `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`; unassigned → 404 `STORE_NOT_FOUND`. Id-only edit/delete routes untouched (employee lacks those permissions). Mobile unchanged (uses `me.stores[0]`). Branch `feat/empleados-5-filtro-locales`, PR stacked on #88. Validated by user 2026-11-15. Route: delegated (writer trigger).

## Acceptance criteria
- Owner can create an employee with a store; the employee logs in and only sees permitted tabs.
- Duplicate email → 409; store from another tenant → rejected.
- Deactivated employee is blocked by `MembershipGuard`; reactivation restores access.
- Employee without `employees:*` gets 403 on `/employees`.
- Backend and mobile `tsc` + tests pass.

## Progress
- Feature doc created.
- T1 done (commit cf47c54): `npm run db:apply` applied 002 on the DB configured in `backend/.env`, which is the remote Neon DB (not local; reported to the user, who chose to keep it); re-ran the file directly (idempotent, no error); grants verified: owner and root have `employees:create/read/update`. No tests (SQL seed).
- T2 done (commit 1110b93): new module `backend/src/employees` (domain/application/infraestructure; wiring left to T3). RED: `npx jest test/employees` failed (suite could not resolve `src/employees/*`, 0 tests run); GREEN: 13/13. `npx tsc --noEmit` clean; `npm test` 43 suites / 389 tests pass. Repo SQL not run against a DB (only the remote Neon DB is configured; not probed). Design: separate module, reuses `USER_REPOSITORY.getByEmail` and `PASSWORD_HASHER`; error codes `EMAIL_TAKEN` 409, `INVALID_STORES` 400, `EMPLOYEE_NOT_FOUND` 404, `EMPLOYEE_NOT_EDITABLE` 403 (non-employee roles), `CANNOT_DEACTIVATE_SELF` 409. Store replacement is a soft delete (`users_stores.is_active`). T3 must make `PASSWORD_HASHER` available to the employees module (currently provided only in AuthModule).

- T3 done (commit 9833498): `EmployeesController` (GET/POST /employees, PATCH /employees/:id, PUT /employees/:id/stores), DTOs (`CreateEmployeeDto extends RegisterUserDto`), `EmployeesModule` registered in `AppModule`; `PASSWORD_HASHER` exported from `AuthModule` and `AuthModule` imported by `EmployeesModule` (no cycle). Tenant middleware already covers `*`; admin host still only auth|me|tenants. `route-permissions.spec` extended (employee reaches no /employees route). Verification: `npx tsc --noEmit` clean; `npm test` 43 suites / 391 tests pass; `npm run build` ok. Docs: `docs/api.md` 4.1, `docs/testing.md`, `backend/http/13-employees/employees.http`; Postman collection skipped (large generated file). Server/DB not run.

- T4 done (commit 8376878): `mobile/src/app/admin/(tabs)/equipo.tsx` (list with toggle, inline create/edit form with store chips; one screen instead of a stack), `admin-api` employee functions, `employee-rules.ts` (+ test), tab `equipo` gated by `employees:read` in `_layout.tsx` (platform root already sees only `comercios`), `docs/testing.md`. RED: `npx jest src/lib/employee-rules` failed (module not found, 0 tests); GREEN: 20/20. Verification in `mobile/`: `npx tsc --noEmit` 0; `npm test` 20 suites / 230 tests pass; `npx expo lint` no warnings. App/server not run.

- Manual API test on Neon (2026-11-14, user-authorized): backend local on :3010, tenant `local1` owner. 12/12 cases as expected (201 create, 409 EMAIL_TAKEN, 400 INVALID_STORES, 400 weak password, employee 403 on /employees, 409 CANNOT_DEACTIVATE_SELF, deactivated employee 403 NOT_A_MEMBER then restored, PUT stores 200/400, 404 EMPLOYEE_NOT_FOUND). Test employee deleted (1 row each in users_stores/users_tenants/users_roles/users). Not covered: EMPLOYEE_NOT_EDITABLE against another owner; mobile tab not run in a browser.

- T5 done (commit f7e3e86): `allowedStoreIds(tenantId, userId)` in `ITenantRepository` + Postgres (one query: active `employee` membership joined to active `users_stores`/stores of the tenant; no membership as employee = null, unrestricted) and helper `canAccessStore` (`tenants/domain/store-access.ts`). Applied to GetMe, GET /stores, GET /stores/:id, category/product lists, GET /orders (STORE_NOT_FOUND), GET /orders/:id and PATCH /orders/:id/status (ORDER_NOT_FOUND, chosen as the natural "hidden" 404 for an id-addressed order). `StoresModule` imports `TenantsModule`. RED: 5 suites / 8 tests failed before the code; GREEN: all pass. `npx tsc --noEmit` clean; `npm test` 43 suites / 399 tests pass; `npm run build` ok. Docs: `docs/api.md` (4.1, 12), `docs/testing.md`. Server/DB not run.

## Next step
Manual test of T5 on Neon (needs user OK) + PR #89 stacked on #88.
