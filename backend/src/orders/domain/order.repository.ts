import type { OrderStatus } from './order-status';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY')

export interface OrderStore {
    store_id: string;
    name: string;
    slug: string;
    whatsapp_number: string | null;
}

export interface OrderProduct {
    product_id: string;
    name: string;
    price: string;
    is_available: boolean;
}

export interface NewOrder {
    store_id: string;
    order_number: number;
    source_screen_id: string | null;
    customer_name: string | null;
    note: string | null;
    total: string;
}

export interface NewOrderItem {
    line_number: number;
    product_id: string;
    product_name: string;
    unit_price: string;
    quantity: number;
}

// Operations that must share the one transaction of the order.
export interface IOrderTransaction {
    findProducts(tenantId: string, storeId: string, productIds: string[]): Promise<OrderProduct[]>;
    isActiveScreen(tenantId: string, storeId: string, screenId: string): Promise<boolean>;
    nextOrderNumber(tenantId: string): Promise<number>;
    insertOrder(tenantId: string, order: NewOrder): Promise<{ order_id: string; created_at: Date }>;
    insertItems(tenantId: string, orderId: string, items: NewOrderItem[]): Promise<void>;
}

export interface OrderSummary {
    order_id: string;
    order_number: number;
    store_id: string;
    status: OrderStatus;
    customer_name: string | null;
    note: string | null;
    total: string;
    items_count: number;
    source_screen: { screen_id: string; name: string } | null;
    created_at: Date;
    status_changed_at: Date;
    status_changed_by: string | null;
}

export interface OrderDetail extends OrderSummary {
    items: {
        line_number: number;
        product_id: string | null;
        product_name: string;
        unit_price: string;
        quantity: number;
        line_total: string;
    }[];
}

export interface OrderListFilter {
    store_id: string;
    status?: OrderStatus;
    from?: string;
    to?: string;
    offset: number;
    limit: number;
}

export interface IOrderRepository {
    list(tenantId: string, filter: OrderListFilter): Promise<{ rows: OrderSummary[]; total: number }>;
    findById(tenantId: string, orderId: string): Promise<OrderDetail | null>;
    // false when the order is no longer in `from` (lost a race).
    changeStatus(tenantId: string, orderId: string, from: OrderStatus, to: OrderStatus, userId: string): Promise<boolean>;
    findStoreBySlug(tenantId: string, slug: string): Promise<OrderStore | null>;
    transaction<T>(work: (tx: IOrderTransaction) => Promise<T>): Promise<T>;
}
