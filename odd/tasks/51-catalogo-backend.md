# #51: Backoffice catalog backend (categories, products, image, availability)

Branch: `feature/51-catalogo-backend` (from `develop`).

## Objective
NestJS endpoints for RF-010..RF-013 as specified in `docs/api.md` (categories, products, product image, public catalog, `/media` static).

## Scope
- In: backend only. Tables, indexes and permission seeds already exist in `database/scripts/002_mostrador_r1.sql` (no SQL script needed).
- Out: Expo backoffice UI (frontend of #51), e2e/supertest harness with a test DB (not existing; scope decision pending).

## Constraints
- Tenant only from `req.tenant`; every query `WHERE <pk>=$1 AND tenant_id=$2`; other-tenant ids give 404.
- Store ownership check → 404 `STORE_NOT_FOUND`, shared by all tasks.
- Errors: Nest exceptions with `{statusCode, message, error, code}`.
- TDD: on (source: global CLAUDE.md "Strict TDD Mode: enabled"). Runner from `backend/`: `npx jest --rootDir . --modulePaths "<rootDir>"`.
- Removing the legacy in-memory `backend/src/products` breaks legacy EduKit screens in `mobile/src/lib/products.ts` (public `GET /products`); they are replaced by the #51 frontend.
- New dependency: `sharp` (resize to max 1280 px), only in T4.

## Tasks
- [x] T1 Categories: CRUD + store ownership check; 409 `CATEGORY_NAME_TAKEN` (pg 23505), 409 `CATEGORY_HAS_PRODUCTS` (pg 23503). Route: delegated (writer trigger: 2+ non-trivial files).
- [x] T2 Products: CRUD, availability via PATCH, 200-per-store limit (422), category-in-same-store check, `image_path`→`image_url` mapping; remove legacy products module. Route: delegated.
- [x] T3 Public catalog: `GET /public/stores/:storeSlug/catalog`, available only, grouped, empty categories omitted. Route: delegated.
- [x] T4 Image: `PUT/DELETE /products/:id/image`, magic-byte check (415), sharp decode (422), 5 MB boundary with `MEDIA_TOO_LARGE` (413), resize ≤1280 px, write-new→update DB→delete-old; `/media/*` static excluded from TenantMiddleware. Route: delegated.

## Acceptance (from issue)
- Create, edit and order categories.
- Create and edit products with name, price, category and image.
- Unavailable product leaves the public catalog.
- Data scoped to the user's tenant.

## Delivery
- Forecast: ~1200 authored lines (> 400). Strategy: ask-on-risk → user chose `feature-branch-chain` (one work-unit commit per task on this branch, integrated to develop at the end).

## Progress
- Branch created; exploration done. T1, T2, T3, T4 done.

## Evidence
- T1: commit `feat(categories): se agrega CRUD de categorias acotado al tenant` (hash via `git log`). RED: spec failed on missing modules (89 existing tests passing). GREEN: 17 suites, 101 tests (12 new). `tsc --noEmit` and `npm run build` clean. Supertest TC-026..029 pending (no e2e harness).
- T2: commit `feat(products): se agrega CRUD de productos con disponibilidad acotado al tenant` (hash via `git log`). RED: spec failed on missing modules (101 existing tests passing). GREEN: 18 suites, 129 tests (28 new). `tsc --noEmit` and `npm run build` clean; legacy in-memory products removed (no `ProductsService` references). Repository drops undefined keys before `update` (T1 verifier note). Supertest cases pending (no e2e harness).
- T3: commit `feat(catalogo): se agrega catalogo publico por local con productos disponibles` (hash via `git log`). RED: spec failed on missing module (129 existing tests passing). GREEN: 19 suites, 134 tests (5 new). `tsc --noEmit` and `npm run build` clean. Store lookup `findActiveStoreBySlug` on the tenant repository; single SQL join in `findCatalog` (available only, ordered, empty categories dropped by inner join), grouping in use case. SQL path and supertest cases pending (no e2e harness).
- T4: commit `feat(products): se agrega carga de imagen de producto con redimension y servido en /media` (hash via `git log`). RED: 4 new suites failed on missing modules (137 existing passing). GREEN: 24 suites, 162 tests (28 new). `tsc --noEmit` and `npm run build` clean. `sharp` added (^0.35.5). Magic bytes in `domain/product-image.ts`; `IImageStorage` port + `LocalImageStorage` (sharp, `UPLOADS_DIR`); 413 via `MediaTooLargeFilter` (multer 2.4 limit is inclusive: 5 242 880 accepted, +1 rejected, verified by supertest on a stub controller); `/media` via `app.useStaticAssets` (`serveMedia`), verified to bypass a rejecting middleware. `UPLOADS_DIR=./uploads` still to add to `.env.example` (edit denied for the writer). Supertest of the real endpoints pending (no e2e harness).

- Hashes: T1 b55305c, T2 a8cb897, T3 07e5817, T4 f0f9026.
- Independent verifiers (assess risk: high, RDD off) → fixes: 2c3f422 (partial PATCH no longer nulls columns), 523baeb (explicit null on NOT NULL PATCH fields → 400), 98686c8 (old-image delete failure logged, not 500), 6672160 (sharp limitInputPixels 40 MP, /media redirect:false). Final: 24 suites, 162 tests; tsc exit 0.
- Not run against a real DB: SQL paths (pg error mapping, catalog join, NUMERIC formatting) need a manual smoke test.

## Next step
Backoffice frontend of #51 (out of this branch's backend scope); supertest harness decision pending.
