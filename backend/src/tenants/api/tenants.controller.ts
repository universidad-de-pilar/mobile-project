import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { RequirePermissions } from 'src/roles/api/require-permissions.decorator';
import { CreateTenantUseCase } from '../application/create.use-case';
import { GetAllTenantsUseCase } from '../application/get-all.use-case';
import { SetTenantActiveUseCase } from '../application/set-active.use-case';
import { UpdateTenantUseCase } from '../application/update.use-case';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly getAllTenants: GetAllTenantsUseCase,
    private readonly createTenant: CreateTenantUseCase,
    private readonly updateTenant: UpdateTenantUseCase,
    private readonly setTenantActive: SetTenantActiveUseCase,
  ) {}

  @Get()
  @RequirePermissions('tenants:read')
  list() {
    return this.getAllTenants.execute();
  }

  @Post()
  @RequirePermissions('tenants:create')
  create(@Body() dto: CreateTenantDto) {
    return this.createTenant.execute(dto);
  }

  @Patch(':tenantId')
  @RequirePermissions('tenants:update')
  update(@Param('tenantId', ParseUUIDPipe) tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.updateTenant.execute(tenantId, dto);
  }

  @Post(':tenantId/suspend')
  @HttpCode(200)
  @RequirePermissions('tenants:update')
  suspend(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.setTenantActive.execute(tenantId, false);
  }

  @Post(':tenantId/reactivate')
  @HttpCode(200)
  @RequirePermissions('tenants:update')
  reactivate(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.setTenantActive.execute(tenantId, true);
  }
}
