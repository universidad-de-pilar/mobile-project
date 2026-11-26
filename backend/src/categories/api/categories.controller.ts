import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUserId } from 'src/auth/api/current-user.decorator';
import { RequirePermissions } from 'src/roles/api/require-permissions.decorator';
import { CurrentTenant } from 'src/tenants/api/current-tenant.decorator';
import { Tenant } from 'src/tenants/domain/tenant.entity';
import { CreateCategoryUseCase } from '../application/create-category.use-case';
import { DeleteCategoryUseCase } from '../application/delete-category.use-case';
import { ListCategoriesUseCase } from '../application/list-categories.use-case';
import { UpdateCategoryUseCase } from '../application/update-category.use-case';
import { CreateCategoryDto, ListCategoriesQueryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly listCategories: ListCategoriesUseCase,
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Get()
  @RequirePermissions('categories:read')
  list(@CurrentTenant() tenant: Tenant, @CurrentUserId() userId: string, @Query() query: ListCategoriesQueryDto) {
    return this.listCategories.execute(tenant.tenant_id, query.store_id, userId);
  }

  @Post()
  @RequirePermissions('categories:create')
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateCategoryDto) {
    return this.createCategory.execute(tenant.tenant_id, dto);
  }

  @Patch(':categoryId')
  @RequirePermissions('categories:update')
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.updateCategory.execute(tenant.tenant_id, categoryId, dto);
  }

  @Delete(':categoryId')
  @HttpCode(204)
  @RequirePermissions('categories:delete')
  remove(@CurrentTenant() tenant: Tenant, @Param('categoryId', ParseUUIDPipe) categoryId: string) {
    return this.deleteCategory.execute(tenant.tenant_id, categoryId);
  }
}
