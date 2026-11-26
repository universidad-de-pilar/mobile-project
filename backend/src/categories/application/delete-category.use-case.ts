import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CATEGORY_REPOSITORY, type ICategoryRepository } from "../domain/category.repository";
import { CategoryHasProductsError } from "../domain/category.errors";

@Injectable()
export class DeleteCategoryUseCase {

    constructor(
        @Inject(CATEGORY_REPOSITORY)
        private readonly categoryRepository: ICategoryRepository,
    ){}

    async execute(tenantId: string, categoryId: string){

        let deleted;
        try {
            deleted = await this.categoryRepository.delete(tenantId, categoryId);
        } catch (error) {
            if (error instanceof CategoryHasProductsError){
                throw new ConflictException({ statusCode: 409, message: 'Category has products', error: 'Conflict', code: 'CATEGORY_HAS_PRODUCTS' });
            }
            throw error;
        }

        if (!deleted){
            throw new NotFoundException({ statusCode: 404, message: 'Category not found', error: 'Not Found', code: 'CATEGORY_NOT_FOUND' });
        }
    }
}
