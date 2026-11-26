# #55: Order confirmation and registration (RF-029, RF-030, RNF-001)

Branch: `feature/55-confirmacion-orden` (from `develop`).

## Objective
`POST /public/stores/:storeSlug/orders` as specified in `docs/api.md` (sections 11 and 11.1): server-side price recalculation, a correlative number per tenant, origin via `source_screen_id`, and a WhatsApp message built from the same saved lines.

## Scope
- In: backend only. The `orders` and `order_items` tables and `tenants.last_order_number` already exist in `002_mostrador_r1.sql`, so no SQL script is needed.
- Out:
  - Cart and confirmation UI (#53, the menu web project).
  - WhatsApp config UI (#72).
  - The supertest/e2e harness, which does not exist yet.

## Constraints
- The tenant comes only from `req.tenant`, and every query is scoped by `tenant_id`.
- Prices, unit prices and totals sent by the client are ignored.
- One transaction does all of this: validate the products, run `UPDATE tenants SET last_order_number = last_order_number + 1 ... RETURNING`, insert `orders`, then insert `order_items`. Never insert `line_total`, because it is a generated column.
- An invalid, foreign or inactive `source_screen_id` is saved as `null` and does not block the order.
- Missing or unavailable products return 409 `PRODUCTS_UNAVAILABLE` with `details[]`, and nothing is saved. `docs/api.md` wins over TC-095/TC-168, which say 400/404.
- Errors are Nest exceptions with `{statusCode, message, error, code}`.
- TDD: on (source: global CLAUDE.md). Run from `backend/`: `npx jest --rootDir . --modulePaths "<rootDir>"`.
- RDD: off (global).

## Tasks
- [x] T1 WhatsApp message builder, a pure domain function: the format from api.md 11.1, `es-AR` money format, parts of at most 1500 chars that never cut an item line, and a `wa.me` url. Store without a number → `[]`. Route: delegated (writer trigger).
- [x] T2 Create order: DTO validation, use case, repository transaction, public controller, and 201 response per api.md. Route: delegated (writer trigger).
- [x] T3 docs/testing.md: fix TC-095/TC-168 to 409 and mark the automated Jest cases. Route: delegated with T2.

## Acceptance (from issue)
- The order is saved with a correlative number per tenant and its origin.
- The server recalculates prices.
- The saved order matches the WhatsApp message.
- Unavailable or nonexistent products fail with a clear error.

## Delivery
Forecast is about 500 authored lines on one feature branch, integrated into develop with a local squash, as in #51.

## Progress
- Branch created.
- T1 done (builder + 6 specs).
- T2 done (DTO, use case, repo, controller, module; 7 specs; 175 passing, tsc clean).
- T3 done (testing.md).

## Evidence
- T1: commit 81d1429 (RED: module not found; GREEN: 168 passing).
- T2: RED = cannot find module create-order.use-case; GREEN 175 passing; tsc clean.
- T3: docs/testing.md TC-093/094/095/108/168.

## Next step
Review and local squash into develop (user decision).
- Assess: medium (executable_change), RDD off. Verification: writer self-check plus a parent spot check (175/175 Jest passing) and a readback of the use case and repository.
