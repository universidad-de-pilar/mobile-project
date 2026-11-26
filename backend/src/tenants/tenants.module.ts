import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { TenantsController } from './api/tenants.controller';
import { CreateTenantUseCase } from './application/create.use-case';
import { GetAllTenantsUseCase } from './application/get-all.use-case';
import { SetTenantActiveUseCase } from './application/set-active.use-case';
import { UpdateTenantUseCase } from './application/update.use-case';
import { TENANT_REPOSITORY } from './domain/tenant.repository';
import { PostgreTenantRepository } from './infraestructure/postgre-tenant.repository';
import { TenantOrmEntity } from './infraestructure/tenant.orm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([TenantOrmEntity]), UsersModule],
  controllers: [TenantsController],
  providers: [
    {
        provide: TENANT_REPOSITORY,
        useClass: PostgreTenantRepository
    },
    GetAllTenantsUseCase,
    CreateTenantUseCase,
    UpdateTenantUseCase,
    SetTenantActiveUseCase,
  ],
  exports:[TENANT_REPOSITORY]
})
export class TenantsModule {}
