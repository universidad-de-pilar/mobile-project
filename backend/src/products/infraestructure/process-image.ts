import sharp from "sharp";
import { ImageType } from "../domain/product-image";
import { mediaUnreadable } from "../domain/product.errors";

const MAX_WIDTH = 1280;

export const processImage = async (buffer: Buffer, type: ImageType): Promise<Buffer> => {
    try {
        // A small, highly compressed file can decode to a huge bitmap; cap it (~40 MP).
        return await sharp(buffer, { limitInputPixels: 40_000_000 })
            .rotate()
            .resize({ width: MAX_WIDTH, withoutEnlargement: true })
            .toFormat(type === 'jpg' ? 'jpeg' : type)
            .toBuffer();
    } catch {
        throw mediaUnreadable();
    }
};
