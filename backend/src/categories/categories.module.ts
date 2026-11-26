import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsModule } from 'src/tenants/tenants.module';
import { CategoriesController } from './api/categories.controller';
import { CreateCategoryUseCase } from './application/create-category.use-case';
import { DeleteCategoryUseCase } from './application/delete-category.use-case';
import { ListCategoriesUseCase } from './application/list-categories.use-case';
import { UpdateCategoryUseCase } from './application/update-category.use-case';
import { CATEGORY_REPOSITORY } from './domain/category.repository';
import { CategoryOrmEntity } from './infraestructure/category.orm-entity';
import { PostgreCategoryRepository } from './infraestructure/postgre-category.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryOrmEntity]), TenantsModule],
  controllers: [CategoriesController],
  providers: [
    { provide: CATEGORY_REPOSITORY, useClass: PostgreCategoryRepository },
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
  ],
})
export class CategoriesModule {}
