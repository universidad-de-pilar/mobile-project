import { Inject, Injectable } from "@nestjs/common";
import { TENANT_REPOSITORY, type ITenantRepository } from "src/tenants/domain/tenant.repository";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { withPlayerUrl } from "../domain/screen-player";
import { storeNotFound } from "../domain/screen.errors";
import { SCREEN_REPOSITORY, type IScreenRepository } from "../domain/screen.repository";

@Injectable()
export class ListScreensUseCase {

    constructor(
        @Inject(SCREEN_REPOSITORY)
        private readonly screenRepository: IScreenRepository,
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenant: Tenant, storeId: string){
        if (!(await this.tenantRepository.isStoreOfTenant(tenant.tenant_id, storeId))) throw storeNotFound();

        const screens = await this.screenRepository.listByStore(tenant.tenant_id, storeId);
        return screens.map((screen) => withPlayerUrl(tenant.slug, screen));
    }
}
