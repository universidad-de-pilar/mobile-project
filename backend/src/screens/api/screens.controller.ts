import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { RequirePermissions } from 'src/roles/api/require-permissions.decorator';
import { CurrentTenant } from 'src/tenants/api/current-tenant.decorator';
import { Tenant } from 'src/tenants/domain/tenant.entity';
import { CreateScreenUseCase } from '../application/create-screen.use-case';
import { ListScreensUseCase } from '../application/list-screens.use-case';
import { GetScreenScheduleUseCase, SetScreenScheduleUseCase } from '../application/screen-schedule.use-cases';
import { PairScreenUseCase } from '../application/screen-pairing.use-cases';
import { UpdateScreenUseCase } from '../application/update-screen.use-case';
import { CreateScreenDto, ListScreensQueryDto, PairScreenDto, SetScheduleDto, UpdateScreenDto } from './dto/screen.dto';

@Controller('screens')
export class ScreensController {
  constructor(
    private readonly listScreens: ListScreensUseCase,
    private readonly createScreen: CreateScreenUseCase,
    private readonly updateScreen: UpdateScreenUseCase,
    private readonly getSchedule: GetScreenScheduleUseCase,
    private readonly setSchedule: SetScreenScheduleUseCase,
    private readonly pairScreen: PairScreenUseCase,
  ) {}

  @Get()
  @RequirePermissions('screens:read')
  list(@CurrentTenant() tenant: Tenant, @Query() query: ListScreensQueryDto) {
    return this.listScreens.execute(tenant, query.store_id);
  }

  @Post()
  @RequirePermissions('screens:create')
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateScreenDto) {
    return this.createScreen.execute(tenant, dto);
  }

  @Patch(':screenId')
  @RequirePermissions('screens:update')
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('screenId', ParseUUIDPipe) screenId: string,
    @Body() dto: UpdateScreenDto,
  ) {
    return this.updateScreen.execute(tenant, screenId, dto);
  }

  @Get(':screenId/schedule')
  @RequirePermissions('screens:read')
  schedule(@CurrentTenant() tenant: Tenant, @Param('screenId', ParseUUIDPipe) screenId: string) {
    return this.getSchedule.execute(tenant, screenId);
  }

  @Put(':screenId/schedule')
  @RequirePermissions('screens:update')
  replaceSchedule(
    @CurrentTenant() tenant: Tenant,
    @Param('screenId', ParseUUIDPipe) screenId: string,
    @Body() dto: SetScheduleDto,
  ) {
    return this.setSchedule.execute(tenant, screenId, dto);
  }

  @Post(':screenId/pair')
  @HttpCode(204)
  @RequirePermissions('screens:update')
  pair(
    @CurrentTenant() tenant: Tenant,
    @Param('screenId', ParseUUIDPipe) screenId: string,
    @Body() dto: PairScreenDto,
  ) {
    return this.pairScreen.execute(tenant, screenId, dto.code);
  }
}
