# #43: Backoffice order management (RF-031, RF-032)

Branch: `feature/43-gestion-ordenes` (from `develop`).

## Objective
Backoffice endpoints from `docs/api.md` section 9: `GET /orders` (list with filters and pagination), `GET /orders/:orderId` (detail) and `PATCH /orders/:orderId/status` (only valid transitions, per the table in 9.4).

## Scope
- In: backend only. The `orders` table, its status CHECK, its indexes and the `orders:read`/`orders:update` permissions already exist in `002_mostrador_r1.sql`, so no SQL script is needed.
- Out:
  - Backoffice UI, which has not been started in `mobile/`. The "360 px without horizontal scroll" criterion (RNF-007) moves to the UI issue.
  - The supertest/e2e harness, which does not exist yet.

## Constraints
- The tenant comes only from `@CurrentTenant()`. Every query is scoped by `tenant_id`, and an id from another tenant returns 404.
- A `store_id` that is not in the tenant returns 404 `STORE_NOT_FOUND`.
- Listing: optional `status`. `from` is inclusive and `to` is exclusive. `page` ≥ 1, `limit` 1-100 (default 20). Order is `created_at DESC`. The response is `{data, meta:{page,limit,total}}`. Money is a 2-decimal string.
- Status change:
  - Valid transitions are generada→en_preparacion|cancelada, en_preparacion→lista|cancelada, lista→entregada|cancelada. entregada and cancelada are final.
  - An invalid transition (including same→same) returns 409 `INVALID_STATUS_TRANSITION` with `details:{from,to,allowed}`.
  - A valid change saves `status_changed_at = now()` and `status_changed_by = JWT sub`.
- The update must be race-safe: `UPDATE ... WHERE status = <from>`. If 0 rows change, return 409.
- Errors are Nest exceptions with `{statusCode, message, error, code, details?}`.
- TDD: on (source: global CLAUDE.md). Run from `backend/`: `npx jest --rootDir . --modulePaths "<rootDir>"`.
- RDD: off (global).

## Tasks
- [x] T1 Pure domain transition table: `allowedTransitions(from)` and `assertTransition(from, to)`, plus the `INVALID_STATUS_TRANSITION` error. Route: delegated (writer trigger, with T2).
- [x] T2 List, detail and status-change use cases. Also the repository methods, query/body DTOs, an admin `OrdersController` and a `@CurrentUser` (or equivalent) for the `sub`. Route: delegated (writer trigger).
- [x] T3 docs/testing.md: mark the automated Jest cases (TC-100, plus TC-096/097/099 at use-case level if they apply). Route: delegated with T2.

## Acceptance (from issue)
- The tenant's orders are listed, even when the store has no WhatsApp.
- Orders can be filtered by status.
- An order's status can only change through valid transitions.
- Orders from other tenants are not visible.
- 360 px: out of scope (no UI).

## Delivery
Forecast is about 450 authored lines on one feature branch, integrated into develop with a local squash, as in #51/#55.

## Progress
- Branch created.
- T1-T3 done by one delegated writer (uncommitted).
  - Domain: `order-status.ts` (`allowedTransitions`, `assertTransition`) plus `orderNotFound` and `invalidStatusTransition` in `order.errors.ts`.
  - Use cases: `ListOrders`, `GetOrder`, `ChangeOrderStatus`.
  - Repository: `list`, `findById`, `changeStatus` (race-safe UPDATE).
  - API: DTOs, `OrdersController`, `CurrentUserId` decorator in `auth/api`, module imports `TenantsModule`.
- Finding: for UPDATE, TypeORM's postgres `query()` returns `[rows, affectedCount]`. `changeStatus` reads the count. The existing `nextOrderNumber` does `UPDATE ... RETURNING` and `rows[0].last_order_number`, which looks wrong and needs a real-DB check (out of this issue's scope).

## Evidence
- RED: with only the specs written, `npx jest --rootDir . --modulePaths "<rootDir>" test/orders` gave "2 failed, 26 passed" (Cannot find module `order-status` and the use-case files).
- GREEN: full suite 28 suites, 192 tests passed (175 before, +17 new). `npx tsc --noEmit -p tsconfig.json` clean.
- docs/testing.md: TC-096/097/099/100 notes, matrix rows HU-21 marked Parcial, new "Gestión de órdenes (#43)" section.

## Next step
Commit (conventional, Spanish), then integrate. Supertest harness pending in a separate issue.
