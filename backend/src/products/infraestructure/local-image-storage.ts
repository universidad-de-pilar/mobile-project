import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { uploadsDir } from "src/media/uploads-dir";
import { IImageStorage } from "../application/ports/image-storage";
import { ImageType } from "../domain/product-image";
import { processImage } from "./process-image";

@Injectable()
export class LocalImageStorage implements IImageStorage {
    private readonly logger = new Logger(LocalImageStorage.name);

    async save(tenantId: string, buffer: Buffer, type: ImageType): Promise<string> {
        const output = await processImage(buffer, type);

        const imagePath = `${tenantId}/products/${randomUUID()}.${type}`;
        const file = join(uploadsDir(), imagePath);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, output);
        return imagePath;
    }

    // Callers run this after the DB change; an orphan file is preferable to failing the request.
    async remove(imagePath: string): Promise<void> {
        try {
            await rm(join(uploadsDir(), imagePath), { force: true });
        } catch (error) {
            this.logger.warn(`Could not remove image ${imagePath}: ${(error as Error).message}`);
        }
    }
}
