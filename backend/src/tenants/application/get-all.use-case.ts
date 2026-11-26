import { Inject, Injectable } from "@nestjs/common";
import { TENANT_REPOSITORY, type ITenantRepository } from "../domain/tenant.repository";

@Injectable()
export class GetAllTenantsUseCase {

    constructor(
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    execute(){
        return this.tenantRepository.list();
    }
}
