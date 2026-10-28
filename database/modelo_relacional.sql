
-- Modelo relacional de EduKit
-- BU-007: Catalogo, pedidos, pagos y donaciones

-- Librerias que publican productos en el catalogo.
CREATE TABLE IF NOT EXISTS librerias (
    libreria_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

-- Bibliotecas que reciben las donaciones.
CREATE TABLE IF NOT EXISTS bibliotecas (
    biblioteca_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

-- Productos publicados por cada libreria.
CREATE TABLE IF NOT EXISTS productos (
    producto_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    libreria_id UUID NOT NULL REFERENCES librerias(libreria_id),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL CHECK (precio > 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (producto_id, libreria_id)
);

-- Pedido general realizado por un usuario.
CREATE TABLE IF NOT EXISTS ordenes (
    orden_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(30) NOT NULL UNIQUE,
    usuario_id UUID NOT NULL REFERENCES users(user_id),
    tipo VARCHAR(20) NOT NULL
        CHECK (tipo IN ('COMPRA', 'DONACION')),
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE_PAGO'
        CHECK (estado IN (
            'PENDIENTE_PAGO',
            'PAGADO',
            'EN_PREPARACION',
            'DISPONIBLE',
            'ENTREGADO',
            'CANCELADO',
            'RECHAZADO',
            'REEMBOLSADO'
        )),
    total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Si un pedido incluye productos de varias librerias,
-- se genera un subpedido para cada una.
CREATE TABLE IF NOT EXISTS subpedidos (
    subpedido_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID NOT NULL REFERENCES ordenes(orden_id),
    libreria_id UUID NOT NULL REFERENCES librerias(libreria_id),
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE_PAGO'
        CHECK (estado IN (
            'PENDIENTE_PAGO',
            'PAGADO',
            'EN_PREPARACION',
            'DISPONIBLE',
            'ENTREGADO',
            'CANCELADO',
            'RECHAZADO',
            'REEMBOLSADO'
        )),
    total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (orden_id, libreria_id),
    UNIQUE (subpedido_id, libreria_id)
);

-- Detalle de los productos incluidos en cada subpedido.
-- Se guarda el precio de la compra para conservar el historial.
CREATE TABLE IF NOT EXISTS detalle_subpedidos (
    detalle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subpedido_id UUID NOT NULL,
    libreria_id UUID NOT NULL,
    producto_id UUID NOT NULL,
    nombre_producto VARCHAR(200) NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL
        CHECK (precio_unitario > 0),
    subtotal NUMERIC(10,2)
        GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,

    FOREIGN KEY (subpedido_id, libreria_id)
        REFERENCES subpedidos(subpedido_id, libreria_id),

    FOREIGN KEY (producto_id, libreria_id)
        REFERENCES productos(producto_id, libreria_id)
);

-- Aceptacion del consentimiento para realizar una donacion.
CREATE TABLE IF NOT EXISTS consentimientos_donacion (
    consentimiento_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID NOT NULL REFERENCES ordenes(orden_id),
    usuario_id UUID NOT NULL REFERENCES users(user_id),
    version_texto VARCHAR(50) NOT NULL,
    aceptado BOOLEAN NOT NULL CHECK (aceptado = TRUE),
    aceptado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (orden_id, version_texto)
);

-- Pagos asociados a cada subpedido.
CREATE TABLE IF NOT EXISTS pagos (
    pago_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subpedido_id UUID NOT NULL REFERENCES subpedidos(subpedido_id),
    metodo VARCHAR(30) NOT NULL
        CHECK (metodo IN ('TRANSFERENCIA', 'EFECTIVO', 'OTRO')),
    referencia VARCHAR(150),
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN (
            'PENDIENTE',
            'CONFIRMADO',
            'RECHAZADO',
            'REEMBOLSADO'
        )),
    confirmado_por UUID REFERENCES users(user_id),
    confirmado_en TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        (estado = 'CONFIRMADO'
            AND confirmado_por IS NOT NULL
            AND confirmado_en IS NOT NULL)
        OR
        (estado <> 'CONFIRMADO'
            AND confirmado_por IS NULL
            AND confirmado_en IS NULL)
    )
);

-- Donacion correspondiente a un subpedido.
CREATE TABLE IF NOT EXISTS donaciones (
    donacion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subpedido_id UUID NOT NULL UNIQUE REFERENCES subpedidos(subpedido_id),
    biblioteca_id UUID NOT NULL REFERENCES bibliotecas(biblioteca_id),
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE_PAGO'
        CHECK (estado IN (
            'PENDIENTE_PAGO',
            'CONFIRMADA',
            'ASIGNADA',
            'LISTA_RETIRO',
            'RETIRADA',
            'ENTREGADA',
            'CANCELADA',
            'CON_INCIDENCIA'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Historial de los cambios de estado de una donacion.
CREATE TABLE IF NOT EXISTS movimientos_donacion (
    movimiento_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donacion_id UUID NOT NULL REFERENCES donaciones(donacion_id),
    estado VARCHAR(30) NOT NULL,
    actor_id UUID NOT NULL REFERENCES users(user_id),
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacion TEXT
);

-- Comprobantes emitidos por cada libreria.
CREATE TABLE IF NOT EXISTS comprobantes (
    comprobante_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subpedido_id UUID NOT NULL,
    libreria_id UUID NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    numero VARCHAR(80) NOT NULL,
    referencia TEXT,
    emitido_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (subpedido_id, libreria_id)
        REFERENCES subpedidos(subpedido_id, libreria_id),

    UNIQUE (libreria_id, tipo, numero)
);

-- Registro de las operaciones realizadas en el sistema.
CREATE TABLE IF NOT EXISTS auditoria_eventos (
    evento_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad VARCHAR(80) NOT NULL,
    entidad_id UUID NOT NULL,
    accion VARCHAR(30) NOT NULL,
    actor_id UUID REFERENCES users(user_id),
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datos_anteriores JSONB,
    datos_nuevos JSONB
);

-- Indices para facilitar las consultas habituales.
CREATE INDEX IF NOT EXISTS idx_productos_libreria
    ON productos(libreria_id);

CREATE INDEX IF NOT EXISTS idx_subpedidos_orden
    ON subpedidos(orden_id);

CREATE INDEX IF NOT EXISTS idx_detalle_subpedido
    ON detalle_subpedidos(subpedido_id);

CREATE INDEX IF NOT EXISTS idx_pagos_subpedido
    ON pagos(subpedido_id, estado);

CREATE INDEX IF NOT EXISTS idx_donaciones_biblioteca
    ON donaciones(biblioteca_id, estado);

CREATE INDEX IF NOT EXISTS idx_movimientos_donacion
    ON movimientos_donacion(donacion_id, fecha);

CREATE INDEX IF NOT EXISTS idx_auditoria_entidad
    ON auditoria_eventos(entidad, entidad_id, fecha);
