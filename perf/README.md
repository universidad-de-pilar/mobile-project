# Pruebas de carga (k6)

Scripts de RNF-003 (p95 < 500 ms, errores < 1%). Requieren [k6](https://k6.io/docs/get-started/installation/), el backend levantado y la semilla `database/seeds/dev_local1.sql`. Las metas siguen pendientes de medir: no hay staging.

| Script | Caso | Qué hace |
| --- | --- | --- |
| `k6/catalog-orders.js` | TC-112 | 50 VUs, 5 min: catálogo público y creación de pedidos |
| `k6/stress.js` | estrés de `docs/indicadores.md` | `SCENARIO=load` (default): 200 VUs en catálogo y pedidos más 100 pantallas consultando cada 30 s con `If-None-Match` |
| `k6/stress.js` | TC-188 | `SCENARIO=breakpoint`: pasos de 3 min con 50, 100, 200 y 400 VUs, luego 50 VUs con 2 min de gracia y 2 min medidos |
| `k6/tenant-suspend.js` | TC-180 | 100 VUs piden en local2; a los 2 min Root suspende local2; local1 (20 VUs) debe mantener p95 < 500 ms |

```bash
k6 run -e BASE_URL=http://localhost:3000 perf/k6/catalog-orders.js
k6 run -e BASE_URL=http://localhost:3000 perf/k6/stress.js
k6 run -e BASE_URL=http://localhost:3000 -e SCENARIO=breakpoint perf/k6/stress.js
k6 run -e BASE_URL=http://localhost:3000 -e ROOT_EMAIL=... -e ROOT_PASSWORD=... perf/k6/tenant-suspend.js
```

Variables (`-e`):

| Variable | Default | Uso |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3000` | Backend; el tenant viaja en `X-Tenant-Slug` |
| `TENANT`, `STORE` | `local1`, `palermo` | Tenant y local de la carga |
| `OWNER_EMAIL`, `OWNER_PASSWORD` | usuario de la semilla | Solo para crear las pantallas de `stress.js` (`k6-1`, `k6-2`...; se reutilizan entre corridas) |
| `SCREENS` | `100` | Pantallas que consultan la playlist |
| `ROOT_EMAIL`, `ROOT_PASSWORD` | sin default | Root, solo en `tenant-suspend.js` (primer registro en el contexto admin) |

Notas:

- Los umbrales hacen fallar k6 (código distinto de cero) si no se cumplen, así que sirven en CI.
- Cada pedido incrementa `tenants.last_order_number` con un bloqueo de fila: los pedidos de un mismo tenant se serializan, por lo que `catalog-orders.js` mide también ese límite.
- Los pedidos de la carga quedan guardados: usar una base de desarrollo.
- Para TC-188 observar CPU, memoria y errores del servidor aparte; k6 solo mide el lado cliente. En el paso de 400 VUs no hay umbral: se espera degradación gradual sin caída del proceso.

# Lighthouse (RNF-002)

`lighthouse/lighthouserc.json`: Lighthouse CI móvil con 4G simulada (RTT 150 ms, 1,6 Mbps, CPU 4x más lento), 5 corridas. Falla si performance < 0,8, LCP > 2,5 s, TTI > 3 s, imágenes > 600 KB o peso total > 2 MB (el presupuesto de recursos va como aserciones `resource-summary:*`: LHCI no permite mezclarlo con un `budget.json`). Una imagen de 3 MB sin redimensionar lo rompe (TC-184). Meta pendiente de medir: no hay staging ni la web publicada.

```bash
# Editar `collect.url` en el archivo (o usar --collect.url) con la URL del autopedido de staging, p. ej. https://local1.staging.mostrador.io/palermo
npx @lhci/cli autorun --config=perf/lighthouse/lighthouserc.json
# TC-185: lanzar antes k6 (stress.js, 200 VUs) y correr esto durante la carga
```

`@lhci/cli` no es dependencia del proyecto: se ejecuta con `npx`. La caché del catálogo (`Cache-Control: public, max-age=60, stale-while-revalidate=300` + `ETag`) hace que las visitas repetidas no vuelvan a descargarlo; a cambio, un cambio en el catálogo puede tardar hasta ~1 min en verse.
