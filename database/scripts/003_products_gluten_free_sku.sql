-- marca "Sin TACC" y SKU por comercio en productos; idempotente

alter table products add column if not exists gluten_free boolean not null default false;
-- nullable: los productos existentes no tienen SKU; la API lo exige al crear y editar
alter table products add column if not exists sku varchar(64);

-- unico por comercio sin distinguir mayusculas; los productos sin SKU no compiten
create unique index if not exists ux_products_tenant_sku on products (tenant_id, lower(sku)) where sku is not null;

comment on column products.gluten_free is 'TRUE marca el producto como "Sin TACC"; el menu publico muestra la insignia solo cuando es TRUE';
comment on column products.sku is 'Codigo interno del producto, unico por comercio (no por local) sin distinguir mayusculas. Nullable solo porque los productos previos no lo tenian; la API lo exige';
comment on index ux_products_tenant_sku is 'Garantiza un SKU unico por comercio sin distinguir mayusculas (lower(sku)) aun ante altas concurrentes; ignora los productos sin SKU';
