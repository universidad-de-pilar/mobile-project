import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { emailTaken } from "../domain/employee.errors";
import { CreateEmployeeData, EmployeePatch, EmployeeRow, IEmployeeRepository } from "../domain/employee.repository";

const UNIQUE_VIOLATION = '23505';
const UPDATABLE_USER = ['first_name', 'last_name'] as const;

// Solo cuentan los locales activos del propio tenant; el filtro por usuario es opcional.
const MEMBERS_SQL = `
    SELECT u.user_id, u.email, u.first_name, u.last_name, r.name AS role, ut.is_active,
           COALESCE(array_agg(s.store_id::text) FILTER (WHERE s.store_id IS NOT NULL), '{}') AS store_ids
    FROM users_tenants ut
    JOIN users u ON u.user_id = ut.user_id
    JOIN roles r ON r.role_id = ut.role_id
    LEFT JOIN users_stores us ON us.user_id = u.user_id AND us.is_active = true
    LEFT JOIN stores s ON s.store_id = us.store_id AND s.tenant_id = ut.tenant_id AND s.is_active = true
    WHERE ut.tenant_id = $1 AND ($2::uuid IS NULL OR u.user_id = $2::uuid)
    GROUP BY u.user_id, r.name, ut.is_active
    ORDER BY u.first_name, u.last_name, u.user_id`;

@Injectable()
export class PostgreEmployeeRepository implements IEmployeeRepository {

    constructor(private readonly db: DataSource){}

    list(tenantId: string): Promise<EmployeeRow[]> {
        return this.db.query(MEMBERS_SQL, [tenantId, null]);
    }

    async findMember(tenantId: string, userId: string): Promise<EmployeeRow | null> {
        const rows = await this.db.query(MEMBERS_SQL, [tenantId, userId]);
        return rows[0] ?? null;
    }

    async areActiveStoresOfTenant(tenantId: string, storeIds: string[]): Promise<boolean> {
        const [{ count }] = await this.db.query(
            'SELECT count(*)::int AS count FROM stores WHERE tenant_id = $1 AND is_active = true AND store_id = ANY($2::uuid[])',
            [tenantId, storeIds],
        );
        return count === new Set(storeIds).size;
    }

    async create(tenantId: string, data: CreateEmployeeData): Promise<EmployeeRow> {
        let userId: string;
        try {
            userId = await this.db.transaction(async (tx) => {
                const [user] = await tx.query(
                    'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING user_id',
                    [data.email, data.password_hash, data.first_name, data.last_name],
                );
                const granted = await tx.query(
                    "INSERT INTO users_roles (user_id, role_id) SELECT $1, role_id FROM roles WHERE name = 'employee' RETURNING role_id",
                    [user.user_id],
                );
                if (granted.length === 0) throw new Error("Role 'employee' is missing; run db:apply");
                await tx.query(
                    "INSERT INTO users_tenants (user_id, tenant_id, role_id) SELECT $1, $2, role_id FROM roles WHERE name = 'employee'",
                    [user.user_id, tenantId],
                );
                await tx.query(
                    'INSERT INTO users_stores (user_id, store_id) SELECT $1, unnest($2::uuid[])',
                    [user.user_id, data.store_ids],
                );
                return user.user_id;
            });
        } catch (error: any) {
            // Cubre la carrera entre el chequeo previo de email y el insert.
            if ((error?.driverError?.code ?? error?.code) === UNIQUE_VIOLATION) throw emailTaken();
            throw error;
        }
        return (await this.findMember(tenantId, userId))!;
    }

    async update(tenantId: string, userId: string, patch: EmployeePatch): Promise<EmployeeRow> {
        await this.db.transaction(async (tx) => {
            const fields = UPDATABLE_USER.filter((field) => patch[field] !== undefined);
            if (fields.length > 0) {
                const sets = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
                await tx.query(`UPDATE users SET ${sets} WHERE user_id = $1`, [userId, ...fields.map((field) => patch[field])]);
            }
            if (patch.is_active !== undefined) {
                await tx.query(
                    'UPDATE users_tenants SET is_active = $3 WHERE tenant_id = $1 AND user_id = $2',
                    [tenantId, userId, patch.is_active],
                );
            }
        });
        return (await this.findMember(tenantId, userId))!;
    }

    async replaceStores(tenantId: string, userId: string, storeIds: string[]): Promise<EmployeeRow> {
        await this.db.transaction(async (tx) => {
            // Baja logica de los locales del tenant que ya no estan en la lista.
            await tx.query(
                `UPDATE users_stores SET is_active = false
                 WHERE user_id = $1 AND store_id <> ALL($3::uuid[])
                   AND store_id IN (SELECT store_id FROM stores WHERE tenant_id = $2)`,
                [userId, tenantId, storeIds],
            );
            await tx.query(
                `INSERT INTO users_stores (user_id, store_id) SELECT $1, unnest($2::uuid[])
                 ON CONFLICT (user_id, store_id) DO UPDATE SET is_active = true`,
                [userId, storeIds],
            );
        });
        return (await this.findMember(tenantId, userId))!;
    }
}
