# Mostrador: requerimientos no funcionales

Los identificadores RNF-xxx coinciden con `docs/requerimientos.xlsx`. Se agrupan según los atributos de calidad de ISO/IEC 25010. Prioridad MVP: Alta (imprescindible para la entrega), Media (deseable en el MVP), Baja (puede diferirse).

## Adecuación funcional

| ID | Descripción | Meta medible | Verificación | Prioridad |
| --- | --- | --- | --- | --- |
| RNF-001 | Integridad del pedido y del mensaje de WhatsApp | 100% de coincidencia en ítems, cantidades y total en 50 pedidos de prueba; cada parte del mensaje de hasta 1500 caracteres; los pedidos más largos se dividen en partes numeradas sin cortar ítems | Pruebas automatizadas de integración (Jest) | Alta |

## Eficiencia de desempeño

| ID | Descripción | Meta medible | Verificación | Prioridad |
| --- | --- | --- | --- | --- |
| RNF-002 | Tiempo de carga del autopedido | Carga < 3 s en 4G simulada; LCP ≤ 2,5 s; performance Lighthouse ≥ 80 (palancas: caché HTTP del catálogo, imágenes ≤ 1280 px; configuración en `perf/lighthouse/`; sin medir, falta staging) | Lighthouse (móvil, 4G) | Alta |
| RNF-003 | Tiempo de respuesta de la API | p95 < 500 ms con 50 usuarios concurrentes; errores < 1% (scripts en `perf/k6/`) | k6 o JMeter | Alta |
| RNF-004 | Latencia de actualización de la pantalla | Consulta cada 30 s; cambio visible en ≤ 60 s en el 95% de las pruebas | Prueba manual cronometrada y prueba automatizada (Playwright) | Media |
| RNF-005 | Límites de tamaño del contenido | Imagen ≤ 5 MB; video ≤ 50 MB y ≤ 60 s; archivos mayores rechazados con 413 | Pruebas de API (Jest) y manual en límites | Alta |

## Compatibilidad

| ID | Descripción | Meta medible | Verificación | Prioridad |
| --- | --- | --- | --- | --- |
| RNF-006 | Navegadores y sistemas operativos soportados | Android 10+; últimas 2 versiones de Chrome, Edge y Safari; 0 defectos bloqueantes en la matriz | Playwright multinavegador y pruebas manuales en dispositivos | Alta |

## Usabilidad

| ID | Descripción | Meta medible | Verificación | Prioridad |
| --- | --- | --- | --- | --- |
| RNF-007 | Diseño responsive desde 360 px | Sin scroll horizontal en 360, 768 y 1280 px | Playwright con viewports; revisión manual | Alta |
| RNF-008 | Accesibilidad WCAG 2.1 AA básica | Contraste ≥ 4,5:1; 0 violaciones críticas en axe; navegación por teclado completa | axe (Playwright), Lighthouse accesibilidad y revisión manual | Media |
| RNF-009 | QR legible a distancia | Lectura a 1,5 m en ≥ 95% de 20 intentos con 3 celulares; lado del QR ≥ 8% del alto de la pantalla | Prueba manual en televisor real | Alta |

## Fiabilidad

| ID | Descripción | Meta medible | Verificación | Prioridad |
| --- | --- | --- | --- | --- |
| RNF-010 | Reproducción sin conexión | Reproduce el último contenido 24 h sin red; resincroniza en ≤ 60 s al volver la red | Playwright con red desactivada y prueba manual prolongada | Alta |
| RNF-011 | Copias de seguridad diarias | Backup diario, retención 7 días, RPO ≤ 24 h, restauración probada en ≤ 1 h | Simulacro de restauración y revisión de la tarea programada | Media |

## Seguridad

| ID | Descripción | Meta medible | Verificación | Prioridad |
| --- | --- | --- | --- | --- |
| RNF-012 | Aislamiento entre tenants | 0 accesos entre tenants; todo endpoint con datos de otro tenant responde 403/404 | Batería de pruebas de autorización (Jest e2e) | Alta |
| RNF-013 | HTTPS con certificado wildcard | Certificado *.mostrador.io vigente; TLS 1.2+; 100% HTTP redirigido a HTTPS | SSL Labs (≥ A) y revisión de redirecciones | Alta |
| RNF-014 | Contraseñas con hash bcrypt | 100% de las contraseñas con bcrypt de costo ≥ 10; 0 en logs | Revisión de código y prueba unitaria | Alta |
| RNF-015 | Secretos fuera del repositorio | 0 secretos detectados en el repositorio e historial | gitleaks en CI | Alta |

## Mantenibilidad

| ID | Descripción | Meta medible | Verificación | Prioridad |
| --- | --- | --- | --- | --- |
| RNF-016 | Cobertura de pruebas del backend | Cobertura de líneas ≥ 70% en casos de uso | Jest con `--coverage` y umbral en CI | Media |
| RNF-017 | Logging estructurado | 100% de logs en JSON con requestId y tenantId; 0 datos sensibles | Revisión de código y muestreo de logs | Media |

Convención de RNF-017: un solo evento por solicitud HTTP, en stdout, con el esquema canónico; `request_id` y `tenant_id` van dentro de `events` (`tenant_id: null` si no se resolvió el tenant, por ejemplo en el host de administración). `LOG_MODE=json` en producción (se define en las variables de entorno del Container App; por defecto `clf`, una línea legible para desarrollo). Nunca se registran cuerpos, encabezados crudos ni claves `password`, `token`, `authorization`, `cookie` o `secret`.

## Portabilidad

| ID | Descripción | Meta medible | Verificación | Prioridad |
| --- | --- | --- | --- | --- |
| RNF-018 | Backoffice multiplataforma | ≥ 90% del código compartido entre Android y web; builds de APK y web en ≤ 30 min en CI | Análisis de estructura del repositorio y tiempos de CI | Media |

Convención de RNF-018: `npm run shared-code` (en `mobile`) cuenta líneas no vacías de `src/` sin tests; son específicos de plataforma los archivos con sufijo `.web`, `.android`, `.ios` o `.native`. El workflow `mobile-build.yml` lo ejecuta y arma el APK debug y el export web con tope de 30 min por job.

## Verificación y validación

- **Verificación** ("¿construimos el producto correctamente?"): comprueba que cada RNF cumple su meta con las herramientas de la tabla (Lighthouse, k6/JMeter, Jest, Playwright, gitleaks). Se ejecuta en cada entrega y los resultados se registran en `docs/testing.md`.
- **Validación** ("¿construimos el producto correcto?"): prueba de aceptación de usuario (UAT) con un comercio real. Un dueño y un empleado cargan su catálogo, usan la pantalla durante una jornada y atienden pedidos reales de clientes. Se mide si el flujo QR a WhatsApp resulta comprensible (clientes que completan el pedido sin ayuda) y se recoge su opinión sobre la carga de catálogo desde foto.
- Un RNF solo se da por cumplido si la verificación obtiene el valor meta; la UAT no reemplaza las mediciones técnicas.
