-- permisos de gestion de empleados (RF-008); idempotente

insert into permissions (code, description) values
    ('employees:read', 'Ver empleados del tenant'),
    ('employees:create', 'Crear empleados y asignarles locales'),
    ('employees:update', 'Editar, activar o desactivar empleados y cambiar sus locales')
on conflict (code) do nothing;

-- root y owner reciben los permisos nuevos; employee no gestiona a otros empleados
insert into roles_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from roles r
join permissions p on p.code like 'employees:%'
where r.name in ('root', 'owner')
on conflict do nothing;
