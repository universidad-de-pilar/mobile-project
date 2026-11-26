/* Schema de Mostrador: estado final completo (identidad, tenants y locales, catalogo, biblioteca y playlists, pantallas, pedidos, roles y permisos). Idempotente. Ver docs/modelo-datos.md */

-- identidad y acceso

create table if not exists users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

create table if not exists roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

create table if not exists users_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,

    PRIMARY KEY (user_id, role_id),

    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

create table if not exists permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_permissions_code UNIQUE (code)
);

create table if not exists roles_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT fk_roles_permissions_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT fk_roles_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
);

-- tenants y locales

create table if not exists tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    slug VARCHAR(30) NOT NULL,
    last_order_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_tenants_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'),
    CONSTRAINT ck_tenants_slug_reserved CHECK (slug NOT IN ('www', 'api', 'app', 'admin')),
    CONSTRAINT ck_tenants_last_order_number CHECK (last_order_number >= 0)
);

create table if not exists stores (
    store_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    slug VARCHAR(30) NOT NULL,
    whatsapp_number VARCHAR(16),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_stores_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'),
    CONSTRAINT ck_stores_slug_reserved CHECK (slug NOT IN ('screen', 'media', 'api')),
    CONSTRAINT ck_stores_whatsapp_e164 CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^\+[1-9][0-9]{7,14}$')
);

create table if not exists users_tenants (
    user_id UUID NOT NULL REFERENCES users(user_id),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    role_id UUID NOT NULL REFERENCES roles(role_id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id, tenant_id, role_id)
);

create table if not exists users_stores (
    user_id UUID NOT NULL REFERENCES users(user_id),
    store_id UUID NOT NULL REFERENCES stores(store_id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id, store_id)
);

-- catalogo, playlist, pantallas y pedidos

create table if not exists categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    store_id UUID NOT NULL REFERENCES stores(store_id),
    name VARCHAR(80) NOT NULL CHECK (length(btrim(name)) >= 1),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

create table if not exists products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    store_id UUID NOT NULL REFERENCES stores(store_id),
    category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    name VARCHAR(80) NOT NULL CHECK (length(btrim(name)) >= 1),
    description VARCHAR(500),
    price NUMERIC(12,2) NOT NULL CHECK (price > 0),
    image_path VARCHAR(255),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- la biblioteca por local se reemplaza por media_items y playlists por tenant (datos de desarrollo descartados)
drop table if exists content_items;

create table if not exists screens (
    screen_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    store_id UUID NOT NULL REFERENCES stores(store_id),
    name VARCHAR(80) NOT NULL,
    token VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_screens_token UNIQUE (token)
);

create table if not exists media_items (
    media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video')),
    file_path VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(50) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'video/mp4')),
    size_bytes BIGINT NOT NULL CHECK (
        size_bytes > 0
        AND ((type = 'image' AND size_bytes <= 5242880) OR (type = 'video' AND size_bytes <= 52428800))
    ),
    duration_seconds SMALLINT CHECK (
        (type = 'image' AND duration_seconds IS NULL)
        OR (type = 'video' AND duration_seconds BETWEEN 1 AND 60)
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

create table if not exists playlists (
    playlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    name VARCHAR(80) NOT NULL CHECK (length(btrim(name)) >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

create table if not exists playlist_items (
    playlist_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES playlists(playlist_id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media_items(media_id) ON DELETE RESTRICT,
    position INTEGER NOT NULL CHECK (position >= 1),
    duration_seconds SMALLINT CHECK (duration_seconds BETWEEN 3 AND 60)
);

create table if not exists screen_playlists (
    screen_playlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screen_id UUID NOT NULL REFERENCES screens(screen_id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES playlists(playlist_id) ON DELETE CASCADE,
    days SMALLINT,
    start_time TIME,
    end_time TIME,

    CONSTRAINT ck_screen_playlists_schedule CHECK (
        (days IS NULL AND start_time IS NULL AND end_time IS NULL)
        OR (days BETWEEN 1 AND 127 AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    )
);

create table if not exists orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    store_id UUID NOT NULL REFERENCES stores(store_id),
    order_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'generada'
        CHECK (status IN ('generada', 'en_preparacion', 'lista', 'entregada', 'cancelada')),
    source_screen_id UUID REFERENCES screens(screen_id),
    customer_name VARCHAR(50),
    note VARCHAR(200),
    total NUMERIC(12,2) NOT NULL CHECK (total > 0),
    status_changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_changed_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_orders_tenant_number UNIQUE (tenant_id, order_number)
);

create table if not exists order_items (
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    line_number SMALLINT NOT NULL CHECK (line_number >= 1),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    product_id UUID REFERENCES products(product_id) ON DELETE SET NULL,
    product_name VARCHAR(80) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
    quantity SMALLINT NOT NULL CHECK (quantity BETWEEN 1 AND 50),
    line_total NUMERIC(12,2) NOT NULL GENERATED ALWAYS AS (unit_price * quantity) STORED,

    PRIMARY KEY (order_id, line_number)
);

-- indices

create unique index if not exists uq_tenants_slug on tenants (slug);
create unique index if not exists uq_stores_tenant_slug on stores (tenant_id, slug);
create unique index if not exists uq_categories_store_name on categories (store_id, lower(name));
create index if not exists ix_products_store_available on products (store_id, is_available);
create index if not exists ix_products_category on products (category_id);
create index if not exists ix_media_items_tenant_created on media_items (tenant_id, created_at desc);
create index if not exists ix_playlists_tenant_name on playlists (tenant_id, lower(name));
create unique index if not exists uq_playlist_items_position on playlist_items (playlist_id, position);
create index if not exists ix_playlist_items_media on playlist_items (media_id);
create unique index if not exists uq_screen_playlists_default on screen_playlists (screen_id) where days is null;
create index if not exists ix_screen_playlists_screen on screen_playlists (screen_id);
create index if not exists ix_screen_playlists_playlist on screen_playlists (playlist_id);
create index if not exists ix_orders_store_created on orders (tenant_id, store_id, created_at desc);
create index if not exists ix_orders_store_status_created on orders (tenant_id, store_id, status, created_at desc);

-- comentarios: tablas

comment on table categories is 'Categorias del catalogo de un local';
comment on table products is 'Productos del catalogo de un local; el precio vigente es la unica fuente de precio al crear un pedido';
comment on table media_items is 'Biblioteca de imagenes y videos del tenant; se sube una vez y se reutiliza en muchas playlists';
comment on table playlists is 'Lista ordenada y reutilizable de medios del tenant; se asigna a pantallas de cualquier local';
comment on table playlist_items is 'Medios de una playlist en orden; el mismo medio puede aparecer varias veces';
comment on table screen_playlists is 'Asignacion de una playlist a una pantalla: por defecto (days NULL) o en una franja semanal';
comment on table screens is 'Pantallas de un local; el token es su credencial y el screen_id identifica el origen de los pedidos';
comment on table orders is 'Pedidos recibidos por un local, con numero publico consecutivo por tenant';
comment on table order_items is 'Lineas de un pedido, con snapshot de nombre y precio del producto';

-- comentarios: columnas

comment on column tenants.slug is 'Subdominio del tenant (local1.mostrador.io); 3 a 30 caracteres en minuscula, sin guion al inicio ni al final';
comment on column tenants.last_order_number is 'Contador del numero publico de pedido por tenant; se incrementa con UPDATE ... RETURNING dentro de la transaccion del pedido';

comment on column stores.slug is 'Segmento de la URL del autopedido (local1.mostrador.io/palermo); se reservan los segmentos que usa la propia web';
comment on column stores.phone is 'Telefono de contacto del local; no es el numero de WhatsApp';
comment on column stores.whatsapp_number is 'Numero que recibe los pedidos por wa.me, formato E.164; NULL significa sin WhatsApp y el pedido se registra igual';
comment on column stores.created_at is 'Orden estable de la lista de locales';

comment on column categories.store_id is 'El catalogo es por local';
comment on column categories.name is 'Nombre visible; unico por local sin distinguir mayusculas';
comment on column categories.sort_order is 'Orden de aparicion en el catalogo publico; el empate se resuelve por name';

comment on column products.category_id is 'ON DELETE RESTRICT implementa que no se elimina una categoria con productos; la categoria debe ser del mismo local (lo valida la aplicacion)';
comment on column products.price is 'Precio vigente; unica fuente de precio al crear un pedido';
comment on column products.image_path is 'Ruta relativa dentro de UPLOADS_DIR; NULL usa la imagen por defecto. Se guarda ruta y no URL para poder cambiar el origen de archivos sin migrar datos';
comment on column products.is_available is 'FALSE oculta el producto del catalogo publico y bloquea su alta en pedidos';
comment on column products.sort_order is 'Orden dentro de la categoria; el empate se resuelve por name';

comment on column media_items.type is 'Decide como lo reproduce el player: image o video';
comment on column media_items.file_path is 'Ruta relativa dentro de UPLOADS_DIR con nombre UUID: la URL no se adivina y nunca cambia, por lo que el player puede cachearla';
comment on column media_items.original_name is 'Nombre que subio el usuario; solo se muestra en el backoffice';
comment on column media_items.mime_type is 'Tipo validado por el contenido real del archivo, no por el encabezado del cliente';
comment on column media_items.size_bytes is 'Respaldo en base de los limites de 5 MB para imagenes y 50 MB para videos';
comment on column media_items.duration_seconds is 'Video: duracion real medida al subir, redondeada hacia arriba (1 a 60). Imagen: NULL, su duracion se define en cada item de playlist';

comment on column playlists.name is 'Nombre visible en el backoffice; no es unico';

comment on column playlist_items.playlist_id is 'ON DELETE CASCADE: al borrar la playlist se borran sus items';
comment on column playlist_items.media_id is 'ON DELETE RESTRICT implementa que no se borra un medio que esta en uso en una playlist';
comment on column playlist_items.position is 'Posicion en la playlist (1, 2, 3...); la API reemplaza la lista completa y la deja consecutiva';
comment on column playlist_items.duration_seconds is 'Imagen: segundos en pantalla (3 a 60), distinto en cada item. Video: NULL, se usa la duracion real del medio; lo valida la aplicacion';

comment on column screen_playlists.playlist_id is 'ON DELETE CASCADE: al borrar la playlist se quitan sus asignaciones; la playlist debe ser del mismo tenant que la pantalla (lo valida la aplicacion)';
comment on column screen_playlists.days is 'Dias de la franja como mascara de bits (lunes=1, martes=2, ... domingo=64); NULL significa playlist por defecto de la pantalla';
comment on column screen_playlists.start_time is 'Inicio de la franja en hora local de la pantalla; NULL en la playlist por defecto. La franja no cruza la medianoche';
comment on column screen_playlists.end_time is 'Fin exclusivo de la franja; siempre mayor que start_time. NULL en la playlist por defecto';

comment on column screens.screen_id is 'Identifica el origen del pedido y viaja en el QR (?src=); no es secreto';
comment on column screens.token is 'Credencial de la pantalla: 32 bytes aleatorios en base64url, va en la URL /screen/:token. Se guarda en claro para poder mostrar de nuevo la URL en el backoffice';
comment on column screens.is_active is 'Desactivar revoca el acceso sin borrar la pantalla, para conservar el origen de los pedidos';

comment on column orders.order_number is 'Numero corto y legible que usan el cliente y el local en WhatsApp; consecutivo por tenant, asignado desde tenants.last_order_number';
comment on column orders.status is 'Estado del pedido como codigo snake_case sin acento; las transiciones validas las controla la aplicacion';
comment on column orders.source_screen_id is 'Pantalla desde cuyo QR se origino el pedido; NULL si se entro sin QR o con un origen invalido';
comment on column orders.customer_name is 'Nombre opcional del cliente';
comment on column orders.note is 'Nota opcional del cliente';
comment on column orders.total is 'Suma de order_items.line_total calculada en el servidor con los precios vigentes';
comment on column orders.status_changed_at is 'Cuando cambio el estado por ultima vez; al crear, igual a created_at';
comment on column orders.status_changed_by is 'Quien cambio el estado por ultima vez; NULL mientras el pedido siga en el estado inicial, creado por un cliente anonimo';

comment on column order_items.order_id is 'Parte 1 de la clave primaria compuesta (order_id, line_number); pedido al que pertenece la linea';
comment on column order_items.line_number is 'Parte 2 de la clave primaria compuesta (order_id, line_number); posicion de la linea (1, 2, 3...) que fija el orden de lectura y del mensaje';
comment on column order_items.tenant_id is 'Aislamiento sin join a orders';
comment on column order_items.product_id is 'Producto de origen; pasa a NULL si se borra el producto y el pedido se lee con los campos de snapshot';
comment on column order_items.product_name is 'Snapshot del nombre al momento del pedido';
comment on column order_items.unit_price is 'Snapshot del precio vigente que uso el servidor; el precio enviado por el cliente se ignora';
comment on column order_items.quantity is 'Limite de 1 a 50 unidades por producto del carrito';
comment on column order_items.line_total is 'Subtotal generado a partir de precio y cantidad, nunca se desfasa';

-- comentarios: indices

comment on index uq_tenants_slug is 'Resuelve el tenant desde el subdominio en cada solicitud y garantiza slug unico';
comment on index uq_stores_tenant_slug is 'Resuelve el local por su slug dentro del tenant, garantiza slug unico por tenant y sirve el listado de locales de un tenant';
comment on index uq_categories_store_name is 'Impone nombre de categoria unico por local sin distinguir mayusculas y sirve el listado de categorias de un local';
comment on index ix_products_store_available is 'Consulta caliente del catalogo publico: productos disponibles de un local; tambien sirve el listado del backoffice por local';
comment on index ix_products_category is 'Hace barata la comprobacion RESTRICT al borrar una categoria y el filtro por categoria';
comment on index ix_media_items_tenant_created is 'Listado de la biblioteca del tenant, mas recientes primero';
comment on index ix_playlists_tenant_name is 'Listado de playlists del tenant ordenado por nombre sin distinguir mayusculas';
comment on index uq_playlist_items_position is 'Impide posiciones repetidas en una playlist y sirve la lectura de sus items en orden, camino caliente del player';
comment on index ix_playlist_items_media is 'Hace barata la comprobacion RESTRICT al borrar un medio y la busqueda de playlists que lo usan';
comment on index uq_screen_playlists_default is 'Garantiza como maximo una playlist por defecto por pantalla (parcial: solo filas con days NULL)';
comment on index ix_screen_playlists_screen is 'Camino caliente: cada pantalla lee su por defecto y sus franjas cada 30 segundos, y el backoffice las edita';
comment on index ix_screen_playlists_playlist is 'Seccion Pantallas del editor de playlist y hace barata la FK al borrar una playlist';
comment on index uq_screens_token is 'Garantiza tokens unicos y sirve la busqueda por token de cada consulta del player';
comment on index uq_orders_tenant_number is 'Impide numeros de pedido repetidos dentro del tenant y permite buscar un pedido por su numero';
comment on index ix_orders_store_created is 'Listado del backoffice, mas recientes primero, por local y rango de fechas';
comment on index ix_orders_store_status_created is 'Mismo listado filtrado por estado, que es el filtro mas usado por el local';
comment on index order_items_pkey is 'Composite PK (order_id, line_number): garantiza lineas unicas por pedido, sirve la lectura de las lineas en orden y es el indice de la FK a orders';

-- comentarios: identidad

comment on column permissions.code is 'Stable identifier checked by authorization guards (e.g. products:create)';
comment on column tenants.created_at is 'Orden estable del listado de tenants del administrador de la plataforma';
comment on index uq_permissions_code is 'Enforces one row per permission code and speeds up lookup by code';
comment on index roles_permissions_pkey is 'Composite PK (role_id, permission_id): a role holds a permission at most once; its index also serves listing permissions by role_id';
comment on index users_roles_pkey is 'Composite PK (user_id, role_id): a user holds a role at most once; its index also serves listing roles by user_id';
comment on index users_tenants_pkey is 'Composite PK (user_id, tenant_id, role_id): a user holds a role in a tenant at most once; its index also serves listing the tenants and roles of a user';
comment on index users_stores_pkey is 'Composite PK (user_id, store_id): a user is assigned to a store at most once; its index also serves listing the stores of a user';

-- semillas: roles y permisos (docs/api.md seccion 12)

insert into roles (name, description) values
    ('root', 'Administrador de la plataforma'),
    ('owner', 'Dueno del tenant'),
    ('employee', 'Empleado de un local')
on conflict (name) do nothing;

insert into permissions (code, description) values
    ('stores:read', 'Ver locales'),
    ('stores:update', 'Editar locales'),
    ('categories:read', 'Ver categorias'),
    ('categories:create', 'Crear categorias'),
    ('categories:update', 'Editar categorias'),
    ('categories:delete', 'Eliminar categorias'),
    ('products:read', 'Ver productos'),
    ('products:create', 'Crear productos'),
    ('products:update', 'Editar productos e imagenes'),
    ('products:delete', 'Eliminar productos'),
    ('content:read', 'Ver biblioteca de medios y playlists'),
    ('content:create', 'Subir medios y crear playlists'),
    ('content:update', 'Editar playlists y sus items'),
    ('content:delete', 'Eliminar medios y playlists'),
    ('screens:read', 'Ver pantallas'),
    ('screens:create', 'Crear pantallas'),
    ('screens:update', 'Editar pantallas y asignarles playlists'),
    ('orders:read', 'Ver ordenes'),
    ('orders:update', 'Cambiar el estado de las ordenes')
on conflict (code) do nothing;

insert into permissions (code, description) values
    ('tenants:read', 'Ver tenants'),
    ('tenants:create', 'Crear tenants con su primer local y su dueno'),
    ('tenants:update', 'Editar o suspender tenants')
on conflict (code) do nothing;

-- root: todos los permisos, para que /me refleje que administra todo
insert into roles_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from roles r
cross join permissions p
where r.name = 'root'
on conflict do nothing;

-- owner: todos los permisos salvo los de administracion de la plataforma (tenants:*)
insert into roles_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from roles r
cross join permissions p
where r.name = 'owner' and p.code not like 'tenants:%'
on conflict do nothing;

-- employee: solo lectura de locales, categorias y productos, y gestion de ordenes
insert into roles_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from roles r
join permissions p on p.code in ('stores:read', 'categories:read', 'products:read', 'orders:read', 'orders:update')
where r.name = 'employee'
on conflict do nothing;

/*
La unicidad del root no usa indice: la garantiza la aplicacion con pg_advisory_xact_lock en la transaccion
del primer registro (UsersRepository.createRoot). Un indice parcial no puede filtrar por el nombre del rol,
que vive en otra tabla.
*/
