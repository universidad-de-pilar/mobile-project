import { Inject, Injectable } from "@nestjs/common";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { TENANT_REPOSITORY, type ITenantRepository } from "src/tenants/domain/tenant.repository";
import { withSelfOrderUrl } from "../domain/store-url";
import { STORE_REPOSITORY, type IStoreRepository } from "../domain/store.repository";

@Injectable()
export class ListStoresUseCase {

    constructor(
        @Inject(STORE_REPOSITORY)
        private readonly storeRepository: IStoreRepository,
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenant: Tenant, userId: string){
        const [stores, allowed] = await Promise.all([
            this.storeRepository.list(tenant.tenant_id),
            this.tenantRepository.allowedStoreIds(tenant.tenant_id, userId),
        ]);
        return stores.filter((s) => allowed === null || allowed.includes(s.store_id)).map((store) => withSelfOrderUrl(tenant.slug, store));
    }
}
