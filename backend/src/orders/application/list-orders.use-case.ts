import { Inject, Injectable } from "@nestjs/common";
import { canAccessStore } from "src/tenants/domain/store-access";
import { TENANT_REPOSITORY, type ITenantRepository } from "src/tenants/domain/tenant.repository";
import { storeNotFound } from "../domain/order.errors";
import { ORDER_REPOSITORY, type IOrderRepository } from "../domain/order.repository";
import { OrderStatus } from "../domain/order-status";

export interface ListOrdersQuery {
    store_id: string;
    status?: OrderStatus;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

@Injectable()
export class ListOrdersUseCase {

    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenantId: string, query: ListOrdersQuery, userId: string){
        if (!(await this.tenantRepository.isStoreOfTenant(tenantId, query.store_id))
            || !(await canAccessStore(this.tenantRepository, tenantId, userId, query.store_id))) throw storeNotFound();

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const { rows, total } = await this.orderRepository.list(tenantId, {
            store_id: query.store_id, status: query.status, from: query.from, to: query.to,
            offset: (page - 1) * limit, limit,
        });
        return { data: rows, meta: { page, limit, total } };
    }
}
