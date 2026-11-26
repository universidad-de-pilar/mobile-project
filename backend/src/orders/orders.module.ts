import { Module } from '@nestjs/common';
import { TenantsModule } from 'src/tenants/tenants.module';
import { OrdersController } from './api/orders.controller';
import { PublicOrdersController } from './api/public-orders.controller';
import { ChangeOrderStatusUseCase } from './application/change-order-status.use-case';
import { CreateOrderUseCase } from './application/create-order.use-case';
import { GetOrderUseCase } from './application/get-order.use-case';
import { ListOrdersUseCase } from './application/list-orders.use-case';
import { ORDER_REPOSITORY } from './domain/order.repository';
import { PostgreOrderRepository } from './infraestructure/postgre-order.repository';

@Module({
  imports: [TenantsModule],
  controllers: [PublicOrdersController, OrdersController],
  providers: [
    { provide: ORDER_REPOSITORY, useClass: PostgreOrderRepository },
    CreateOrderUseCase,
    ListOrdersUseCase,
    GetOrderUseCase,
    ChangeOrderStatusUseCase,
  ],
})
export class OrdersModule {}
