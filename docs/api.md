# Mostrador: contrato de API (R1)

Contrato HTTP para el MVP del 02/11/2026 (R1). Es la referencia compartida entre las tres pistas de trabajo: backend, backoffice (Expo) y web (autopedido y reproductor de pantalla). Los nombres de campos coinciden con las columnas de `docs/modelo-datos.md`; los identificadores RF-xxx y HU-xx son los de `docs/requerimientos.xlsx` y `docs/funcional.md`.

Regla de oro: si el código y este documento difieren, se corrige el que esté equivocado **en el mismo cambio** y se avisa a las otras pistas. La sección 15 lista las diferencias conocidas hoy.

## 1. Convenciones

### 1.1 URL base y formato

| Entorno | URL base |
| --- | --- |
| Desarrollo | `http://local1.localhost:3000` (el backend escucha en `PORT`, por defecto 3000) |
| Producción | `https://{slug}.mostrador.io` (el proxy inverso entrega al backend la ruta sin prefijo; el detalle del despliegue es R2) |

- Las rutas de este documento son las del backend, sin prefijo global (como hoy: `POST /auth/login`).
- Cuerpos y respuestas en JSON (`Content-Type: application/json`), salvo las subidas de archivos (`multipart/form-data`) y los archivos estáticos.
- Los campos JSON van en `snake_case`, igual que los DTO existentes (`first_name`, `access_token`) y que las columnas.
- El backend usa `ValidationPipe({ whitelist: true, transform: true })`: los campos desconocidos del body se descartan sin error (no hay `forbidNonWhitelisted`).
- Los identificadores son UUID. Los campos `*_url` de archivos son rutas relativas a la URL base (`/media/...`).

### 1.2 Resolución del tenant

Toda ruta, salvo `/auth/*` y las del contexto admin (ver abajo), necesita un tenant. El backend lo resuelve así (RF-002):

1. Se toma el Host de la solicitud. Si es `{slug}.{BASE_DOMAIN}`, ese `slug` se busca en `tenants.slug`. `BASE_DOMAIN` es `localhost` en desarrollo (`local1.localhost`) y `mostrador.io` en producción.
2. Si el Host no trae subdominio utilizable (por ejemplo la app Android de Expo, que llama a una IP o a un host fijo) se lee el encabezado `X-Tenant-Slug: local1`. Ese encabezado solo se usa cuando el Host no aporta un slug.
3. Responde **404** con `code: "TENANT_NOT_FOUND"` si el slug no existe, está en la lista reservada (`www`, `api`, `app`), tiene formato inválido o el tenant está inactivo (`is_active = false`).
4. **Contexto admin (plataforma):** el slug reservado `admin` (`admin.{BASE_DOMAIN}` o `X-Tenant-Slug: admin`) no es un tenant: no se adjunta ninguna fila de `tenants` y la solicitud queda marcada como contexto de administrador de la plataforma. En ese contexto solo responden `/auth/*`, `/me` y `/tenants*`; cualquier otra ruta (`/stores`, `/public/*`, `/media/*`, etc.) da 404 `TENANT_NOT_FOUND`, así que el contexto admin nunca expone datos de un tenant.

El tenant resuelto es el único `tenant_id` que usa cualquier consulta (ver aislamiento en `docs/modelo-datos.md`, sección 4).

### 1.3 Tres audiencias y su autenticación

| Audiencia | Quién | Autenticación | Prefijo de rutas |
| --- | --- | --- | --- |
| Backoffice | Dueño y empleado, app Expo (Android y web) | `Authorization: Bearer <access_token>` (JWT del login existente) | `/me`, `/stores`, `/categories`, `/products`, `/content`, `/screens`, `/orders` |
| Administrador de la plataforma | Usuario con rol `root`, en `admin.{BASE_DOMAIN}` | `Authorization: Bearer <access_token>` | `/me`, `/tenants` (y `/auth/*` para entrar) |
| Pantalla | Televisor con el reproductor `/screen/:token` | El token de la pantalla en la ruta; sin login | `/player/:token/...` |
| Cliente público | Persona que escanea el QR | Anónimo; tenant por Host | `/public/...` y archivos en `/media/...` |

- Backoffice: el guard JWT es global y ya existe; las rutas públicas lo omiten con `@Public()`. Las rutas del backoffice usan `@RequirePermissions('<codigo>')` (códigos en la sección 12). Además de un JWT válido, el usuario debe ser **miembro activo del tenant del Host**: fila en `users_tenants` con `user_id = sub`, `tenant_id` resuelto e `is_active = true`; si no, 403 `NOT_A_MEMBER`. El rol `root` es la excepción: pasa el guard de pertenencia y el de permisos en **cualquier** tenant (administra todo), y es el único usuario aceptado en el contexto admin, donde no hay tenant.
- Las rutas `/player/*`, `/public/*`, `/media/*` y `/auth/*` son `@Public()`.

### 1.4 Formato de errores

El backend devuelve el formato por defecto de NestJS, y así se mantiene:

```json
{ "statusCode": 400, "message": ["email must be an email"], "error": "Bad Request" }
```

- `message` es un `string` (excepciones lanzadas con texto, por ejemplo `"Las credenciales no son correctas"`) o un `string[]` (errores de validación de `class-validator`).
- Extensión de R1, compatible con lo anterior: algunos errores agregan `code` (texto estable para que el cliente decida) y `details` (datos del error). El cliente no debe depender de `message`, solo de `statusCode` y `code`.

```json
{ "statusCode": 409, "message": "Hay productos no disponibles", "error": "Conflict",
  "code": "PRODUCTS_UNAVAILABLE", "details": [ { "product_id": "…", "name": "…", "reason": "unavailable" } ] }
```

Errores comunes a todas las rutas del backoffice (no se repiten en cada endpoint):

| Estado | Cuándo |
| --- | --- |
| 400 | Falla de validación del body, la query o un parámetro de ruta que no es UUID. |
| 401 | Falta el encabezado `Authorization`, el esquema no es `Bearer`, el token es inválido o venció. |
| 403 | El usuario no tiene el permiso requerido; o `code: "NOT_A_MEMBER"` si no es miembro del tenant del Host (en el contexto admin, si no es `root`). |
| 404 | `code: "TENANT_NOT_FOUND"` (ver 1.2). Un identificador que no existe **o es de otro tenant** también da 404 (RNF-012). |

Códigos de error de R1: `TENANT_NOT_FOUND`, `NOT_A_MEMBER`, `STORE_NOT_FOUND`, `SCREEN_NOT_FOUND`, `CONTENT_NOT_FOUND`, `CONTENT_LIST_MISMATCH`, `DURATION_NOT_ALLOWED`, `EMPTY_UPDATE`, `CATEGORY_NAME_TAKEN`, `CATEGORY_HAS_PRODUCTS`, `PRODUCT_LIMIT_REACHED`, `PRODUCTS_UNAVAILABLE`, `INVALID_STATUS_TRANSITION`, `MEDIA_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `VIDEO_TOO_LONG`, `MEDIA_UNREADABLE`, `ADMIN_ALREADY_EXISTS`, `USER_NOT_FOUND`, `INVALID_SLUG`, `SLUG_TAKEN`.

### 1.5 Paginación, fechas y dinero

- Solo `GET /orders` pagina: `?page=1&limit=20` (`page` ≥ 1; `limit` de 1 a 100, por defecto 20). Respuesta `{ "data": [...], "meta": { "page", "limit", "total" } }`. Las demás listas devuelven un arreglo JSON simple (catálogo hasta 200 productos por local, playlist y pantallas son pocas filas).
- Fechas y horas: ISO 8601 en UTC con milisegundos y `Z` (`2026-11-02T15:30:00.000Z`), igual que `toISOString()` del código actual. Los filtros `from` y `to` de `GET /orders` son instantes ISO 8601; `from` es inclusive y `to` exclusivo.
- Dinero: **cadena decimal con exactamente dos decimales y punto**, tanto en pedidos como en respuestas (`"1500.00"`). En requests se acepta `^[0-9]{1,7}(\.[0-9]{1,2})?$`. No hay campo de moneda (pesos). Nunca `number` en JSON, para no perder precisión.
- Booleanos y nulos: un campo opcional sin valor se devuelve como `null`, no se omite.

### 1.6 Variables de entorno nuevas

`BASE_DOMAIN`, `WEB_ORIGIN_TEMPLATE` (por ejemplo `https://{slug}.mostrador.io`; en desarrollo `http://{slug}.localhost:8081`), `UPLOADS_DIR`, `WHATSAPP_MAX_PART_CHARS` (1500), `PLAYER_POLL_SECONDS` (30), `DEFAULT_IMAGE_SECONDS` (10). Ya existen `JWT_SECRET`, `JWT_EXPIRE_SECONDS` y `DB_*`.

## 2. Autenticación existente (no se renombra)

Implementada en `backend/src/auth/api/auth.controller.ts`. Rutas `@Public()`. No necesitan tenant.

### `POST /auth/register`

- Auth: ninguna. Permiso: ninguno. Relacionado: RF-005, HU-04.
- Request (en un tenant o sin tenant resuelto crea un usuario común; en el contexto admin ver abajo):

```json
{ "email": "juan@correo.com", "password": "Password123!", "first_name": "Juan", "last_name": "Perez" }
```

| Campo | Regla (`register-user.dto`) |
| --- | --- |
| `email` | email válido |
| `password` | texto, mínimo 8 caracteres, al menos una minúscula, una mayúscula, un número y un carácter especial |
| `first_name`, `last_name` | texto, mínimo 3 caracteres |

- Respuesta **201**:

```json
{ "user_id": "5b0f0c6e-…", "email": "juan@correo.com", "first_name": "Juan", "last_name": "Perez", "created_at": "2026-11-02T15:30:00.000Z" }
```

- Errores: 400 validación; 409 `El email {email} ya se encuentra registrado`; 403 `ADMIN_ALREADY_EXISTS` solo en el contexto admin.
- Fuera del contexto admin el registro crea solo el usuario; no lo vincula a un tenant ni le da rol. El dueño de un tenant nuevo se registra así y luego el `root` lo vincula al crear el tenant (`POST /tenants`, sección 3.1).
- **Primer administrador:** en el contexto admin (`admin.{BASE_DOMAIN}` o `X-Tenant-Slug: admin`) el primer registro, mientras ningún usuario tenga el rol `root`, crea el usuario y le asigna `root` en una transacción protegida con un candado de base de datos (`pg_advisory_xact_lock`), por lo que dos primeros registros simultáneos no pueden crear dos `root`. Si ya existe un `root`, el registro en el contexto admin se rechaza con **403** `ADMIN_ALREADY_EXISTS` y no se crea el usuario. No hace falta la semilla de desarrollo.

### `POST /auth/login`

- Auth: ninguna. Permiso: ninguno. Relacionado: RF-005, RF-009, HU-04.
- Request:

```json
{ "email": "juan@correo.com", "password": "Password123!" }
```

| Campo | Regla (`login-user.dto`) |
| --- | --- |
| `email` | email válido |
| `password` | texto, mínimo 8 caracteres |

- Respuesta **200**:

```json
{ "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…" }
```

- Payload del JWT (`JwtTokenService`): `{ "sub": "<user_id>", "email": "<email>", "iat": …, "exp": … }`. **No contiene tenant ni permisos**: el tenant sale del Host y los permisos se leen de la base en cada solicitud (`PermissionsGuard`). Expiración: `JWT_EXPIRE_SECONDS`.
- Errores: 400 validación; 401 `Las credenciales no son correctas` para usuario inexistente, inactivo o contraseña incorrecta (RF-005).
- El cliente envía luego `Authorization: Bearer <access_token>` en todo el backoffice.

## 3. Backoffice: sesión

### `GET /me`

- Auth: JWT. Permiso: ninguno (solo miembro del tenant, o `root`). RF-007, RF-009.
- Uso: tras el login, el backoffice conoce su tenant, sus locales y qué botones mostrar.
- Respuesta **200**:

```json
{
  "user": { "user_id": "5b0f0c6e-…", "email": "juan@correo.com", "first_name": "Juan", "last_name": "Perez" },
  "tenant": { "tenant_id": "c1a2…", "name": "Local Uno", "slug": "local1" },
  "stores": [ { "store_id": "9d3e…", "name": "Palermo", "slug": "palermo" } ],
  "permissions": ["categories:read", "orders:read", "orders:update"],
  "is_root": false
}
```

- `is_root` es `true` para el administrador de la plataforma. En el contexto admin la respuesta es `"tenant": null`, `"stores": []`, `permissions` con todos los códigos (los recibe `root`) e `is_root: true`. Un `root` que llama a `/me` en el Host de un tenant recibe ese tenant y sus locales.
- Errores: solo los comunes (en el contexto admin, 403 `NOT_A_MEMBER` si el usuario no es `root`).

### 3.1 Administrador de la plataforma: tenants (`/tenants`)

Solo en el contexto admin (`admin.{BASE_DOMAIN}` o `X-Tenant-Slug: admin`, sección 1.2) y solo para `root`. Cualquier otro usuario recibe 403.

#### `GET /tenants`

- Auth: JWT. Permiso: `tenants:read`.
- Respuesta **200**:

```json
[ { "tenant_id": "c1a2…", "name": "Local Uno", "slug": "local1", "is_active": true, "created_at": "2026-11-02T15:30:00.000Z" } ]
```

#### `POST /tenants`

- Auth: JWT. Permiso: `tenants:create`. Crea, en una sola transacción, el tenant, su primer local y los vínculos del dueño (`users_tenants` con rol `owner`, `users_stores` y `users_roles` `owner`).
- Request:

```json
{ "name": "Local Tres", "slug": "local3", "store": { "name": "Centro", "slug": "centro", "address": "Av. Siempre Viva 742" }, "owner_email": "dueno@local3.com" }
```

| Campo | Regla |
| --- | --- |
| `name` | texto 1 a 150 caracteres, obligatorio |
| `slug` | 3 a 30 caracteres en minúscula, dígitos o guion, sin guion al inicio ni al final; no puede ser `www`, `api`, `app` ni `admin` |
| `store.name` | texto 1 a 150, obligatorio |
| `store.slug` | mismo formato que el slug del tenant; no puede ser `screen`, `media` ni `api` |
| `store.address` | texto hasta 255, opcional |
| `owner_email` | email de un usuario **ya registrado** (`POST /auth/register`); el dueño debe registrarse primero |

- Respuesta **201**:

```json
{
  "tenant_id": "c1a2…", "name": "Local Tres", "slug": "local3", "is_active": true, "created_at": "2026-11-02T15:30:00.000Z",
  "web_origin": "http://local3.localhost:8081",
  "store": { "store_id": "9d3e…", "name": "Centro", "slug": "centro", "address": "Av. Siempre Viva 742", "phone": null, "whatsapp_number": null, "is_active": true, "created_at": "…", "self_order_url": "http://local3.localhost:8081/centro" }
}
```

- Errores: 400 validación o `INVALID_SLUG` (formato o slug reservado); 404 `USER_NOT_FOUND` (el dueño no está registrado); 409 `SLUG_TAKEN`. Si algo falla no se crea ninguna fila.

#### `PATCH /tenants/:tenantId`

- Auth: JWT. Permiso: `tenants:update`.
- Request: al menos uno de `name` (texto 1 a 150) o `is_active` (booleano). El `slug` no se edita (los QR impresos apuntan a él). `is_active: false` suspende el tenant: sus rutas dan 404 `TENANT_NOT_FOUND` hasta reactivarlo.
- Respuesta **200**: el tenant `{ tenant_id, name, slug, is_active, created_at }`.
- Errores: 400 validación o `EMPTY_UPDATE`; 404 `TENANT_NOT_FOUND`.

## 4. Backoffice: locales (`/stores`)

Esquema `Store`:

```json
{ "store_id": "9d3e…", "name": "Palermo", "slug": "palermo", "address": "Av. Santa Fe 1234",
  "phone": "+541145550000", "whatsapp_number": "+5491112345678", "is_active": true,
  "created_at": "2026-11-02T12:00:00.000Z", "self_order_url": "http://local1.localhost:8081/palermo" }
```

`self_order_url` es de solo lectura: URL del autopedido del local (origen del tenant + `/` + `slug` del local), la misma que va en los QR.

### `GET /stores`
- Permiso: `stores:read`. RF-003. Respuesta 200: arreglo de `Store` del tenant (en R1, uno).

### `GET /stores/:storeId`
- Permiso: `stores:read`. RF-003. Respuesta 200: `Store`. Errores: 404 `STORE_NOT_FOUND`.

### `PATCH /stores/:storeId`
- Permiso: `stores:update`. RF-003, RF-033, HU-22.
- Request (todos los campos opcionales, al menos uno):

```json
{ "name": "Palermo Centro", "address": "Av. Santa Fe 1234", "phone": "+541145550000", "whatsapp_number": "+5491112345678" }
```

| Campo | Regla |
| --- | --- |
| `name` | texto 1 a 150 caracteres |
| `address` | texto hasta 255 o `null` |
| `phone` | texto hasta 50 o `null` |
| `whatsapp_number` | E.164 `^\+[1-9][0-9]{7,14}$` o `null` para borrarlo. `null` deja al local sin WhatsApp: los pedidos se siguen registrando y solo se omite `wa.me` |

- `slug` e `is_active` no se modifican en R1 (el slug forma parte de los QR ya impresos; la baja de locales es R2).
- Respuesta 200: `Store` actualizado. Errores: 400 número inválido (`message` indica el formato internacional); 404 `STORE_NOT_FOUND`.

## 5. Backoffice: categorías (`/categories`)

Esquema `Category`:

```json
{ "category_id": "3f1a…", "store_id": "9d3e…", "name": "Bebidas", "sort_order": 1,
  "created_at": "…", "updated_at": "…" }
```

### `GET /categories?store_id=<uuid>`
- Permiso: `categories:read`. RF-010. `store_id` obligatorio. Respuesta 200: arreglo de `Category` ordenado por `sort_order`, `name`. Errores: 404 `STORE_NOT_FOUND`.

### `POST /categories`
- Permiso: `categories:create`. RF-010, HU-06.
- Request:

```json
{ "store_id": "9d3e…", "name": "Bebidas", "sort_order": 1 }
```

| Campo | Regla |
| --- | --- |
| `store_id` | UUID de un local del tenant, obligatorio |
| `name` | texto 1 a 80 caracteres (se recortan espacios), obligatorio |
| `sort_order` | entero, opcional, por defecto 0 |

- Respuesta **201**: `Category`. Errores: 404 `STORE_NOT_FOUND`; 409 `CATEGORY_NAME_TAKEN` (mismo nombre en el local sin distinguir mayúsculas).

### `PATCH /categories/:categoryId`
- Permiso: `categories:update`. RF-010. Body: `name` y/o `sort_order` (mismas reglas). Respuesta 200: `Category`. Errores: 404; 409 `CATEGORY_NAME_TAKEN`.

### `DELETE /categories/:categoryId`
- Permiso: `categories:delete`. RF-010, HU-06. Respuesta **204** sin cuerpo. Errores: 404; 409 `CATEGORY_HAS_PRODUCTS` (tiene productos asociados).

## 6. Backoffice: productos (`/products`)

Esquema `Product`:

```json
{ "product_id": "7c2b…", "store_id": "9d3e…", "category_id": "3f1a…", "name": "Agua 500 ml",
  "description": "Sin gas", "price": "1500.00", "image_url": "/media/c1a2…/products/8e9f….webp",
  "is_available": true, "sort_order": 0, "created_at": "…", "updated_at": "…" }
```

`image_url` es `null` si el producto no tiene imagen.

### `GET /products?store_id=<uuid>&category_id=<uuid>&is_available=<true|false>`
- Permiso: `products:read`. RF-011, RF-013. `store_id` obligatorio; los otros dos filtros son opcionales. Respuesta 200: arreglo de `Product` ordenado por `sort_order`, `name`. Errores: 404 `STORE_NOT_FOUND`.

### `GET /products/:productId`
- Permiso: `products:read`. RF-011. Respuesta 200: `Product`. Errores: 404.

### `POST /products`
- Permiso: `products:create`. RF-011, RF-013, HU-07.
- Request:

```json
{ "store_id": "9d3e…", "category_id": "3f1a…", "name": "Agua 500 ml", "description": "Sin gas",
  "price": "1500.00", "is_available": true, "sort_order": 0 }
```

| Campo | Regla |
| --- | --- |
| `store_id` | local del tenant, obligatorio |
| `category_id` | categoría de **ese mismo local**, obligatorio |
| `name` | texto 1 a 80, obligatorio |
| `description` | texto hasta 500, opcional |
| `price` | dinero (ver 1.5), mayor que 0, hasta `9999999.99`, obligatorio |
| `is_available` | booleano, opcional, por defecto `true` |
| `sort_order` | entero, opcional, por defecto 0 |

- Respuesta **201**: `Product` con `image_url: null`. La imagen se sube aparte (`PUT /products/:id/image`).
- Errores: 400 precio menor o igual a 0 o con más de 2 decimales; 404 `STORE_NOT_FOUND` o categoría inexistente / de otro local; 422 `PRODUCT_LIMIT_REACHED` (el local ya tiene 200 productos, límite de RF-014).

### `PATCH /products/:productId`
- Permiso: `products:update`. RF-011, RF-013, HU-07, HU-08. Body: cualquiera de `category_id`, `name`, `description`, `price`, `is_available`, `sort_order` (mismas reglas, al menos uno). Cambiar `is_available` a `false` oculta el producto del catálogo público y de nuevos pedidos. Respuesta 200: `Product`. Errores: 400; 404 (producto o categoría).

### `DELETE /products/:productId`
- Permiso: `products:delete`. RF-011. Respuesta **204**. Borra también la imagen. Los pedidos anteriores conservan nombre y precio (snapshot en `order_items`). Errores: 404.

### `PUT /products/:productId/image`
- Permiso: `products:update`. RF-012, HU-07.
- Request: `multipart/form-data` con un único campo `file` (el archivo). Formatos JPG, PNG o WebP, **máximo 5 MB** (5 242 880 bytes). El tipo se valida por el contenido real del archivo. El backend redimensiona a un ancho máximo de 1280 px (sin agrandar) y guarda en `UPLOADS_DIR`; reemplaza la imagen anterior.
- Respuesta 200: `Product` con el nuevo `image_url`.
- Los límites de tamaño se validan en R1 como validación simple dentro de RF-012 y de la carga de contenido (RF-018); los casos formales de RNF-005, estrés incluido, son R2.
- Errores: 400 falta el campo `file`; 413 `MEDIA_TOO_LARGE` (más de 5 MB; exactamente 5 MB se acepta); 415 `UNSUPPORTED_MEDIA_TYPE`; 422 `MEDIA_UNREADABLE` (archivo corrupto); 404.

### `DELETE /products/:productId/image`
- Permiso: `products:update`. RF-012. Respuesta 200: `Product` con `image_url: null`. Errores: 404.

## 7. Backoffice: contenido de pantalla (`/content`)

Esquema `ContentItem`:

```json
{ "content_id": "a1b2…", "store_id": "9d3e…", "type": "image", "url": "/media/c1a2…/content/55aa….jpg",
  "original_name": "promo.jpg", "mime_type": "image/jpeg", "size_bytes": 1048576,
  "duration_seconds": 10, "sort_order": 1, "is_visible": true, "created_at": "…", "updated_at": "…" }
```

`duration_seconds`: en imágenes, segundos en pantalla (3 a 60); en videos, duración real (1 a 60, solo lectura).

### `GET /content?store_id=<uuid>`
- Permiso: `content:read`. RF-018, RF-019. `store_id` obligatorio. Respuesta 200: arreglo de `ContentItem` ordenado por `sort_order`, incluye los ocultos. Errores: 404 `STORE_NOT_FOUND`.

### `POST /content`
- Permiso: `content:create`. RF-018, HU-12.
- Request: `multipart/form-data`:

| Campo | Regla |
| --- | --- |
| `file` | obligatorio. Imagen JPG, PNG o WebP hasta **5 MB**; video MP4 hasta **50 MB** (52 428 800 bytes) y **60 s** como máximo. El tipo se valida por el contenido real. No se procesa ni se redimensiona |
| `store_id` | UUID del local, obligatorio |
| `duration_seconds` | opcional, solo para imágenes: entero de 3 a 60, por defecto `DEFAULT_IMAGE_SECONDS` (10). En un video no debe enviarse (422) |

- Se agrega al final de la playlist (`sort_order` = último + 1) y visible. La duración de un video la mide el backend con `ffprobe` y la redondea hacia arriba.
- Respuesta **201**: `ContentItem`.
- Errores: 400 falta `file` o `store_id`, o `duration_seconds` fuera de 3 a 60; 413 `MEDIA_TOO_LARGE`; 415 `UNSUPPORTED_MEDIA_TYPE` (formato fuera de la lista, por ejemplo `.exe`); 422 `VIDEO_TOO_LONG` (más de 60 s), 422 `MEDIA_UNREADABLE` (no se pudo leer la duración o el archivo está corrupto), 422 si se envía `duration_seconds` con un video; 404 `STORE_NOT_FOUND`.

### `PATCH /content/:contentId`
- Permiso: `content:update`. RF-019, HU-12.
- Request (al menos uno):

```json
{ "duration_seconds": 15, "is_visible": false }
```

| Campo | Regla |
| --- | --- |
| `duration_seconds` | entero 3 a 60; solo imágenes (en un video, 422) |
| `is_visible` | booleano; `false` oculta el contenido sin borrarlo |

- Respuesta 200: `ContentItem`. Errores: 400 duración fuera de rango (`message` indica el mínimo de 3 s); 404; 422 duración en un video.

### `PUT /content/order`
- Permiso: `content:update`. RF-019, HU-12. Fija el orden completo de la playlist de un local.
- Request:

```json
{ "store_id": "9d3e…", "content_ids": ["a1b2…", "c3d4…", "e5f6…"] }
```

`content_ids` debe contener **todos** los contenidos del local (también los ocultos) exactamente una vez; el backend asigna `sort_order` 1, 2, 3... en ese orden, en una transacción.
- Respuesta 200: arreglo de `ContentItem` en el nuevo orden. Errores: 400 si la lista está vacía o tiene repetidos; 404 `STORE_NOT_FOUND`; 422 si falta o sobra algún contenido del local.

### `DELETE /content/:contentId`
- Permiso: `content:delete`. RF-018. Respuesta **204**. Borra el archivo y deja el orden de los restantes consecutivo. Errores: 404.

## 8. Backoffice: pantallas (`/screens`)

Esquema `Screen`:

```json
{ "screen_id": "d4e5…", "store_id": "9d3e…", "name": "Entrada",
  "token": "q7Vx2n…43caracteres", "player_url": "https://local1.mostrador.io/screen/q7Vx2n…",
  "is_active": true, "created_at": "…", "updated_at": "…" }
```

`player_url` = `WEB_ORIGIN_TEMPLATE` con el slug del tenant + `/screen/` + `token`. El QR que muestra el reproductor lo calcula el backend (sección 10).

### `GET /screens?store_id=<uuid>`
- Permiso: `screens:read`. RF-020. `store_id` obligatorio. Respuesta 200: arreglo de `Screen`. Errores: 404 `STORE_NOT_FOUND`.

### `POST /screens`
- Permiso: `screens:create`. RF-020, HU-13.
- Request:

```json
{ "store_id": "9d3e…", "name": "Entrada" }
```

`name`: texto 1 a 80, obligatorio. El token se genera en el servidor (32 bytes aleatorios, base64url).
- Respuesta **201**: `Screen`. Errores: 404 `STORE_NOT_FOUND`.

### `PATCH /screens/:screenId`
- Permiso: `screens:update`. RF-020. Body: `name` y/o `is_active`. `is_active: false` hace que el reproductor reciba 404 (acceso revocado). No hay borrado en R1 para conservar el origen de los pedidos. Respuesta 200: `Screen`. Errores: 404.

## 9. Backoffice: órdenes (`/orders`)

Esquema `OrderSummary` (lista):

```json
{ "order_id": "f0a1…", "order_number": 123, "store_id": "9d3e…", "status": "generada",
  "customer_name": "Ana", "note": "Sin hielo", "total": "3000.00", "items_count": 2,
  "source_screen": { "screen_id": "d4e5…", "name": "Entrada" },
  "created_at": "2026-11-02T15:30:00.000Z", "status_changed_at": "2026-11-02T15:30:00.000Z",
  "status_changed_by": null }
```

`source_screen` es `null` si no hay origen. Esquema `Order` (detalle) = `OrderSummary` + `items`:

```json
"items": [ { "line_number": 1, "product_id": "7c2b…", "product_name": "Agua 500 ml",
             "unit_price": "1500.00", "quantity": 2, "line_total": "3000.00" } ]
```

`status_changed_by` es el `user_id` de quien hizo el último cambio, `null` si aún no hubo cambios. `product_id` puede ser `null` si el producto se borró.

### 9.1 `GET /orders`
- Permiso: `orders:read`. RF-031, HU-21.
- Query:

| Parámetro | Regla |
| --- | --- |
| `store_id` | UUID, obligatorio |
| `status` | opcional: `generada`, `en_preparacion`, `lista`, `entregada` o `cancelada` |
| `from`, `to` | opcionales, ISO 8601 (`from` inclusive, `to` exclusivo) |
| `page`, `limit` | ver 1.5 |

- Orden fijo: `created_at` descendente (más recientes primero).
- Respuesta 200:

```json
{ "data": [ { "order_id": "f0a1…", "order_number": 123, "status": "generada", "…": "…" } ],
  "meta": { "page": 1, "limit": 20, "total": 1 } }
```

Lista vacía: `{ "data": [], "meta": { "page": 1, "limit": 20, "total": 0 } }` (el cliente muestra "aún no hay órdenes").
- Errores: 400 `status` desconocido, fecha inválida o `limit` fuera de rango; 404 `STORE_NOT_FOUND`.

### 9.2 `GET /orders/:orderId`
- Permiso: `orders:read`. RF-031. Respuesta 200: `Order`. Errores: 404.

### 9.3 `PATCH /orders/:orderId/status`
- Permiso: `orders:update`. RF-032, HU-21.
- Request:

```json
{ "status": "en_preparacion" }
```

`status`: uno de los cinco estados.
- Efecto: si la transición es válida (9.4), guarda `status`, `status_changed_at = ahora` y `status_changed_by` = `sub` del JWT.
- Respuesta 200: `Order` actualizado.
- Errores: 400 estado desconocido; 404; 409 `INVALID_STATUS_TRANSITION` con `details: { "from": "entregada", "to": "generada", "allowed": [] }` (también cuando `to` es igual al estado actual).

### 9.4 Transiciones de estado

| Desde | Hacia permitido |
| --- | --- |
| `generada` | `en_preparacion`, `cancelada` |
| `en_preparacion` | `lista`, `cancelada` |
| `lista` | `entregada`, `cancelada` |
| `entregada` | (ninguno, estado final) |
| `cancelada` | (ninguno, estado final) |

Etiquetas para mostrar: generada, en preparación, lista, entregada, cancelada. No se permite saltar estados (de `generada` a `lista`) ni volver atrás.

## 10. Pantalla: reproductor (`/player/:token/playlist`)

Audiencia: televisor. Sin login. El reproductor web vive en la ruta `/screen/:token` de la web; esta es la API que consume.

### `GET /player/:token/playlist`
- Auth: `@Public()`; el token en la ruta es la credencial. Tenant por Host. RF-021, RF-022, RF-023, RF-024, HU-14, HU-15.
- Encabezados de request: `If-None-Match: "<version>"` (opcional, el `ETag` recibido la vez anterior).
- Respuesta **200** (con `ETag: "<version>"` y `Cache-Control: no-cache`):

```json
{
  "version": "a3f9c2d41b7e08f5",
  "poll_interval_seconds": 30,
  "store": { "name": "Palermo", "slug": "palermo" },
  "qr_url": "https://local1.mostrador.io/palermo?src=d4e5…",
  "items": [
    { "content_id": "a1b2…", "type": "image", "url": "/media/c1a2…/content/55aa….jpg", "duration_seconds": 10 },
    { "content_id": "c3d4…", "type": "video", "url": "/media/c1a2…/content/66bb….mp4", "duration_seconds": 42 }
  ]
}
```

- Respuesta **304** sin cuerpo si `If-None-Match` coincide con la versión actual.
- `items` incluye solo los contenidos con `is_visible = true`, en orden de `sort_order`. Puede ser `[]`: el reproductor muestra una imagen por defecto con el QR visible.
- `qr_url` = origen web del tenant + `/` + slug del local + `?src=` + `screen_id`. Es el origen que queda guardado en el pedido (RF-022, RF-025). La legibilidad del QR a distancia (RNF-009: lectura a 1,5 m en al menos 95% de 20 intentos y lado del QR de al menos 8% del alto de la pantalla) es responsabilidad del reproductor; el API solo entrega `qr_url`.
- **Detección de cambios (RF-023):** `version` es los primeros 16 caracteres hexadecimales del SHA-256 del JSON de la respuesta sin el campo `version`, con las claves en el orden mostrado. Cambia al agregar, borrar, ocultar, reordenar o cambiar la duración de un contenido, o al cambiar el nombre o slug del local. `ETag` es esa misma versión entre comillas.
- **Contrato de polling del reproductor:**
  1. Al abrir pide la playlist y descarga todos los `url` de `items`.
  2. Cada `poll_interval_seconds` (30 s) vuelve a pedirla con `If-None-Match: "<version>"`.
  3. Con 304 no hace nada. Con 200 descarga solo los archivos que no tiene en caché y aplica la nueva playlist al terminar el elemento en curso, sin recargar la página.
  4. Si la solicitud falla (sin red, 5xx) sigue reproduciendo la última playlist y reintenta en el siguiente ciclo; al volver la red sincroniza sin reiniciar la reproducción (RF-024, RNF-010).
  5. Sin red y sin caché desde el inicio: muestra un mensaje de espera y reintenta cada ciclo.
  6. Con 404 muestra "pantalla no válida" (token inexistente, pantalla desactivada).
- Los archivos de `/media/...` tienen `Cache-Control: public, max-age=31536000, immutable` (el nombre es un UUID que nunca cambia), por lo que el navegador y el Service Worker pueden cachearlos.
- Errores: 404 `SCREEN_NOT_FOUND` (token inexistente, pantalla con `is_active = false`, token de otro tenant o local desactivado; en todos los casos el mismo 404 para no revelar cuál).

## 11. Cliente público (`/public`, `/media`)

Audiencia: persona que escaneó el QR. Anónimo. Tenant por Host (`local1.mostrador.io`), local por el segmento de ruta.

### `GET /public/stores/:storeSlug/catalog`
- Auth: `@Public()`. RF-014, RF-025, RF-026, HU-09, HU-16, HU-17.
- Respuesta 200: solo productos con `is_available = true` del local y tenant resueltos, agrupados por categoría (ordenadas por `sort_order`, `name`); las categorías sin productos disponibles no aparecen; hasta 200 productos.

```json
{
  "store": { "store_id": "9d3e…", "name": "Palermo", "slug": "palermo" },
  "categories": [
    { "category_id": "3f1a…", "name": "Bebidas",
      "products": [
        { "product_id": "7c2b…", "name": "Agua 500 ml", "description": "Sin gas",
          "price": "1500.00", "image_url": "/media/c1a2…/products/8e9f….webp" }
      ] }
  ]
}
```

`image_url` es `null` si no hay imagen (la web usa su imagen por defecto). Catálogo vacío: `"categories": []`.
- Errores: 404 `TENANT_NOT_FOUND`; 404 `STORE_NOT_FOUND` (el local no existe, está desactivado o es de otro tenant; la web muestra la página de error).

### `POST /public/stores/:storeSlug/orders`
- Auth: `@Public()`. RF-027, RF-028, RF-029, RF-030, RF-033, RF-034, HU-18, HU-19, HU-20, HU-23.
- Request:

```json
{
  "items": [ { "product_id": "7c2b…", "quantity": 2 }, { "product_id": "9a8b…", "quantity": 1 } ],
  "customer_name": "Ana",
  "note": "Sin hielo",
  "source_screen_id": "d4e5…"
}
```

| Campo | Regla |
| --- | --- |
| `items` | arreglo de 1 a 50 líneas, obligatorio (carrito vacío: 400). Un mismo `product_id` no puede repetirse |
| `items[].product_id` | UUID de un producto del local |
| `items[].quantity` | entero de **1 a 50** (RF-027) |
| `customer_name` | texto hasta **50** caracteres, opcional |
| `note` | texto hasta **200** caracteres, opcional |
| `source_screen_id` | UUID, opcional; el valor de `?src=` de la URL del QR. Si no existe, es de otro local/tenant o está desactivada, el pedido se guarda igual con origen `null` (no se bloquea al cliente) |

- **Los precios no se envían ni se confían (integridad del pedido, RNF-001).** Cualquier `price`, `unit_price` o `total` que llegue en el body se descarta. El servidor, en una sola transacción: verifica que cada producto exista en el local y esté disponible; lee el precio vigente; calcula `line_total` y `total`; incrementa `tenants.last_order_number` para obtener `order_number`; guarda `orders` y `order_items` con estado `generada`; y arma el mensaje de WhatsApp.
- Se registra el pedido **aunque el local no tenga `whatsapp_number`** (RF-029, RF-030).
- Respuesta **201**:

```json
{
  "order_id": "f0a1…",
  "order_number": 123,
  "status": "generada",
  "store": { "name": "Palermo", "slug": "palermo" },
  "customer_name": "Ana",
  "note": "Sin hielo",
  "total": "3000.00",
  "created_at": "2026-11-02T15:30:00.000Z",
  "items": [ { "line_number": 1, "product_id": "7c2b…", "product_name": "Agua 500 ml",
               "unit_price": "1500.00", "quantity": 2, "line_total": "3000.00" } ],
  "whatsapp_parts": [
    { "part": 1, "total": 1,
      "text": "Pedido #123\nLocal: Palermo\nCliente: Ana\nNota: Sin hielo\n\n2 x Agua 500 ml — $3.000,00\n\nTotal: $3.000,00",
      "url": "https://wa.me/5491112345678?text=Pedido%20%23123%0ALocal%3A%20Palermo…" }
  ]
}
```

En cada elemento de `whatsapp_parts`, `part` es el número de parte (desde 1) y `total` es la **cantidad de partes**; no es el total en dinero. Si el local no tiene número, `"whatsapp_parts": []` y la web muestra "Tu pedido fue registrado, el comercio lo verá en su panel" sin abrir WhatsApp.
- Errores:
  - 400 validación: carrito vacío, más de 50 líneas, cantidad fuera de 1 a 50, `note` de más de 200 o `customer_name` de más de 50 caracteres, `product_id` repetido o no UUID.
  - 404 `TENANT_NOT_FOUND` / `STORE_NOT_FOUND`.
  - 409 `PRODUCTS_UNAVAILABLE`: algún producto no existe en el local o está no disponible. No se guarda nada. El `details` lista cada uno para que la web pida revisar el carrito:

```json
{ "statusCode": 409, "message": "Hay productos que ya no están disponibles", "error": "Conflict",
  "code": "PRODUCTS_UNAVAILABLE",
  "details": [ { "product_id": "9a8b…", "name": "Gaseosa 1 L", "reason": "unavailable" } ] }
```

  `reason` es `unavailable` (existe pero `is_available = false`) o `not_found` (no existe en el local; en ese caso no hay `name`).
- Limitación conocida: no hay clave de idempotencia; un doble envío crea dos pedidos. La web deshabilita el botón mientras espera. El control de abuso (límite de solicitudes por IP) es R2.

#### 11.1 Armado del mensaje de WhatsApp (RF-034)

`text` de cada parte se arma así (todo el texto en español; el importe usa formato `es-AR`: `$1.500,00`):

```
Pedido #123 — parte 1/2          <- encabezado; si hay una sola parte es solo "Pedido #123"
Local: Palermo                   <- solo en la parte 1
Cliente: Ana                     <- solo en la parte 1 y solo si hay nombre
Nota: Sin hielo                  <- solo en la parte 1 y solo si hay nota
                                 <- línea en blanco
2 x Agua 500 ml — $3.000,00      <- una línea por ítem: "{cantidad} x {nombre} — {line_total}"
1 x Sándwich — $8.500,00
                                 <- línea en blanco
Total: $11.500,00                <- solo en la última parte
```

Reglas de división:

1. Límite: `WHATSAPP_MAX_PART_CHARS` (1500), medido en caracteres del texto sin codificar, **incluido** el encabezado y los saltos de línea.
2. Si el texto completo cabe en 1500 caracteres sale una sola parte con encabezado `Pedido #123`.
3. Si no cabe, se prueba con M = 2, 3, ... partes y se toma el primer M para el que el reparto resulta en M partes como máximo. Cada parte lleva el encabezado `Pedido #123 — parte i/M`, que cuenta dentro de su límite.
4. El reparto es voraz y ordenado: se llena la parte 1 con el encabezado, local, cliente, nota y los ítems que entren; la línea de un ítem que no entra pasa **completa** a la parte siguiente. **Nunca se corta una línea de ítem.** La línea `Total` va al final de la última parte; si no entra en ella, abre una parte nueva.
5. `url` = `https://wa.me/<numero sin "+">?text=<encodeURIComponent(text)>`, por ejemplo número `+5491112345678` da `https://wa.me/5491112345678?text=...`. Tildes, `&` y saltos de línea quedan codificados.
6. El sistema no puede confirmar que el cliente envió las partes; el pedido queda `generada` hasta que el local lo cambie.

### `GET /media/*`
- Auth: `@Public()`. Archivos estáticos servidos desde `UPLOADS_DIR`. RF-012, RF-018, RF-024. Las URL `image_url` y `url` de los esquemas son rutas de este tipo (`/media/<tenant_id>/products/<uuid>.<ext>`, `/media/<tenant_id>/content/<uuid>.<ext>`). Encabezados: `Cache-Control: public, max-age=31536000, immutable`. No lista directorios. 404 si no existe. Los nombres son UUID no adivinables; el contenido de un tenant es público para quien conozca la URL.

## 12. Permisos

Estilo de código existente: `recurso:acción` (por ejemplo `products:create`, citado en `database/scripts/001_schema.sql`). Se usan con `@RequirePermissions('<codigo>')`; `PermissionsGuard` los lee de `roles_permissions` según los roles del usuario en `users_roles`. Se siembran en `database/scripts/001_schema.sql` (RF-007).

| Código | Endpoints | `owner` | `employee` |
| --- | --- | --- | --- |
| `stores:read` | `GET /stores`, `GET /stores/:id` | sí | sí |
| `stores:update` | `PATCH /stores/:id` | sí | no |
| `categories:read` | `GET /categories` | sí | sí |
| `categories:create` | `POST /categories` | sí | no |
| `categories:update` | `PATCH /categories/:id` | sí | no |
| `categories:delete` | `DELETE /categories/:id` | sí | no |
| `products:read` | `GET /products`, `GET /products/:id` | sí | sí |
| `products:create` | `POST /products` | sí | no |
| `products:update` | `PATCH /products/:id`, `PUT` y `DELETE /products/:id/image` | sí | no |
| `products:delete` | `DELETE /products/:id` | sí | no |
| `content:read` | `GET /content` | sí | no |
| `content:create` | `POST /content` | sí | no |
| `content:update` | `PATCH /content/:id`, `PUT /content/order` | sí | no |
| `content:delete` | `DELETE /content/:id` | sí | no |
| `screens:read` | `GET /screens` | sí | no |
| `screens:create` | `POST /screens` | sí | no |
| `screens:update` | `PATCH /screens/:id` | sí | no |
| `orders:read` | `GET /orders`, `GET /orders/:id` | sí | sí |
| `orders:update` | `PATCH /orders/:id/status` | sí | sí |
| `tenants:read` | `GET /tenants` | no | no |
| `tenants:create` | `POST /tenants` | no | no |
| `tenants:update` | `PATCH /tenants/:id` | no | no |

- Roles sembrados (`roles.name`): `root`, `owner`, `employee` (en el xlsx: Root, Dueño, Empleado). `root` recibe todos los permisos (`001_schema.sql`, para que `/me` lo refleje) y además `PermissionsGuard` le permite **cualquier** permiso en cualquier tenant (administra todo). Un permiso nuevo debe otorgarse también a `root`.
- `GET /me` y `/auth/*` no requieren permiso.
- Un empleado que intenta editar el catálogo o el contenido recibe 403 (RF-008, HU-05).
- En R1 el empleado ve las órdenes de todos los locales del tenant (hay un solo local); el filtro por `users_stores` es R2.

## 13. Resumen

| Audiencia | Endpoints | Rutas |
| --- | --- | --- |
| Autenticación existente | 2 | `POST /auth/register`, `POST /auth/login` |
| Backoffice (JWT) | 26 | `/me` 1; `/stores` 3; `/categories` 4; `/products` 7; `/content` 5; `/screens` 3; `/orders` 3 |
| Administrador de la plataforma (JWT `root`) | 3 | `/tenants` 3 (sección 3.1) |
| Pantalla (token) | 1 | `GET /player/:token/playlist` |
| Cliente público (anónimo) | 3 | `GET /public/stores/:storeSlug/catalog`, `POST /public/stores/:storeSlug/orders`, `GET /media/*` |
| **Total R1** | **35** | |

Trazabilidad RF a endpoint o tabla (los RF de R2 están en la sección 14):

| RF | Dónde se cubre |
| --- | --- |
| RF-001, RF-002 | `tenants.slug`; resolución en 1.2 |
| RF-003, RF-004 | `/stores`; `stores.slug`; ruta pública `:storeSlug` |
| RF-005, RF-006, RF-009 | sección 2 y `GET /me`; `@Public()` en `/player`, `/public`, `/media` |
| RF-007 | sección 12 (permisos y roles sembrados) |
| RF-010 | `/categories` |
| RF-011, RF-012, RF-013 | `/products`, imagen del producto |
| RF-014 | `GET /public/stores/:storeSlug/catalog` |
| RF-018, RF-019 | `/content` |
| RF-020 | `/screens` |
| RF-021, RF-022, RF-023, RF-024 | `GET /player/:token/playlist` y `/media/*` |
| RF-025, RF-026 | catálogo público y `qr_url` |
| RF-027, RF-028, RF-029 | `POST /public/stores/:storeSlug/orders` (el carrito vive en el cliente; los límites se validan al crear el pedido) |
| RF-030 | alta de pedido; tabla `orders` |
| RF-031, RF-032 | `GET /orders`, `PATCH /orders/:id/status` |
| RF-033 | `PATCH /stores/:id` |
| RF-034 | 11.1 |

## 14. Fuera de R1

Solo nombres; se definirán en R2:

- Catálogo desde foto con IA (RF-015 a RF-017): `POST /catalog/photo-imports`, `GET /catalog/photo-imports/:id`, `POST /catalog/photo-imports/:id/confirm`.
- Varios locales y empleados (RF-003 ampliado, RF-008): `POST /stores`, `PATCH /stores/:id` (alta y baja), `GET /employees`, `POST /employees`, `PATCH /employees/:id`, `PUT /employees/:id/stores`.
- Regeneración de token: `POST /screens/:id/regenerate-token`.
- Tenant suspendido (RF-035): `POST /tenants/:id/suspend`, `POST /tenants/:id/reactivate` (hoy se suspende con `PATCH /tenants/:id { is_active: false }`); respuesta 503 de mantenimiento en rutas públicas; panel web del root.
- Métricas: `GET /metrics/orders`, `GET /metrics/screens`.
- Control de abuso (límite de solicitudes) e idempotencia del alta de pedido.
- Despliegue de producción (proxy, wildcard `*.mostrador.io`, copias de seguridad).

## 15. Diferencias entre este contrato y el código actual

Para que las tres pistas las resuelvan de forma explícita:

| # | Hallazgo | Acción |
| --- | --- | --- |
| 1 | `LoginUseCase` distingue "El email … no se encuentra registrado" de "Las credenciales no son correctas"; RF-005 pide una respuesta uniforme. | Backend unifica ambos casos en 401 `Las credenciales no son correctas`. **Hecho (#21).** |
| 2 | No existe contexto de tenant: ni middleware, ni columna `slug`, ni el JWT lleva tenant. | Backend agrega `TenantMiddleware` (Host o `X-Tenant-Slug`, sección 1.2), un guard de pertenencia a `users_tenants` y exige `tenant_id` en los repositorios. **Avance (#69):** `TenantMiddleware` hecho. **Avance (#21):** guard de pertenencia hecho (`NOT_A_MEMBER`). **Hecho (#73):** todos los repositorios con alcance de tenant (locales, categorías, productos, contenido, pantallas y órdenes) filtran por `tenant_id` en cada consulta, incluidos los `JOIN`. |
| 3 | ~~`TenantOrmEntity` mapea `name` como `varchar(320) unique`, mientras `database/scripts/001_schema.sql` define `VARCHAR(150)` sin UNIQUE.~~ | **Resuelto (#69):** `name` es `varchar(150)` sin UNIQUE y el ORM entity agrega `slug` y `last_order_number`. |
| 4 | `PermissionsGuard` obtiene los permisos desde `users_roles` (global), mientras `users_tenants` también guarda `role_id` por tenant. | En R1 un usuario pertenece a un solo tenant, el resultado es el mismo. Con varios tenants (R2) los permisos deben salir de `users_tenants.role_id`. |
| 5 | `main.ts` habilita CORS solo para `http://localhost:8081` (llegó desde `main`, PR #68) y no sirve archivos estáticos. | Backend habilita CORS para `*.localhost` y `*.mostrador.io` con los encabezados `Authorization`, `Content-Type`, `X-Tenant-Slug`, `If-None-Match` y expone `ETag`; sirve `/media` desde `UPLOADS_DIR`. **Hecho (#69, #73):** CORS y encabezados; `/media` se sirve desde `UPLOADS_DIR` con `Cache-Control: public, max-age=31536000, immutable` (sección 11). |
| 6 | `TenantsModule` no tenía controlador. | **Hecho (#76):** ahora tiene `TenantsController` (`GET/POST /tenants`, `PATCH /tenants/:id`, solo `root`, sección 3.1). |
| 7 | `POST /auth/register` es público y no vincula al usuario a ningún tenant. | Sin cambio fuera del contexto admin; se documenta para que nadie asuma que un usuario registrado ya puede usar el backoffice. **Hecho (#76):** en el contexto admin el primer registro es `root`. |
| 8 | ~~El versionado SQL (`db:apply`, `database/scripts/001_schema.sql`) estaba solo en `feature/BU-018-db-versioning`.~~ | **Resuelto:** BU-018 integrada en `develop` (squash). El esquema vive en `001_schema.sql`. |
| 9 | `backend/src/products` (PR #68, EduKit) expone `GET /products` y `GET /products/:id` públicos con datos en memoria (`products.data.ts`), sin tenant ni base. | **Se reemplaza en R1** por los endpoints de productos de este contrato (§9 y §11): con tenant, persistidos y con permisos. El módulo en memoria ya está eliminado (**Hecho (#73)**: `products.data.ts` no existe y `ProductsModule` usa la base). Actualizado en BU-053: la app m?vil incorpora el carrito y env?a pedidos a `POST /public/stores/:storeSlug/orders`, con `X-Tenant-Slug`, productos y cantidades, y nombre y nota opcionales. La validaci?n definitiva de disponibilidad y el c?lculo del total corresponden al backend.|
| 10 | `database/modelo_relacional.sql` (PR #67, EduKit) define `librerias`, `bibliotecas`, `productos`, `ordenes`, `subpedidos`, `pagos`, `donaciones` y otras tablas del producto anterior. Está fuera de `database/scripts/`, así que el versionado no lo aplica. | **Queda reemplazado** por `001_schema.sql` (ver `docs/modelo-datos.md`, sección 11). No se aplica ni se migra: **Hecho (#73):** el archivo ya no está en el repositorio. |
