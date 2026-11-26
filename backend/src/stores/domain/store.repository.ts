export interface StoreRow {
    store_id: string;
    name: string;
    slug: string;
    address: string | null;
    phone: string | null;
    whatsapp_number: string | null;
    is_active: boolean;
    created_at: Date;
}

export type StorePatch = Partial<Pick<StoreRow, 'name' | 'address' | 'phone' | 'whatsapp_number'>>;

export interface IStoreRepository {
    list(tenantId: string): Promise<StoreRow[]>;
    findById(tenantId: string, storeId: string): Promise<StoreRow | null>;
    update(tenantId: string, storeId: string, patch: StorePatch): Promise<StoreRow | null>;
}

export const STORE_REPOSITORY = Symbol('STORE_REPOSITORY');
