import { Inject, Injectable } from "@nestjs/common";
import { canAccessStore } from "src/tenants/domain/store-access";
import { TENANT_REPOSITORY, type ITenantRepository } from "src/tenants/domain/tenant.repository";
import { invalidStatusTransition, orderNotFound } from "../domain/order.errors";
import { ORDER_REPOSITORY, type IOrderRepository } from "../domain/order.repository";
import { allowedTransitions, assertTransition, OrderStatus } from "../domain/order-status";

@Injectable()
export class ChangeOrderStatusUseCase {

    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenantId: string, orderId: string, userId: string, to: OrderStatus){
        const order = await this.orderRepository.findById(tenantId, orderId);
        if (!order || !(await canAccessStore(this.tenantRepository, tenantId, userId, order.store_id))) throw orderNotFound();
        assertTransition(order.status, to);

        if (!(await this.orderRepository.changeStatus(tenantId, orderId, order.status, to, userId))) {
            // Another change won the race: answer with the status it left.
            const current = await this.orderRepository.findById(tenantId, orderId);
            if (!current) throw orderNotFound();
            throw invalidStatusTransition(current.status, to, allowedTransitions(current.status));
        }
        return this.orderRepository.findById(tenantId, orderId);
    }
}
