import { Body, Controller, Param, Post } from '@nestjs/common';
import { Public } from 'src/auth/api/public.decorator';
import { CurrentTenant } from 'src/tenants/api/current-tenant.decorator';
import { Tenant } from 'src/tenants/domain/tenant.entity';
import { CreateOrderUseCase } from '../application/create-order.use-case';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('public/stores')
export class PublicOrdersController {
  constructor(private readonly createOrder: CreateOrderUseCase) {}

  @Public()
  @Post(':storeSlug/orders')
  create(@CurrentTenant() tenant: Tenant, @Param('storeSlug') storeSlug: string, @Body() dto: CreateOrderDto) {
    return this.createOrder.execute(tenant.tenant_id, storeSlug, dto);
  }
}
