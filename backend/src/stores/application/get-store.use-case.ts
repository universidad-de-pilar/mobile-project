import { Inject, Injectable } from "@nestjs/common";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { canAccessStore } from "src/tenants/domain/store-access";
import { TENANT_REPOSITORY, type ITenantRepository } from "src/tenants/domain/tenant.repository";
import { withSelfOrderUrl } from "../domain/store-url";
import { storeNotFound } from "../domain/store.errors";
import { STORE_REPOSITORY, type IStoreRepository } from "../domain/store.repository";

@Injectable()
export class GetStoreUseCase {

    constructor(
        @Inject(STORE_REPOSITORY)
        private readonly storeRepository: IStoreRepository,
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenant: Tenant, storeId: string, userId: string){
        const store = await this.storeRepository.findById(tenant.tenant_id, storeId);
        if (!store || !(await canAccessStore(this.tenantRepository, tenant.tenant_id, userId, storeId))) throw storeNotFound();

        return withSelfOrderUrl(tenant.slug, store);
    }
}
