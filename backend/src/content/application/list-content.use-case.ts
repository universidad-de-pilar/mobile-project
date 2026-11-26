import { Inject, Injectable } from "@nestjs/common";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { CONTENT_REPOSITORY, toMediaResponse, type IContentRepository } from "../domain/content.repository";

@Injectable()
export class ListContentUseCase {

    constructor(
        @Inject(CONTENT_REPOSITORY)
        private readonly contentRepository: IContentRepository,
    ){}

    async execute(tenant: Tenant){
        const rows = await this.contentRepository.list(tenant.tenant_id);
        return rows.map(toMediaResponse);
    }
}
