import { Inject, Injectable } from "@nestjs/common";
import { TENANT_REPOSITORY, type ITenantRepository } from "src/tenants/domain/tenant.repository";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { generateScreenToken, withPlayerUrl } from "../domain/screen-player";
import { storeNotFound } from "../domain/screen.errors";
import { SCREEN_REPOSITORY, type IScreenRepository } from "../domain/screen.repository";

@Injectable()
export class CreateScreenUseCase {

    constructor(
        @Inject(SCREEN_REPOSITORY)
        private readonly screenRepository: IScreenRepository,
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenant: Tenant, input: { store_id: string; name: string }){
        if (!(await this.tenantRepository.isStoreOfTenant(tenant.tenant_id, input.store_id))) throw storeNotFound();

        const screen = await this.screenRepository.create(tenant.tenant_id, {
            store_id: input.store_id, name: input.name.trim(), token: generateScreenToken(),
        });
        return withPlayerUrl(tenant.slug, screen);
    }
}
