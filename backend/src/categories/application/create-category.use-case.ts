import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { TENANT_REPOSITORY, type ITenantRepository } from "src/tenants/domain/tenant.repository";
import { CATEGORY_REPOSITORY, type ICategoryRepository } from "../domain/category.repository";
import { CategoryNameTakenError } from "../domain/category.errors";

@Injectable()
export class CreateCategoryUseCase {

    constructor(
        @Inject(CATEGORY_REPOSITORY)
        private readonly categoryRepository: ICategoryRepository,
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenantId: string, data: { store_id: string; name: string; sort_order?: number }){

        if (!(await this.tenantRepository.isStoreOfTenant(tenantId, data.store_id))){
            throw new NotFoundException({ statusCode: 404, message: 'Store not found', error: 'Not Found', code: 'STORE_NOT_FOUND' });
        }

        try {
            return await this.categoryRepository.create(tenantId, {
                store_id: data.store_id,
                name: data.name.trim(),
                sort_order: data.sort_order ?? 0,
            });
        } catch (error) {
            if (error instanceof CategoryNameTakenError){
                throw new ConflictException({ statusCode: 409, message: 'Category name already exists in this store', error: 'Conflict', code: 'CATEGORY_NAME_TAKEN' });
            }
            throw error;
        }
    }
}
