import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tenant } from "../domain/tenant.entity";
import { invalidSlug, slugTaken } from "../domain/tenant.errors";
import { CreateTenantData, ITenantRepository, TenantPatch, TenantRow } from "../domain/tenant.repository";
import { TenantOrmEntity } from "./tenant.orm-entity";

const TENANT_COLUMNS = 'tenant_id, name, slug, is_active, created_at';
const STORE_COLUMNS = 'store_id, name, slug, address, phone, whatsapp_number, is_active, created_at';
const UPDATABLE = ['name', 'is_active'] as const;
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';

const pgCode = (error: any): string | undefined => error?.driverError?.code ?? error?.code;

@Injectable()
export class PostgreTenantRepository implements ITenantRepository{

    constructor(
        @InjectRepository(TenantOrmEntity)
        private readonly tenantDb: Repository<TenantOrmEntity>
    ){}

    list(): Promise<TenantRow[]> {
        return this.tenantDb.manager.query(`SELECT ${TENANT_COLUMNS} FROM tenants ORDER BY created_at, tenant_id`);
    }

    async update(tenantId: string, patch: TenantPatch): Promise<TenantRow | null> {
        const fields = UPDATABLE.filter((field) => patch[field] !== undefined);
        const sets = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
        // pg returns [rows, affectedCount] for UPDATE
        const [rows] = await this.tenantDb.manager.query(
            `UPDATE tenants SET ${sets} WHERE tenant_id = $1 RETURNING ${TENANT_COLUMNS}`,
            [tenantId, ...fields.map((field) => patch[field])],
        );
        return rows[0] ?? null;
    }

    // Mirrors database/seeds/dev_local1.sql: the owner needs the three links to operate the tenant.
    async createWithOwner(data: CreateTenantData) {
        try {
            return await this.tenantDb.manager.transaction(async (tx) => {
                const [tenant] = await tx.query(
                    `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING ${TENANT_COLUMNS}`,
                    [data.name, data.slug],
                );
                const [store] = await tx.query(
                    `INSERT INTO stores (tenant_id, name, slug, address) VALUES ($1, $2, $3, $4) RETURNING ${STORE_COLUMNS}`,
                    [tenant.tenant_id, data.store.name, data.store.slug, data.store.address],
                );
                const owner = await tx.query(
                    `INSERT INTO users_tenants (user_id, tenant_id, role_id)
                     SELECT $1, $2, role_id FROM roles WHERE name = 'owner' RETURNING role_id`,
                    [data.ownerId, tenant.tenant_id],
                );
                if (owner.length === 0) throw new Error("Role 'owner' is missing; run db:apply");
                await tx.query(`INSERT INTO users_stores (user_id, store_id) VALUES ($1, $2)`, [data.ownerId, store.store_id]);
                await tx.query(
                    `INSERT INTO users_roles (user_id, role_id) SELECT $1, role_id FROM roles WHERE name = 'owner' ON CONFLICT DO NOTHING`,
                    [data.ownerId],
                );
                return { tenant, store };
            });
        } catch (error) {
            if (pgCode(error) === UNIQUE_VIOLATION) throw slugTaken();
            if (pgCode(error) === CHECK_VIOLATION) throw invalidSlug();
            throw error;
        }
    }

    async findBySlug(slug:string): Promise<Tenant | null> {
        return this.tenantDb.findOne({ where: { slug } });
    }
    async isActiveMember(tenantId: string, userId: string): Promise<boolean> {
        const rows = await this.tenantDb.manager.query(
            'SELECT 1 FROM users_tenants WHERE tenant_id = $1 AND user_id = $2 AND is_active = true LIMIT 1',
            [tenantId, userId],
        );
        return rows.length > 0;
    }
    async isStoreOfTenant(tenantId: string, storeId: string): Promise<boolean> {
        const rows = await this.tenantDb.manager.query(
            'SELECT 1 FROM stores WHERE store_id = $1 AND tenant_id = $2 LIMIT 1',
            [storeId, tenantId],
        );
        return rows.length > 0;
    }
    async allowedStoreIds(tenantId: string, userId: string): Promise<string[] | null> {
        const rows = await this.tenantDb.manager.query(
            `SELECT s.store_id
             FROM users_tenants ut
             JOIN roles r ON r.role_id = ut.role_id AND r.name = 'employee'
             LEFT JOIN users_stores us ON us.user_id = ut.user_id AND us.is_active = true
             LEFT JOIN stores s ON s.store_id = us.store_id AND s.tenant_id = ut.tenant_id AND s.is_active = true
             WHERE ut.tenant_id = $1 AND ut.user_id = $2 AND ut.is_active = true`,
            [tenantId, userId],
        );
        if (rows.length === 0) return null;
        return rows.map((r: { store_id: string | null }) => r.store_id).filter((id: string | null): id is string => id !== null);
    }
    async findActiveStoreBySlug(tenantId: string, slug: string): Promise<{ store_id: string; name: string; slug: string } | null> {
        const rows = await this.tenantDb.manager.query(
            "SELECT store_id, name, slug FROM stores WHERE tenant_id = $1 AND slug = $2 AND is_active = true LIMIT 1",
            [tenantId, slug],
        );
        return rows[0] ?? null;
    }

}
