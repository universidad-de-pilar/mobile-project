import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { IContentRepository, MediaRow, NewMedia } from "../domain/content.repository";

const COLUMNS = `media_id, type, file_path, original_name, mime_type, size_bytes, duration_seconds, created_at, updated_at`;

@Injectable()
export class PostgreContentRepository implements IContentRepository {

    constructor(@InjectDataSource() private readonly dataSource: DataSource){}

    list(tenantId: string): Promise<MediaRow[]> {
        return this.dataSource.query(
            `SELECT ${COLUMNS} FROM media_items WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenantId],
        );
    }

    findMany(tenantId: string, mediaIds: string[]): Promise<Pick<MediaRow, 'media_id' | 'type'>[]> {
        return this.dataSource.query(
            `SELECT media_id, type FROM media_items WHERE tenant_id = $1 AND media_id = ANY($2::uuid[])`,
            [tenantId, mediaIds],
        );
    }

    async create(tenantId: string, data: NewMedia): Promise<MediaRow> {
        const rows = await this.dataSource.query(
            `INSERT INTO media_items (tenant_id, type, file_path, original_name, mime_type, size_bytes, duration_seconds)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING ${COLUMNS}`,
            [tenantId, data.type, data.file_path, data.original_name, data.mime_type, data.size_bytes, data.duration_seconds],
        );
        return rows[0];
    }

    async delete(tenantId: string, mediaId: string): Promise<MediaRow | null> {
        // pg returns [rows, affectedCount] for DELETE
        const [rows] = await this.dataSource.query(
            `DELETE FROM media_items WHERE tenant_id = $1 AND media_id = $2 RETURNING ${COLUMNS}`,
            [tenantId, mediaId],
        );
        return rows[0] ?? null;
    }
}
