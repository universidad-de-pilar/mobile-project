import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { cloudinaryEnabled } from 'src/media/cloudinary-media';
import { TenantsModule } from 'src/tenants/tenants.module';
import { ProductsController } from './api/products.controller';
import { PublicCatalogController } from './api/public-catalog.controller';
import { CreateProductUseCase } from './application/create-product.use-case';
import { DeleteProductUseCase } from './application/delete-product.use-case';
import { GetPublicCatalogUseCase } from './application/get-public-catalog.use-case';
import { GetProductUseCase } from './application/get-product.use-case';
import { ListProductsUseCase } from './application/list-products.use-case';
import { UpdateProductUseCase } from './application/update-product.use-case';
import { IMAGE_STORAGE } from './application/ports/image-storage';
import { RemoveProductImageUseCase } from './application/remove-product-image.use-case';
import { SetProductImageUseCase } from './application/set-product-image.use-case';
import { PRODUCT_REPOSITORY } from './domain/product.repository';
import { CloudinaryImageStorage } from './infraestructure/cloudinary-image-storage';
import { LocalImageStorage } from './infraestructure/local-image-storage';
import { PostgreProductRepository } from './infraestructure/postgre-product.repository';
import { ProductOrmEntity } from './infraestructure/product.orm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductOrmEntity]), TenantsModule],
  controllers: [ProductsController, PublicCatalogController],
  providers: [
    { provide: PRODUCT_REPOSITORY, useClass: PostgreProductRepository },
    {
      provide: IMAGE_STORAGE,
      useFactory: () => (cloudinaryEnabled() ? new CloudinaryImageStorage() : new LocalImageStorage()),
    },
    ListProductsUseCase,
    GetProductUseCase,
    GetPublicCatalogUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    SetProductImageUseCase,
    RemoveProductImageUseCase,
  ],
})
export class ProductsModule {}
