/*
Datos de desarrollo: tenant local1 (local palermo, con WhatsApp), tenant local2 (local centro, sin WhatsApp),
usuario dueno y catalogo de ejemplo.
Solo para desarrollo. Se ejecuta a mano despues de db:apply; db:apply no lo corre.
Idempotente: se puede ejecutar varias veces sin duplicar filas.

Usuario dueno: owner@local1.test
Contrasena de desarrollo: Local1-dev-2026
*/

insert into tenants (name, slug)
values ('Local 1', 'local1')
on conflict (slug) do nothing;

-- Numero ficticio (formato E.164 valido); palermo recibe pedidos por WhatsApp en la demo.
-- coalesce: no pisa un numero que ya se haya cargado a mano.
insert into stores (tenant_id, name, address, slug, whatsapp_number)
select tenant_id, 'Palermo', 'Av. Santa Fe 1234', 'palermo', '+5491100000000'
from tenants where slug = 'local1'
on conflict (tenant_id, slug) do update
    set whatsapp_number = coalesce(stores.whatsapp_number, excluded.whatsapp_number);

-- Local sin numero de WhatsApp: demuestra "Tu pedido fue registrado, el comercio lo vera en su panel".
insert into tenants (name, slug)
values ('Local 2', 'local2')
on conflict (slug) do nothing;

insert into stores (tenant_id, name, address, slug)
select tenant_id, 'Centro', 'Av. Corrientes 800', 'centro'
from tenants where slug = 'local2'
on conflict (tenant_id, slug) do nothing;

insert into users (email, password_hash, first_name, last_name)
values ('owner@local1.test', '$2b$12$I2gO4FiZLHJcjX40LNHuYeOiDylEOu0.iJpqjW9B8unX7nyeBa1Z.', 'Dueno', 'Local1')
on conflict (email) do nothing;

insert into users_roles (user_id, role_id)
select u.user_id, r.role_id
from users u, roles r
where u.email = 'owner@local1.test' and r.name = 'owner'
on conflict do nothing;

insert into users_tenants (user_id, tenant_id, role_id)
select u.user_id, t.tenant_id, r.role_id
from users u, tenants t, roles r
where u.email = 'owner@local1.test' and t.slug = 'local1' and r.name = 'owner'
on conflict do nothing;

insert into users_stores (user_id, store_id)
select u.user_id, s.store_id
from users u
join tenants t on t.slug = 'local1'
join stores s on s.tenant_id = t.tenant_id and s.slug = 'palermo'
where u.email = 'owner@local1.test'
on conflict do nothing;

insert into categories (tenant_id, store_id, name, sort_order)
select s.tenant_id, s.store_id, c.name, c.sort_order
from stores s
join tenants t on t.tenant_id = s.tenant_id and t.slug = 'local1'
cross join (values ('Hamburguesas', 1), ('Papas y snacks', 2), ('Bebidas', 3), ('Postres', 4)) as c(name, sort_order)
where s.slug = 'palermo'
on conflict (store_id, lower(name)) do nothing;

insert into products (tenant_id, store_id, category_id, name, description, price, sort_order)
select s.tenant_id, s.store_id, c.category_id, p.name, p.description, p.price, p.sort_order
from stores s
join tenants t on t.tenant_id = s.tenant_id and t.slug = 'local1'
cross join (values
    ('Hamburguesas', 'Clasica', 'Carne, lechuga y tomate', 6500.00, 1),
    ('Hamburguesas', 'Doble queso', 'Doble carne y cheddar', 8200.00, 2),
    ('Hamburguesas', 'Veggie', 'Medallon de lentejas y rucula', 7400.00, 3),
    ('Papas y snacks', 'Papas fritas', 'Porcion grande', 3500.00, 1),
    ('Papas y snacks', 'Aros de cebolla', 'Porcion de 8 unidades', 4200.00, 2),
    ('Bebidas', 'Gaseosa 500 ml', null, 2500.00, 1),
    ('Bebidas', 'Agua mineral', null, 1800.00, 2),
    ('Bebidas', 'Cerveza artesanal', 'Pinta de 473 ml', 4800.00, 3),
    ('Postres', 'Flan casero', 'Con dulce de leche', 3200.00, 1),
    ('Postres', 'Brownie con helado', null, 4500.00, 2)
) as p(category, name, description, price, sort_order)
join categories c on c.store_id = s.store_id and lower(c.name) = lower(p.category)
where s.slug = 'palermo'
  and not exists (select from products x where x.store_id = s.store_id and x.name = p.name);

insert into categories (tenant_id, store_id, name, sort_order)
select s.tenant_id, s.store_id, c.name, c.sort_order
from stores s
join tenants t on t.tenant_id = s.tenant_id and t.slug = 'local2'
cross join (values ('Bebidas', 1), ('Comidas', 2)) as c(name, sort_order)
where s.slug = 'centro'
on conflict (store_id, lower(name)) do nothing;

insert into products (tenant_id, store_id, category_id, name, description, price, sort_order)
select s.tenant_id, s.store_id, c.category_id, p.name, p.description, p.price, p.sort_order
from stores s
join tenants t on t.tenant_id = s.tenant_id and t.slug = 'local2'
cross join (values
    ('Bebidas', 'Agua 500 ml', null, 1500.00, 1),
    ('Comidas', 'Tostado', 'Jamon y queso', 5200.00, 1)
) as p(category, name, description, price, sort_order)
join categories c on c.store_id = s.store_id and lower(c.name) = lower(p.category)
where s.slug = 'centro'
  and not exists (select from products x where x.store_id = s.store_id and x.name = p.name);
