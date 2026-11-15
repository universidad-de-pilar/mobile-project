import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { CurrentUserId } from 'src/auth/api/current-user.decorator';
import { RequirePermissions } from 'src/roles/api/require-permissions.decorator';
import { CurrentTenant } from 'src/tenants/api/current-tenant.decorator';
import { Tenant } from 'src/tenants/domain/tenant.entity';
import { ChangeOrderStatusUseCase } from '../application/change-order-status.use-case';
import { GetOrderUseCase } from '../application/get-order.use-case';
import { ListOrdersUseCase } from '../application/list-orders.use-case';
import { ChangeOrderStatusDto, ListOrdersQueryDto } from './dto/order-admin.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly listOrders: ListOrdersUseCase,
    private readonly getOrder: GetOrderUseCase,
    private readonly changeOrderStatus: ChangeOrderStatusUseCase,
  ) {}

  @Get()
  @RequirePermissions('orders:read')
  list(@CurrentTenant() tenant: Tenant, @CurrentUserId() userId: string, @Query() query: ListOrdersQueryDto) {
    return this.listOrders.execute(tenant.tenant_id, query, userId);
  }

  @Get(':orderId')
  @RequirePermissions('orders:read')
  get(@CurrentTenant() tenant: Tenant, @CurrentUserId() userId: string, @Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.getOrder.execute(tenant.tenant_id, orderId, userId);
  }

  @Patch(':orderId/status')
  @RequirePermissions('orders:update')
  changeStatus(
    @CurrentTenant() tenant: Tenant,
    @CurrentUserId() userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: ChangeOrderStatusDto,
  ) {
    return this.changeOrderStatus.execute(tenant.tenant_id, orderId, userId, dto.status);
  }
}
