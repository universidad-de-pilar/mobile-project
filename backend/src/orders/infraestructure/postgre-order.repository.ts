import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";
import { OrderStatus } from "../domain/order-status";
import {
    IOrderRepository, IOrderTransaction, NewOrder, NewOrderItem, OrderDetail, OrderListFilter, OrderProduct, OrderStore, OrderSummary,
} from "../domain/order.repository";

class PostgreOrderTransaction implements IOrderTransaction {

    constructor(private readonly manager: EntityManager){}

    findProducts(tenantId: string, storeId: string, productIds: string[]): Promise<OrderProduct[]> {
        return this.manager.query(
            `SELECT product_id, name, price, is_available FROM products
             WHERE tenant_id = $1 AND store_id = $2 AND product_id = ANY($3::uuid[])`,
            [tenantId, storeId, productIds],
        );
    }

    async isActiveScreen(tenantId: string, storeId: string, screenId: string): Promise<boolean> {
        const rows = await this.manager.query(
            'SELECT 1 FROM screens WHERE screen_id = $1 AND tenant_id = $2 AND store_id = $3 AND is_active = true LIMIT 1',
            [screenId, tenantId, storeId],
        );
        return rows.length > 0;
    }

    // The row lock held until commit serializes concurrent orders of the same tenant.
    async nextOrderNumber(tenantId: string): Promise<number> {
        // pg returns [rows, affectedCount] for UPDATE
        const [rows] = await this.manager.query(
            'UPDATE tenants SET last_order_number = last_order_number + 1 WHERE tenant_id = $1 RETURNING last_order_number',
            [tenantId],
        );
        return rows[0].last_order_number;
    }

    async insertOrder(tenantId: string, order: NewOrder): Promise<{ order_id: string; created_at: Date }> {
        const rows = await this.manager.query(
            `INSERT INTO orders (tenant_id, store_id, order_number, status, source_screen_id, customer_name, note, total)
             VALUES ($1, $2, $3, 'generada', $4, $5, $6, $7) RETURNING order_id, created_at`,
            [tenantId, order.store_id, order.order_number, order.source_screen_id, order.customer_name, order.note, order.total],
        );
        return rows[0];
    }

    // line_total is a generated column: never inserted.
    async insertItems(tenantId: string, orderId: string, items: NewOrderItem[]): Promise<void> {
        for (const item of items) {
            await this.manager.query(
                `INSERT INTO order_items (order_id, line_number, tenant_id, product_id, product_name, unit_price, quantity)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [orderId, item.line_number, tenantId, item.product_id, item.product_name, item.unit_price, item.quantity],
            );
        }
    }
}

const SUMMARY_SELECT = `
    SELECT o.order_id, o.order_number, o.store_id, o.status, o.customer_name, o.note, o.total,
           (SELECT count(*)::int FROM order_items i WHERE i.order_id = o.order_id) AS items_count,
           CASE WHEN s.screen_id IS NULL THEN NULL
                ELSE json_build_object('screen_id', s.screen_id, 'name', s.name) END AS source_screen,
           o.created_at, o.status_changed_at, o.status_changed_by
    FROM orders o
    LEFT JOIN screens s ON s.screen_id = o.source_screen_id AND s.tenant_id = o.tenant_id`;

@Injectable()
export class PostgreOrderRepository implements IOrderRepository {

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource
    ){}

    async findStoreBySlug(tenantId: string, slug: string): Promise<OrderStore | null> {
        const rows = await this.dataSource.query(
            'SELECT store_id, name, slug, whatsapp_number FROM stores WHERE tenant_id = $1 AND slug = $2 AND is_active = true LIMIT 1',
            [tenantId, slug],
        );
        return rows[0] ?? null;
    }

    transaction<T>(work: (tx: IOrderTransaction) => Promise<T>): Promise<T> {
        return this.dataSource.transaction((manager) => work(new PostgreOrderTransaction(manager)));
    }

    async list(tenantId: string, filter: OrderListFilter): Promise<{ rows: OrderSummary[]; total: number }> {
        const params: unknown[] = [tenantId, filter.store_id];
        let where = 'o.tenant_id = $1 AND o.store_id = $2';
        if (filter.status) { params.push(filter.status); where += ` AND o.status = $${params.length}`; }
        if (filter.from) { params.push(filter.from); where += ` AND o.created_at >= $${params.length}`; }
        if (filter.to) { params.push(filter.to); where += ` AND o.created_at < $${params.length}`; }

        const [{ total }] = await this.dataSource.query(`SELECT count(*)::int AS total FROM orders o WHERE ${where}`, params);
        const rows = await this.dataSource.query(
            `${SUMMARY_SELECT} WHERE ${where} ORDER BY o.created_at DESC, o.order_id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, filter.limit, filter.offset],
        );
        return { rows, total };
    }

    async findById(tenantId: string, orderId: string): Promise<OrderDetail | null> {
        const rows = await this.dataSource.query(`${SUMMARY_SELECT} WHERE o.tenant_id = $1 AND o.order_id = $2`, [tenantId, orderId]);
        if (!rows[0]) return null;
        const items = await this.dataSource.query(
            `SELECT line_number, product_id, product_name, unit_price, quantity, line_total
             FROM order_items WHERE tenant_id = $1 AND order_id = $2 ORDER BY line_number`,
            [tenantId, orderId],
        );
        return { ...rows[0], items };
    }

    async changeStatus(tenantId: string, orderId: string, from: OrderStatus, to: OrderStatus, userId: string): Promise<boolean> {
        // For UPDATE, TypeORM's postgres driver returns [rows, affectedCount].
        const [, affected] = await this.dataSource.query(
            `UPDATE orders SET status = $3, status_changed_at = now(), status_changed_by = $4, updated_at = now()
             WHERE tenant_id = $1 AND order_id = $2 AND status = $5`,
            [tenantId, orderId, to, userId, from],
        );
        return affected > 0;
    }
}
