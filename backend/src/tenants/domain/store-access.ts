import type { ITenantRepository } from "./tenant.repository";

// Owner y root no tienen restriccion; el empleado solo accede a sus locales asignados.
export async function canAccessStore(repo: ITenantRepository, tenantId: string, userId: string, storeId: string): Promise<boolean> {
    const allowed = await repo.allowedStoreIds(tenantId, userId);
    return allowed === null || allowed.includes(storeId);
}
