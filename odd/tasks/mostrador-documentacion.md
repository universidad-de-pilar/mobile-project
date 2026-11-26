# Mostrador — Project documentation (Mobile Apps + Testing courses)

- Branch: `docs/mostrador-documentacion` (from `develop`)
- TDD: not applicable (documentation only, no behavior code).
- Artifact language: Spanish, neutral/professional (course deliverables).

## Objective
Document the pivot from the library/donations app to **Mostrador** (mostrador.io): a multi-tenant MVP where stores show content on in-store screens with a QR code that opens a self-order web with a cart, and the order is sent to the store's WhatsApp.

## Product decisions (from the conversation)
- Backoffice: Expo (React Native) for Android and web. It loads the catalog and content and shows orders.
- Backend NestJS + PostgreSQL, multi-tenant (existing `tenants`, `users`, `auth`, `roles`, `stores`).
- Screen: web player (`/screen/:token`) that rotates images/videos and shows a QR code. It polls for content changes.
- Customer web: self-order with catalog + cart, without installing an app.
- Order: saved in the backend with status "generada" and sent with a `wa.me` link (no WhatsApp Business API).
- Tenant per subdomain (`local1.mostrador.io`); store in the path or QR; a `slug` column is needed on `tenants`.
- MVP innovation: catalog from a photo (vision model).
- Out of MVP: online payments, customer accounts, stock.
- Decisión (T5): entrega del MVP el lunes 02/11/2026, desarrollo 100% con IA, alcance en dos releases (R1 demo, R2 hoja de ruta). El catálogo desde foto con IA pasa a R2 (antes era la innovación del MVP).

## Format sources
- Requirements template: Drive `Lista_de_req_con_dependencias.xlsx`. Columns: Fase, Módulo, Número, Descripción, Storyboard, Asignado a, Fecha Inicio, Fecha Fin, Duración, Observación, PERT estimates in days (Backend, Frontend, Implementación, Base de datos, Testing, Analistas), Depende de (bloqueante), Dependencias deseables.
- Course PDFs: PERT/Gantt (U6), Debugging (Clase 6 U5), Continuous improvement/ISO 25010/DORA/LEAN (Clase 5 U4), Testware/RTM/Gherkin/checklists (5.3 and Clase 7 U5).

## Tasks
- [x] T1 — `docs/requerimientos.xlsx`: RF + RNF in the template format, PERT a/m/p per area, dependencies (route: delegated writer, trigger: preparation + 2+ non-trivial files)
- [x] T2 — `docs/funcional.md` (scope, actors, user stories + Gherkin) and `docs/no-funcional.md` (RNF by ISO 25010 with measurable indicators) (route: same delegated writer)
- [x] T3 — `docs/planificacion.md` (WBS, PERT, critical path, Gantt), `docs/testing.md` expanded with testware (plan, cases, RTM, checklists, debugging, defect template), `docs/indicadores.md` (indicators by stage, Pareto, Ishikawa, LEAN, DORA) (route: delegated writer)
- [x] T4 — Reglas validadas por el usuario (pedidos sin WhatsApp, carrito 1–50, mensaje en partes) y 3 tests por requerimiento (route: delegated writer)
- [x] T5 — Ajustar cronograma a la fecha de entrega: R1 (demo 02/11/2026) y R2 (route: delegated writer)
- [x] T6 — `docs/modelo-datos.md` y `docs/api.md` (commit 42812d7)
- [x] T7 — Reincorporar RF-012, RNF-001 y RNF-009 a R1 y replanificar R1/R2 (route: delegated writer)

## Acceptance
- Every RF/RNF has a unique ID used consistently across all documents.
- Every MVP RF has at least one user story, one Gherkin criterion and one test case in the RTM.
- Every RNF has a measurable target.
- PERT values are consistent with the expected duration (a+4m+p)/6, and the critical path matches the dependencies.

## Progress
- Branch created. Feature document created.
- T1 done (commit 9435f59): `docs/requerimientos.xlsx` with 35 RF + 18 RNF, PERT p/m/o per area, schedule from 02/11/2026. Checks: IDs unique, all dependency IDs exist, every RNF Observacion has a measurable number, no requirement starts before its blocking dependencies end, no weekend dates. Critical path RF-001 > 003 > 010 > 011 > 013 > 014 > 025 > 026 > 027 > 028 > 029, ends 23/02/2027.
- T2 done: `docs/funcional.md` (23 user stories HU-01..HU-23, Mermaid architecture) and `docs/no-funcional.md` (18 RNF by ISO 25010). grep check: every RF in funcional.md and every RNF in no-funcional.md.

- T3 done (commits c149f97 planificacion, 2f55f20 testing, 07c9d9d indicadores). Checks: PERT/CPM computed by script from the xlsx; critical path matches (RF-001 > 003 > 010 > 011 > 013 > 014 > 025 > 026 > 027 > 028 > 029, 82 working days, ends 23/02/2027; M = 78,67 d, sigma = 2,25 d); computed dates and durations equal the xlsx for all 53 rows. Effort total M = 317,33 person-days. Parallel-areas scenario: 37 days, ends 22/12/2026. 128 test cases; RTM has all 35 RF and 18 RNF; all 23 HU have at least one TC and a negative/limit/security TC; original testing.md sections preserved verbatim (headings demoted one level). Defect template in `.github/ISSUE_TEMPLATE/defecto.md`.

- T4 done (commits aff78a0 requerimientos/funcional/no-funcional, b46a062 testing/indicadores/planificacion). Rules: store without WhatsApp number still registers the order ("generada", visible in backoffice; web skips wa.me); cart quantity 1–50; long WhatsApp message split in parts of up to 1500 chars (configurable proposal) with "Pedido #N — parte i/M", one "Enviar parte N/M" button per part, items never split. Implemented by extending RF-034 (no RF-036, PERT and dates unchanged; T5 will redo dates). Test plan: new "Estrés" type and rule "Cada requerimiento tiene como mínimo 3 casos: feliz, negativo y de estrés". Checks (scratchpad scripts): 128 -> 227 TCs; all 35 RF + 18 RNF have feliz/negativa/estrés (53 stress cases); RTM 53 rows list the three IDs; no leftover "sin número = no pedidos" nor "1 a 20" statements.

- T5 done (commits 1af487e xlsx/planificacion/funcional, 10d245d testing). `docs/requerimientos.xlsx`: columnas Release y Estimación IA (h); R1 = 29 RF + 6 RNF (35 filas) con fechas 28/10-30/10/2026 por pistas (Backend, Backoffice, Web; 8 h por pista y día), R2 = 6 RF + 12 RNF (18 filas) desde 03/11/2026 con la regla PERT, fin 14/12/2026 (camino crítico RF-015 > 016 > 017, 30 días). R1 no cabe con el alcance pedido (75 h contra 72 h de capacidad): se recortaron a R2 RF-012, RNF-001, RNF-005 y RNF-009 (6 h) y quedan 69 h (67,5 h de requerimientos + 1,5 h del contrato de API) con 3 h de holgura (Web sin holgura). Orden de recorte adicional en `docs/planificacion.md` (sección R1.6). `docs/testing.md`: columna Release en la RTM, criterio de salida de R1 y 35 casos de estrés de R1 a escala reducida en local (metas originales para R2). `docs/funcional.md`: split R1/R2 y release por HU. Checks (scratchpad `check_rel.py`, `check_rtm_rel.py`): 53 filas con Release; R1 con horas y fechas en la ventana; ninguna dependencia R1 sobre R2; horas por pista y día <= 8; R2 desde 03/11 sin fines de semana y sin iniciar antes de sus dependencias; RTM (53 filas) y 23 HU coinciden con el xlsx. Supuesto: dependencias bloqueantes entre pistas distintas cubiertas por el contrato de API (2 dependencias cruzadas se integran el 30/10).

- T6 done (commit 42812d7): `docs/modelo-datos.md` y `docs/api.md`. 32 endpoints, 19 permisos nuevos, los 30 RF de R1 cubiertos y 8 diferencias con el código existente en api.md §15. El más importante: `feature/BU-018-db-versioning` no está integrada en develop, así que el versionado SQL no existe en esta rama.

- T7 done (commits docs(planificacion) xlsx/planificacion/funcional/api y docs(testing) testing). Decisión del usuario: RF-012, RNF-001 y RNF-009 vuelven a R1 (el contrato de API ya define las rutas de imagen como R1, un QR ilegible rompe la demo y el recálculo de precios en el servidor cubre la integridad del pedido); RNF-005 sigue en R2 (los límites de tamaño se validan en R1 como validación simple en RF-012/RF-018). R1 = 30 RF + 8 RNF (38 filas), 73,5 h (72 h de requerimientos + 1,5 h de contrato) contra 72 h de capacidad: Backend 24,0, Backoffice 25,0, Web 24,5. Desbordamiento explícito a la mañana del 02/11 (08:00-12:00): Backoffice 1,0 h (cierre de RF-012) y Web 0,5 h (cierre de RNF-007); la integración con las tres pistas libres baja de 4 h a 3 h. Ruta crítica: pista Backoffice. R2 = 5 RF + 10 RNF, fin sin cambios el 14/12/2026 (RF-015 > 016 > 017). `docs/testing.md`: 172 casos R1 y 55 R2 (38 de estrés de R1 a escala reducida, 3 nuevos: TC-142, TC-182, TC-204). Checks (scratchpad `check_rel.py`, `check_rtm_rel.py`, `check_tc.py`, `check_rtm.py`): releases, horas, fechas sin fines de semana, <= 8 h por pista y día el 28-30/10, ninguna dependencia R1 sobre R2, R2 sin iniciar antes de sus dependencias, RTM y HU coinciden con el xlsx. Supuesto: el reparto por pista de las horas de RF-012 (Backend 1,0 y Backoffice 2,0), RNF-001 (Backend 1,0) y RNF-009 (Web 0,5) se infirió de los totales por pista del plan anterior.

- Decisión: `database/modelo_relacional.sql` y el módulo `products` en memoria (EduKit, PR #67 y #68, integrados desde main en e4c1e24) quedan reemplazados en R1 por `002_mostrador_r1.sql` y el contrato de `api.md` (§15 filas 9 y 10, `modelo-datos.md` §11).

## Next step
BU-018 ya integrada en develop (squash, 46/46 tests). Resolver los conflictos restantes de api.md §15 (1–7) y actualizar el tablero de GitHub Projects con tareas por RF de R1.
