import { Inject, Injectable } from "@nestjs/common";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { withSelfOrderUrl } from "../domain/store-url";
import { emptyUpdate, storeNotFound } from "../domain/store.errors";
import { STORE_REPOSITORY, type IStoreRepository, type StorePatch } from "../domain/store.repository";

@Injectable()
export class UpdateStoreUseCase {

    constructor(
        @Inject(STORE_REPOSITORY)
        private readonly storeRepository: IStoreRepository,
    ){}

    async execute(tenant: Tenant, storeId: string, input: StorePatch){
        const patch: StorePatch = {};
        if (input.name !== undefined) patch.name = input.name.trim();
        if (input.address !== undefined) patch.address = input.address;
        if (input.phone !== undefined) patch.phone = input.phone;
        if (input.whatsapp_number !== undefined) patch.whatsapp_number = input.whatsapp_number;
        if (Object.keys(patch).length === 0) throw emptyUpdate();

        const store = await this.storeRepository.update(tenant.tenant_id, storeId, patch);
        if (!store) throw storeNotFound();

        return withSelfOrderUrl(tenant.slug, store);
    }
}
