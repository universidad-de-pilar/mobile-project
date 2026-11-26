export interface MediaRow {
    media_id: string;
    type: 'image' | 'video';
    file_path: string;
    original_name: string;
    mime_type: string;
    size_bytes: string | number; // BIGINT arrives as string from pg
    duration_seconds: number | null; // videos only
    created_at: Date;
    updated_at: Date;
}

export interface NewMedia {
    type: 'image' | 'video';
    file_path: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    duration_seconds: number | null;
}

export interface IContentRepository {
    list(tenantId: string): Promise<MediaRow[]>;
    // Only the ids that belong to the tenant, so a missing id means "not found".
    findMany(tenantId: string, mediaIds: string[]): Promise<Pick<MediaRow, 'media_id' | 'type'>[]>;
    create(tenantId: string, data: NewMedia): Promise<MediaRow>;
    // Rejects with pg error 23503 while a playlist item references the media.
    delete(tenantId: string, mediaId: string): Promise<MediaRow | null>;
}

export const CONTENT_REPOSITORY = Symbol('CONTENT_REPOSITORY');

export const toMediaResponse = (row: MediaRow) => ({
    media_id: row.media_id,
    type: row.type,
    url: `/media/${row.file_path}`,
    original_name: row.original_name,
    mime_type: row.mime_type,
    size_bytes: Number(row.size_bytes),
    duration_seconds: row.duration_seconds,
    created_at: row.created_at,
    updated_at: row.updated_at,
});
