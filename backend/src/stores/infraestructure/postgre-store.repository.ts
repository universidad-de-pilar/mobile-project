import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { IStoreRepository, StorePatch, StoreRow } from "../domain/store.repository";

const COLUMNS = 'store_id, name, slug, address, phone, whatsapp_number, is_active, created_at';
const UPDATABLE = ['name', 'address', 'phone', 'whatsapp_number'] as const;

@Injectable()
export class PostgreStoreRepository implements IStoreRepository {

    constructor(@InjectDataSource() private readonly dataSource: DataSource){}

    list(tenantId: string): Promise<StoreRow[]> {
        return this.dataSource.query(
            `SELECT ${COLUMNS} FROM stores WHERE tenant_id = $1 ORDER BY created_at, store_id`,
            [tenantId],
        );
    }

    async findById(tenantId: string, storeId: string): Promise<StoreRow | null> {
        const rows = await this.dataSource.query(
            `SELECT ${COLUMNS} FROM stores WHERE tenant_id = $1 AND store_id = $2`,
            [tenantId, storeId],
        );
        return rows[0] ?? null;
    }

    async update(tenantId: string, storeId: string, patch: StorePatch): Promise<StoreRow | null> {
        const fields = UPDATABLE.filter((field) => patch[field] !== undefined);
        const sets = fields.map((field, i) => `${field} = $${i + 3}`).join(', ');
        // pg returns [rows, affectedCount] for UPDATE
        const [rows] = await this.dataSource.query(
            `UPDATE stores SET ${sets} WHERE tenant_id = $1 AND store_id = $2 RETURNING ${COLUMNS}`,
            [tenantId, storeId, ...fields.map((field) => patch[field])],
        );
        return rows[0] ?? null;
    }
}
