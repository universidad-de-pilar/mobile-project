import { Inject, Injectable } from "@nestjs/common";
import { buildWhatsappParts } from "../domain/whatsapp-message";
import { productsUnavailable, storeNotFound, type UnavailableProduct } from "../domain/order.errors";
import { ORDER_REPOSITORY, type IOrderRepository } from "../domain/order.repository";

export interface CreateOrderInput {
    items: { product_id: string; quantity: number }[];
    customer_name?: string | null;
    note?: string | null;
    source_screen_id?: string | null;
}

// Money is computed in integer cents to avoid float drift.
const toCents = (amount: string) => Math.round(Number(amount) * 100);
const fromCents = (cents: number) => (cents / 100).toFixed(2);

@Injectable()
export class CreateOrderUseCase {

    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
    ){}

    async execute(tenantId: string, storeSlug: string, input: CreateOrderInput){

        const store = await this.orderRepository.findStoreBySlug(tenantId, storeSlug);
        if (!store){
            throw storeNotFound();
        }

        return this.orderRepository.transaction(async (tx) => {
            const products = await tx.findProducts(tenantId, store.store_id, input.items.map((i) => i.product_id));
            const byId = new Map(products.map((p) => [p.product_id, p]));

            const details: UnavailableProduct[] = [];
            for (const item of input.items){
                const product = byId.get(item.product_id);
                if (!product){
                    details.push({ product_id: item.product_id, reason: 'not_found' });
                } else if (!product.is_available){
                    details.push({ product_id: item.product_id, name: product.name, reason: 'unavailable' });
                }
            }
            if (details.length > 0){
                throw productsUnavailable(details);
            }

            const lines = input.items.map((item, index) => {
                const product = byId.get(item.product_id)!;
                return {
                    line_number: index + 1,
                    product_id: item.product_id,
                    product_name: product.name,
                    unit_price: product.price,
                    quantity: item.quantity,
                    line_total: fromCents(toCents(product.price) * item.quantity),
                };
            });
            const total = fromCents(lines.reduce((sum, l) => sum + toCents(l.line_total), 0));

            const sourceScreenId = input.source_screen_id && await tx.isActiveScreen(tenantId, store.store_id, input.source_screen_id)
                ? input.source_screen_id
                : null;
            const customerName = input.customer_name || null;
            const note = input.note || null;

            const orderNumber = await tx.nextOrderNumber(tenantId);
            const { order_id, created_at } = await tx.insertOrder(tenantId, {
                store_id: store.store_id, order_number: orderNumber, source_screen_id: sourceScreenId,
                customer_name: customerName, note, total,
            });
            await tx.insertItems(tenantId, order_id, lines.map(({ line_total, ...item }) => item));

            return {
                order_id,
                order_number: orderNumber,
                status: 'generada' as const,
                store: { name: store.name, slug: store.slug },
                customer_name: customerName,
                note,
                total,
                created_at,
                items: lines,
                whatsapp_parts: buildWhatsappParts(
                    store, { order_number: orderNumber, customer_name: customerName, note, total }, lines,
                ),
            };
        });
    }
}
