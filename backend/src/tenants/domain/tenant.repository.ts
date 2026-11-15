import { Tenant } from "./tenant.entity";
import type { StoreRow } from "src/stores/domain/store.repository";

export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY')

export interface TenantRow extends Tenant {
    created_at: Date;
}

export interface CreateTenantData {
    name: string;
    slug: string;
    store: { name: string; slug: string; address: string | null };
    ownerId: string;
}

export interface TenantPatch {
    name?: string;
    is_active?: boolean;
}

export interface ITenantRepository{
    list():Promise<TenantRow[]>;
    update(tenantId: string, patch: TenantPatch):Promise<TenantRow | null>;
    createWithOwner(data: CreateTenantData):Promise<{ tenant: TenantRow; store: StoreRow }>;
    findBySlug(slug:string):Promise<Tenant | null>;
    isActiveMember(tenantId:string, userId:string):Promise<boolean>;
    isStoreOfTenant(tenantId:string, storeId:string):Promise<boolean>;
    // null = sin restriccion (owner/root); para un empleado, sus locales activos asignados.
    allowedStoreIds(tenantId:string, userId:string):Promise<string[] | null>;
    findActiveStoreBySlug(tenantId:string, slug:string):Promise<{ store_id:string; name:string; slug:string } | null>;
}
