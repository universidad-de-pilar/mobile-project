import { Inject, Injectable } from "@nestjs/common";
import { emptyUpdate } from "src/stores/domain/store.errors";
import { tenantNotFound } from "../domain/tenant.errors";
import { TENANT_REPOSITORY, type ITenantRepository, type TenantPatch } from "../domain/tenant.repository";

@Injectable()
export class UpdateTenantUseCase {

    constructor(
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenantId: string, input: TenantPatch){
        const patch: TenantPatch = {};
        if (input.name !== undefined) patch.name = input.name.trim();
        if (input.is_active !== undefined) patch.is_active = input.is_active;
        if (Object.keys(patch).length === 0) throw emptyUpdate();

        const tenant = await this.tenantRepository.update(tenantId, patch);
        if (!tenant) throw tenantNotFound();
        return tenant;
    }
}
