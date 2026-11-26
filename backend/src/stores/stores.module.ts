import { Module } from '@nestjs/common';
import { TenantsModule } from 'src/tenants/tenants.module';
import { StoresController } from './api/stores.controller';
import { GetStoreUseCase } from './application/get-store.use-case';
import { ListStoresUseCase } from './application/list-stores.use-case';
import { UpdateStoreUseCase } from './application/update-store.use-case';
import { STORE_REPOSITORY } from './domain/store.repository';
import { PostgreStoreRepository } from './infraestructure/postgre-store.repository';

@Module({
  imports: [TenantsModule],
  controllers: [StoresController],
  providers: [
    { provide: STORE_REPOSITORY, useClass: PostgreStoreRepository },
    ListStoresUseCase,
    GetStoreUseCase,
    UpdateStoreUseCase,
  ],
  exports: [STORE_REPOSITORY],
})
export class StoresModule {}
