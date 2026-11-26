import { ImageType } from "../../domain/product-image";

export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE')

export interface IImageStorage {
    // Processes and stores the image; returns the path relative to the uploads dir. Throws MEDIA_UNREADABLE if it cannot be decoded.
    save(tenantId: string, buffer: Buffer, type: ImageType): Promise<string>;
    // Missing files are ignored.
    remove(imagePath: string): Promise<void>;
}
