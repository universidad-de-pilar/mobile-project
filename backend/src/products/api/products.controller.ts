import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query,
  UploadedFile, UseFilters, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUserId } from 'src/auth/api/current-user.decorator';
import { RequirePermissions } from 'src/roles/api/require-permissions.decorator';
import { CurrentTenant } from 'src/tenants/api/current-tenant.decorator';
import { Tenant } from 'src/tenants/domain/tenant.entity';
import { CreateProductUseCase } from '../application/create-product.use-case';
import { DeleteProductUseCase } from '../application/delete-product.use-case';
import { GetProductUseCase } from '../application/get-product.use-case';
import { ListProductsUseCase } from '../application/list-products.use-case';
import { RemoveProductImageUseCase } from '../application/remove-product-image.use-case';
import { SetProductImageUseCase } from '../application/set-product-image.use-case';
import { UpdateProductUseCase } from '../application/update-product.use-case';
import { CreateProductDto, ListProductsQueryDto, UpdateProductDto } from './dto/product.dto';
import { IMAGE_UPLOAD_OPTIONS } from './image-upload';
import { MediaTooLargeFilter } from './media-too-large.filter';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly listProducts: ListProductsUseCase,
    private readonly getProduct: GetProductUseCase,
    private readonly createProduct: CreateProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
    private readonly setProductImage: SetProductImageUseCase,
    private readonly removeProductImage: RemoveProductImageUseCase,
  ) {}

  @Get()
  @RequirePermissions('products:read')
  list(@CurrentTenant() tenant: Tenant, @CurrentUserId() userId: string, @Query() query: ListProductsQueryDto) {
    return this.listProducts.execute(tenant.tenant_id, query, userId);
  }

  @Get(':productId')
  @RequirePermissions('products:read')
  get(@CurrentTenant() tenant: Tenant, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.getProduct.execute(tenant.tenant_id, productId);
  }

  @Post()
  @RequirePermissions('products:create')
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateProductDto) {
    return this.createProduct.execute(tenant.tenant_id, dto);
  }

  @Patch(':productId')
  @RequirePermissions('products:update')
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.updateProduct.execute(tenant.tenant_id, productId, dto);
  }

  @Delete(':productId')
  @HttpCode(204)
  @RequirePermissions('products:delete')
  async remove(@CurrentTenant() tenant: Tenant, @Param('productId', ParseUUIDPipe) productId: string) {
    await this.deleteProduct.execute(tenant.tenant_id, productId);
  }

  @Put(':productId/image')
  @RequirePermissions('products:update')
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
  @UseFilters(MediaTooLargeFilter)
  setImage(
    @CurrentTenant() tenant: Tenant,
    @Param('productId', ParseUUIDPipe) productId: string,
    @UploadedFile() file?: { buffer: Buffer },
  ) {
    if (!file) {
      throw new BadRequestException({ statusCode: 400, message: 'file is required', error: 'Bad Request' });
    }
    return this.setProductImage.execute(tenant.tenant_id, productId, file.buffer);
  }

  @Delete(':productId/image')
  @RequirePermissions('products:update')
  removeImage(@CurrentTenant() tenant: Tenant, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.removeProductImage.execute(tenant.tenant_id, productId);
  }
}
