import { Inject, Injectable } from "@nestjs/common";
import { PRODUCT_REPOSITORY, type IProductRepository } from "../domain/product.repository";
import { toProductResponse } from "../domain/product.entity";
import { productNotFound } from "../domain/product.errors";
import { IMAGE_STORAGE, type IImageStorage } from "./ports/image-storage";

@Injectable()
export class RemoveProductImageUseCase {

    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: IProductRepository,
        @Inject(IMAGE_STORAGE)
        private readonly imageStorage: IImageStorage,
    ){}

    async execute(tenantId: string, productId: string){

        const current = await this.productRepository.findOne(tenantId, productId);
        if (!current){
            throw productNotFound();
        }

        const product = await this.productRepository.update(tenantId, productId, { image_path: null });
        if (!product){
            throw productNotFound();
        }

        if (current.image_path){
            await this.imageStorage.remove(current.image_path);
        }

        return toProductResponse(product);
    }
}
