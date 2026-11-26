import { Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { removeMedia, uploadMedia } from "src/media/cloudinary-media";
import { IImageStorage } from "../application/ports/image-storage";
import { ImageType } from "../domain/product-image";
import { processImage } from "./process-image";

export class CloudinaryImageStorage implements IImageStorage {
    private readonly logger = new Logger(CloudinaryImageStorage.name);

    async save(tenantId: string, buffer: Buffer, type: ImageType): Promise<string> {
        const output = await processImage(buffer, type);
        const imagePath = `${tenantId}/products/${randomUUID()}.${type}`;
        await uploadMedia(imagePath, output);
        return imagePath;
    }

    // Callers run this after the DB change; an orphan file is preferable to failing the request.
    async remove(imagePath: string): Promise<void> {
        try {
            await removeMedia(imagePath);
        } catch (error) {
            this.logger.warn(`Could not remove image ${imagePath}: ${(error as Error).message}`);
        }
    }
}
