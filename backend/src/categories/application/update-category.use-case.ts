import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CATEGORY_REPOSITORY, type ICategoryRepository } from "../domain/category.repository";
import { CategoryNameTakenError } from "../domain/category.errors";

@Injectable()
export class UpdateCategoryUseCase {

    constructor(
        @Inject(CATEGORY_REPOSITORY)
        private readonly categoryRepository: ICategoryRepository,
    ){}

    async execute(tenantId: string, categoryId: string, data: { name?: string; sort_order?: number }){

        let category;
        try {
            category = await this.categoryRepository.update(tenantId, categoryId, {
                name: data.name?.trim(),
                sort_order: data.sort_order,
            });
        } catch (error) {
            if (error instanceof CategoryNameTakenError){
                throw new ConflictException({ statusCode: 409, message: 'Category name already exists in this store', error: 'Conflict', code: 'CATEGORY_NAME_TAKEN' });
            }
            throw error;
        }

        if (!category){
            throw new NotFoundException({ statusCode: 404, message: 'Category not found', error: 'Not Found', code: 'CATEGORY_NOT_FOUND' });
        }

        return category;
    }
}
