import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { CurrentUserId } from 'src/auth/api/current-user.decorator';
import { RequirePermissions } from 'src/roles/api/require-permissions.decorator';
import { CurrentTenant } from 'src/tenants/api/current-tenant.decorator';
import { Tenant } from 'src/tenants/domain/tenant.entity';
import { CreateEmployeeUseCase } from '../application/create.use-case';
import { ListEmployeesUseCase } from '../application/list.use-case';
import { SetEmployeeStoresUseCase } from '../application/set-stores.use-case';
import { UpdateEmployeeUseCase } from '../application/update.use-case';
import { CreateEmployeeDto, StoreIdsDto, UpdateEmployeeDto } from './dto/employee.dto';

@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly listEmployees: ListEmployeesUseCase,
    private readonly createEmployee: CreateEmployeeUseCase,
    private readonly updateEmployee: UpdateEmployeeUseCase,
    private readonly setEmployeeStores: SetEmployeeStoresUseCase,
  ) {}

  @Get()
  @RequirePermissions('employees:read')
  list(@CurrentTenant() tenant: Tenant) {
    return this.listEmployees.execute(tenant.tenant_id);
  }

  @Post()
  @RequirePermissions('employees:create')
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateEmployeeDto) {
    return this.createEmployee.execute(tenant.tenant_id, dto);
  }

  @Patch(':id')
  @RequirePermissions('employees:update')
  update(
    @CurrentTenant() tenant: Tenant,
    @CurrentUserId() actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.updateEmployee.execute(tenant.tenant_id, actorId, id, dto);
  }

  @Put(':id/stores')
  @RequirePermissions('employees:update')
  setStores(@CurrentTenant() tenant: Tenant, @Param('id', ParseUUIDPipe) id: string, @Body() dto: StoreIdsDto) {
    return this.setEmployeeStores.execute(tenant.tenant_id, id, dto.store_ids);
  }
}
