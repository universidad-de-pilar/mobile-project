# Despliegue del backend en DigitalOcean App Platform

El backend (`backend/`) se despliega como contenedor en DigitalOcean App Platform, construido desde el repositorio de GitHub con `backend/Dockerfile`. Cada push a `main` despliega solo (`deploy_on_push: true` en `.do/app.yaml`). GitHub Actions (`.github/workflows/backend-ci.yml`) solo corre `tsc` y Jest en cada PR que toca `backend/` y en cada push a `main`; no tiene credenciales de nube. La imagen incluye `ffprobe` (paquete `ffmpeg`), que el backend usa para medir la duración de los videos.

Los medios (imágenes de productos y videos de pantallas) se guardan en Cloudinary; PostgreSQL es un Managed Database de DigitalOcean.

## Variables de entorno

| Variable | Origen |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Variables enlazables del componente `databases` (ver `.do/app.yaml`) |
| `DB_CA_CERT` | CA del cluster (`${db.CA_CERT}`); activa TLS verificado, ver sección 2 |
| `JWT_SECRET` | Secreto largo, tipo `SECRET` |
| `JWT_EXPIRE_SECONDS` | `600` |
| `BASE_DOMAIN`, `WEB_ORIGIN_TEMPLATE` | `mostrador.io` y `https://{slug}.mostrador.io` |
| `CLOUDINARY_URL` | `cloudinary://<api_key>:<api_secret>@<cloud_name>`, tipo `SECRET`; si falta, el backend guarda en disco local |

`PORT` no se define: el backend usa 3000, igual que `http_port`. Opcionales: `LOG_MODE=json`, `DB_LOGGING=true`.

Los nombres de las variables enlazables (`${db.HOSTNAME}`, `${db.PORT}`, `${db.USERNAME}`, `${db.PASSWORD}`, `${db.DATABASE}`, `${db.CA_CERT}`) y los campos del spec conviene validarlos contra la documentación vigente de App Platform al crear la app.

## Configuración única (consola de DigitalOcean)

### 1. Cloudinary

1. Crear una cuenta en Cloudinary y copiar el *API environment variable* del Dashboard (`cloudinary://...`). Ese valor es `CLOUDINARY_URL`.
2. Los archivos quedan como `<tenant>/products/<uuid>` (imagen) y `<tenant>/content/<uuid>` (video); `/media/*` redirige (302) a la URL de entrega de Cloudinary.

### 2. PostgreSQL administrado

1. En la consola: *Databases > Create > PostgreSQL*. Anotar el nombre del cluster, la base (`mobile_project`) y el usuario; si difieren de `.do/app.yaml`, ajustar `cluster_name`, `db_name` y `db_user`.
2. El cluster exige TLS con una CA propia de DigitalOcean que no es de confianza pública. Con solo `PGSSLMODE=require`, `pg` verifica contra el almacén público y falla con `self-signed certificate in certificate chain`. Por eso el backend lee `DB_CA_CERT` (contenido PEM) y conecta con `ssl: { ca, rejectUnauthorized: true }`, tanto la app como `db:apply`. Sin `DB_CA_CERT` todo funciona como antes (base local, `PGSSLMODE`).
3. En *Trusted sources* del cluster agregar la app (una vez creada) y, para `db:apply`, la IP de la máquina desde la que se corre.

### 3. App

1. *Apps > Create App > GitHub*, autorizar la integración con GitHub y elegir `universidad-de-pilar/mobile-project`, rama `main`. Alternativa: crear la app importando `.do/app.yaml` (`doctl apps create --spec .do/app.yaml`, o *Edit app spec* en la consola).
2. Verificar que el servicio usa `backend/Dockerfile` con contexto `backend`, puerto 3000, y que el componente de base de datos apunta al cluster existente.
3. Cargar los secretos `JWT_SECRET` y `CLOUDINARY_URL` como variables de entorno cifradas (tipo *Encrypt*). No van en el repositorio.
4. Crear el despliegue. Después, agregar la app como *Trusted source* del cluster (paso 2.3).

## Base de datos

Los scripts de `database/scripts/*.sql` son idempotentes y se aplican con `db:apply` (lleva el registro en `schema_versions`). Desde `backend/`, con un `.env` apuntando al cluster (`DB_HOST` público, `DB_PORT`, credenciales y `DB_CA_CERT` con el PEM; la CA se descarga desde la consola del cluster) y la IP de la máquina como *Trusted source*:

```bash
npm run db:apply
```

El despliegue no aplica scripts; se corre a mano antes de desplegar una versión que los cambie.

## Brechas conocidas

- **Subdominios por tenant (verificar).** El backend resuelve el tenant por `{slug}.BASE_DOMAIN`. No se verificó que App Platform admita dominios wildcard (`*.mostrador.io`) ni cómo se emite su certificado; hay que confirmarlo en la documentación de DigitalOcean antes de depender de esto. Mientras tanto se puede probar con el header `X-Tenant-Slug` sobre el dominio `*.ondigitalocean.app` de la app. El CORS de `main.ts` ya acepta `https://*.mostrador.io`.
- **Límites de Cloudinary.** La app limita imágenes a 5 MB y videos a 50 MB; los topes del plan gratuito de Cloudinary (imagen 10 MB, video 100 MB, según la documentación conocida al escribir esto) están por encima, pero hay que confirmarlos en el plan contratado, junto con el almacenamiento y el ancho de banda.
- **Health check.** No hay ruta pública sin tenant, por lo que el servicio usa el check TCP por defecto.
- **App móvil (Expo)** y web de autopedido: no se despliegan con este flujo.
- **Migraciones de base de datos**: manuales (sección anterior).
- **Backups y escalado** de PostgreSQL: valores por defecto del plan elegido.
