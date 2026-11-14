export const EMPLOYEE_REPOSITORY = Symbol('EMPLOYEE_REPOSITORY');

export interface EmployeeRow {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
    store_ids: string[];
}

export interface CreateEmployeeData {
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    store_ids: string[];
}

export interface EmployeePatch {
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
}

export interface IEmployeeRepository {
    list(tenantId: string): Promise<EmployeeRow[]>;
    findMember(tenantId: string, userId: string): Promise<EmployeeRow | null>;
    areActiveStoresOfTenant(tenantId: string, storeIds: string[]): Promise<boolean>;
    create(tenantId: string, data: CreateEmployeeData): Promise<EmployeeRow>;
    update(tenantId: string, userId: string, patch: EmployeePatch): Promise<EmployeeRow>;
    replaceStores(tenantId: string, userId: string, storeIds: string[]): Promise<EmployeeRow>;
}
