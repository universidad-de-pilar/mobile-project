-- SKU obligatorio también en la base, una vez que todos los productos existentes lo tienen; idempotente

-- Si queda algún producto sin SKU el script falla sin cambiar nada e informa cuántos son
do $$
declare
    faltantes integer;
begin
    select count(*) into faltantes from products where sku is null or btrim(sku) = '';
    if faltantes > 0 then
        raise exception 'Hay % producto(s) sin SKU; cargarlos antes de aplicar este script', faltantes;
    end if;
end $$;

alter table products alter column sku set not null;

comment on column products.sku is 'Codigo interno del producto, obligatorio y unico por comercio (no por local) sin distinguir mayusculas';
