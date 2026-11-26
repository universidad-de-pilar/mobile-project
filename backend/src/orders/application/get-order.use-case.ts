import { Inject, Injectable } from "@nestjs/common";
import { canAccessStore } from "src/tenants/domain/store-access";
import { TENANT_REPOSITORY, type ITenantRepository } from "src/tenants/domain/tenant.repository";
import { orderNotFound } from "../domain/order.errors";
import { ORDER_REPOSITORY, type IOrderRepository } from "../domain/order.repository";

@Injectable()
export class GetOrderUseCase {

    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenantId: string, orderId: string, userId: string){
        const order = await this.orderRepository.findById(tenantId, orderId);
        // Una orden de un local no asignado se oculta como inexistente.
        if (!order || !(await canAccessStore(this.tenantRepository, tenantId, userId, order.store_id))) throw orderNotFound();
        return order;
    }
}
