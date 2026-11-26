export interface NewPairing { code: string; claim_secret: string; expires_at: Date }

export interface IPairingRepository {
    // false si el código ya existe (choque de clave primaria).
    create(tenantId: string, pairing: NewPairing): Promise<boolean>;
    deleteExpired(tenantId: string): Promise<void>;
    // null si no existe o venció; token solo si está vinculado a una pantalla activa.
    findClaim(tenantId: string, claimSecret: string): Promise<{ token: string | null } | null>;
    deleteClaim(tenantId: string, claimSecret: string): Promise<void>;
    // Solo vincula un código pendiente y vigente del tenant; false si no hay ninguno.
    pair(tenantId: string, screenId: string, code: string): Promise<boolean>;
}

export const PAIRING_REPOSITORY = Symbol('PAIRING_REPOSITORY');
