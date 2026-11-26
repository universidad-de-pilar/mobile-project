import { Inject, Injectable } from "@nestjs/common";
import { PRODUCT_REPOSITORY, type IProductRepository } from "../domain/product.repository";
import { productNotFound } from "../domain/product.errors";
import { IMAGE_STORAGE, type IImageStorage } from "./ports/image-storage";

@Injectable()
export class DeleteProductUseCase {

    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: IProductRepository,
        @Inject(IMAGE_STORAGE)
        private readonly imageStorage: IImageStorage,
    ){}

    async execute(tenantId: string, productId: string){

        const deleted = await this.productRepository.delete(tenantId, productId);
        if (!deleted){
            throw productNotFound();
        }

        if (deleted.image_path){
            await this.imageStorage.remove(deleted.image_path);
        }

        return { image_path: deleted.image_path };
    }
}
