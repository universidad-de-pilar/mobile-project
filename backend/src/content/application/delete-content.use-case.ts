import { Inject, Injectable } from "@nestjs/common";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { mediaInUse, mediaNotFound } from "../domain/content.errors";
import { CONTENT_REPOSITORY, type IContentRepository } from "../domain/content.repository";
import { CONTENT_STORAGE, type IContentStorage } from "./ports/content-ports";

const FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class DeleteContentUseCase {

    constructor(
        @Inject(CONTENT_REPOSITORY)
        private readonly contentRepository: IContentRepository,
        @Inject(CONTENT_STORAGE)
        private readonly storage: IContentStorage,
    ){}

    async execute(tenant: Tenant, mediaId: string){
        // The FK (ON DELETE RESTRICT) is the single source of truth for "in use"; no check-then-delete race.
        const row = await this.contentRepository.delete(tenant.tenant_id, mediaId).catch((error) => {
            throw error?.code === FOREIGN_KEY_VIOLATION ? mediaInUse() : error;
        });
        if (!row) throw mediaNotFound();

        await this.storage.remove(row.file_path);
    }
}
