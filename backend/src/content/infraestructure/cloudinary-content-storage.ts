import { Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { removeMedia, uploadMedia } from "src/media/cloudinary-media";
import { IContentStorage } from "../application/ports/content-ports";

export class CloudinaryContentStorage implements IContentStorage {
    private readonly logger = new Logger(CloudinaryContentStorage.name);

    async save(tenantId: string, buffer: Buffer, ext: string): Promise<string> {
        const filePath = `${tenantId}/content/${randomUUID()}.${ext}`;
        await uploadMedia(filePath, buffer);
        return filePath;
    }

    // Callers run this after the DB change; an orphan file is preferable to failing the request.
    async remove(filePath: string): Promise<void> {
        try {
            await removeMedia(filePath);
        } catch (error) {
            this.logger.warn(`Could not remove content ${filePath}: ${(error as Error).message}`);
        }
    }
}
