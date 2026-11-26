import { Inject, Injectable } from "@nestjs/common";
import { canAccessStore } from "src/tenants/domain/store-access";
import { TENANT_REPOSITORY, type ITenantRepository } from "src/tenants/domain/tenant.repository";
import { PRODUCT_REPOSITORY, type IProductRepository } from "../domain/product.repository";
import { toProductResponse } from "../domain/product.entity";
import { productNotFound } from "../domain/product.errors";

@Injectable()
export class GetProductUseCase {

    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: IProductRepository,
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    async execute(tenantId: string, productId: string, userId: string){

        const product = await this.productRepository.findOne(tenantId, productId);
        // Un producto de un local no asignado se oculta como inexistente.
        if (!product || !(await canAccessStore(this.tenantRepository, tenantId, userId, product.store_id))){
            throw productNotFound();
        }

        return toProductResponse(product);
    }
}
