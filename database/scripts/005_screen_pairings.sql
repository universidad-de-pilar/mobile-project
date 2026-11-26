-- Vinculación de televisores con un código corto; idempotente

create table if not exists screen_pairings (
    code VARCHAR(6) PRIMARY KEY,
    claim_secret VARCHAR(64) NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    screen_id UUID REFERENCES screens(screen_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_screen_pairings_claim_secret UNIQUE (claim_secret)
);

create index if not exists ix_screen_pairings_tenant_expires on screen_pairings (tenant_id, expires_at);

comment on table screen_pairings is 'Vinculaciones pendientes de un televisor: el televisor muestra un codigo corto y el dueño lo asocia a una pantalla desde el backoffice. La fila se borra al entregar el token';
comment on column screen_pairings.code is 'Codigo de 6 caracteres (sin 0/O/1/I) que el televisor muestra y el dueño tipea; es la clave primaria y por eso es unico en toda la plataforma, no solo por tenant';
comment on column screen_pairings.claim_secret is 'Secreto aleatorio en base64url que solo conoce el televisor; el codigo es visible en pantalla, por eso solo este secreto permite recibir el token';
comment on column screen_pairings.tenant_id is 'Aislamiento: el codigo solo se puede vincular y consultar dentro del tenant que lo genero';
comment on column screen_pairings.screen_id is 'NULL mientras el codigo esta pendiente; al vincularse apunta a la pantalla cuyo token recibira el televisor';
comment on column screen_pairings.expires_at is 'Vencimiento a los 10 minutos: limita el tiempo en que un codigo visible puede ser adivinado o reutilizado';

comment on index uq_screen_pairings_claim_secret is 'Garantiza secretos unicos y sirve la consulta del televisor por claim_secret cada pocos segundos';
comment on index ix_screen_pairings_tenant_expires is 'Hace barata la limpieza de codigos vencidos de un tenant que se hace al generar un codigo nuevo';
