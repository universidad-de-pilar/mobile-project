import { Inject, Injectable } from "@nestjs/common";
import { PRODUCT_REPOSITORY, type IProductRepository } from "../domain/product.repository";
import { toProductResponse } from "../domain/product.entity";
import { productNotFound, unsupportedMediaType } from "../domain/product.errors";
import { detectImageType } from "../domain/product-image";
import { IMAGE_STORAGE, type IImageStorage } from "./ports/image-storage";

@Injectable()
export class SetProductImageUseCase {

    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: IProductRepository,
        @Inject(IMAGE_STORAGE)
        private readonly imageStorage: IImageStorage,
    ){}

    async execute(tenantId: string, productId: string, file: Buffer){

        const type = detectImageType(file);
        if (!type){
            throw unsupportedMediaType();
        }

        const current = await this.productRepository.findOne(tenantId, productId);
        if (!current){
            throw productNotFound();
        }

        // New file first, then the row, then the old file: a failure never leaves the row pointing at nothing.
        const imagePath = await this.imageStorage.save(tenantId, file, type);

        let product;
        try {
            product = await this.productRepository.update(tenantId, productId, { image_path: imagePath });
        } catch (error) {
            await this.imageStorage.remove(imagePath);
            throw error;
        }
        if (!product){
            await this.imageStorage.remove(imagePath);
            throw productNotFound();
        }

        if (current.image_path){
            await this.imageStorage.remove(current.image_path);
        }

        return toProductResponse(product);
    }
}
