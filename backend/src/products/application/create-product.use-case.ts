import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { TENANT_REPOSITORY, type ITenantRepository } from "src/tenants/domain/tenant.repository";
import { PRODUCT_REPOSITORY, type IProductRepository } from "../domain/product.repository";
import { toProductResponse } from "../domain/product.entity";
import { assertPositivePrice, categoryNotFound, skuAlreadyExists } from "../domain/product.errors";

const MAX_PRODUCTS_PER_STORE = 200;

@Injectable()
export class CreateProductUseCase {

    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: IProductRepository,
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenantId: string, data: {
        store_id: string; category_id: string; name: string; description?: string;
        price: string; is_available?: boolean; sort_order?: number; sku: string; gluten_free?: boolean;
    }){

        if (!(await this.tenantRepository.isStoreOfTenant(tenantId, data.store_id))){
            throw new NotFoundException({ statusCode: 404, message: 'Store not found', error: 'Not Found', code: 'STORE_NOT_FOUND' });
        }

        assertPositivePrice(data.price);

        if (!(await this.productRepository.isCategoryOfStore(tenantId, data.category_id, data.store_id))){
            throw categoryNotFound();
        }

        const sku = data.sku.trim();
        if (await this.productRepository.skuTaken(tenantId, sku)){
            throw skuAlreadyExists();
        }

        // ponytail: count-then-insert is not atomic; a concurrent burst could overshoot the limit slightly.
        if ((await this.productRepository.countByStore(tenantId, data.store_id)) >= MAX_PRODUCTS_PER_STORE){
            throw new UnprocessableEntityException({ statusCode: 422, message: 'Store product limit reached', error: 'Unprocessable Entity', code: 'PRODUCT_LIMIT_REACHED' });
        }

        const product = await this.productRepository.create(tenantId, {
            store_id: data.store_id,
            category_id: data.category_id,
            name: data.name.trim(),
            description: data.description ?? null,
            price: data.price,
            is_available: data.is_available ?? true,
            sort_order: data.sort_order ?? 0,
            sku,
            gluten_free: data.gluten_free ?? false,
        });

        return toProductResponse(product);
    }
}
