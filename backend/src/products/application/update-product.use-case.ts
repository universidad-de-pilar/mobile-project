import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PRODUCT_REPOSITORY, type IProductRepository, type UpdateProductData } from "../domain/product.repository";
import { toProductResponse } from "../domain/product.entity";
import { assertPositivePrice, categoryNotFound, productNotFound, skuAlreadyExists, skuRequired } from "../domain/product.errors";

@Injectable()
export class UpdateProductUseCase {

    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: IProductRepository,
    ){}

    async execute(tenantId: string, productId: string, data: UpdateProductData){

        // Undefined keys must not reach the repository: TypeORM would bind them as NULL.
        const changes = Object.fromEntries(
            Object.entries({ ...data, name: data.name?.trim(), sku: data.sku?.trim() }).filter(([, value]) => value !== undefined),
        ) as UpdateProductData;

        if (Object.keys(changes).length === 0){
            throw new BadRequestException({ statusCode: 400, message: 'At least one field is required', error: 'Bad Request' });
        }

        if (changes.price !== undefined){
            assertPositivePrice(changes.price);
        }

        const current = await this.productRepository.findOne(tenantId, productId);
        if (!current){
            throw productNotFound();
        }

        // Los productos previos a esta regla no tienen SKU: se exige al editarlos.
        if (changes.sku === undefined && current.sku === null){
            throw skuRequired();
        }

        if (changes.sku !== undefined && await this.productRepository.skuTaken(tenantId, changes.sku, productId)){
            throw skuAlreadyExists();
        }

        if (changes.category_id !== undefined){
            if (!(await this.productRepository.isCategoryOfStore(tenantId, changes.category_id, current.store_id))){
                throw categoryNotFound();
            }
        }

        const product = await this.productRepository.update(tenantId, productId, changes);
        if (!product){
            throw productNotFound();
        }

        return toProductResponse(product);
    }
}
