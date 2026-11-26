import { Inject, Injectable } from "@nestjs/common";
import { tenantNotFound } from "../domain/tenant.errors";
import { TENANT_REPOSITORY, type ITenantRepository } from "../domain/tenant.repository";

@Injectable()
export class SetTenantActiveUseCase {

    constructor(
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenantId: string, isActive: boolean){
        const tenant = await this.tenantRepository.update(tenantId, { is_active: isActive });
        if (!tenant) throw tenantNotFound();
        return tenant;
    }
}
