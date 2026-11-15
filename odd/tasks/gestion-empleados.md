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
- [ ] T1 DB: `database/scripts/002_employees_permissions.sql` with `employees:*` permissions and owner grant. Route: inline (one mechanical file).
- [ ] T2 Backend: tenant-scoped employee repository (list members with stores, transactional create, update names, set membership active, replace stores validated against tenant) + use cases with TDD. Route: delegated (writer trigger, 2+ non-trivial files).
- [ ] T3 Backend: `EmployeesController`, DTOs, module wiring, `route-permissions.spec`, `docs/api.md`, `docs/testing.md`. Route: delegated (writer trigger).
- [ ] T4 Mobile: "Equipo" tab gated by `employees:read`, list/create/detail screens, `admin-api` functions, `employee-rules` with tests, `docs/testing.md`. Route: delegated (writer trigger).

## Acceptance criteria
- Owner can create an employee with a store; the employee logs in and only sees permitted tabs.
- Duplicate email → 409; store from another tenant → rejected.
- Deactivated employee is blocked by `MembershipGuard`; reactivation restores access.
- Employee without `employees:*` gets 403 on `/employees`.
- Backend and mobile `tsc` + tests pass.

## Progress
- Feature doc created.

## Next step
T1.
