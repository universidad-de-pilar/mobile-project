import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { uploadsDir } from "src/media/uploads-dir";
import { IContentStorage } from "../application/ports/content-ports";

@Injectable()
export class LocalContentStorage implements IContentStorage {
    private readonly logger = new Logger(LocalContentStorage.name);

    async save(tenantId: string, buffer: Buffer, ext: string): Promise<string> {
        const filePath = `${tenantId}/content/${randomUUID()}.${ext}`;
        const file = join(uploadsDir(), filePath);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, buffer);
        return filePath;
    }

    // Callers run this after the DB change; an orphan file is preferable to failing the request.
    async remove(filePath: string): Promise<void> {
        try {
            await rm(join(uploadsDir(), filePath), { force: true });
        } catch (error) {
            this.logger.warn(`Could not remove content ${filePath}: ${(error as Error).message}`);
        }
    }
}
