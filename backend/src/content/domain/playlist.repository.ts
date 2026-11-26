export interface PlaylistRow {
    playlist_id: string;
    name: string;
    item_count: string | number; // COUNT arrives as string from pg
    created_at: Date;
    updated_at: Date;
}

// duration_seconds is already the effective one: the item's for images, the media's for videos.
export interface PlaylistItemRow {
    playlist_item_id: string;
    playlist_id: string;
    media_id: string;
    type: 'image' | 'video';
    file_path: string;
    original_name: string;
    duration_seconds: number;
}

export interface NewPlaylistItem { media_id: string; duration_seconds: number | null }

export interface PlaylistScreenRow {
    screen_id: string;
    screen_name: string;
    store_id: string;
    store_name: string;
    days: number | null;
    start_time: string | null;
    end_time: string | null;
}

export interface IPlaylistRepository {
    list(tenantId: string): Promise<PlaylistRow[]>;
    findOne(tenantId: string, playlistId: string): Promise<PlaylistRow | null>;
    create(tenantId: string, name: string): Promise<PlaylistRow>;
    rename(tenantId: string, playlistId: string, name: string): Promise<PlaylistRow | null>;
    delete(tenantId: string, playlistId: string): Promise<boolean>;
    // Items of several playlists in position order; ids of other tenants yield nothing.
    listItems(tenantId: string, playlistIds: string[]): Promise<PlaylistItemRow[]>;
    // Replaces every item in one transaction, numbering positions 1..n.
    replaceItems(tenantId: string, playlistId: string, items: NewPlaylistItem[]): Promise<void>;
    listScreens(tenantId: string, playlistId: string): Promise<PlaylistScreenRow[]>;
    // The subset of ids that belong to the tenant.
    findOwnedIds(tenantId: string, playlistIds: string[]): Promise<string[]>;
}

export const PLAYLIST_REPOSITORY = Symbol('PLAYLIST_REPOSITORY');

export const toPlaylistResponse = (row: PlaylistRow) => ({
    playlist_id: row.playlist_id,
    name: row.name,
    item_count: Number(row.item_count),
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export const toPlaylistItemResponse = (row: PlaylistItemRow) => ({
    playlist_item_id: row.playlist_item_id,
    media_id: row.media_id,
    type: row.type,
    url: `/media/${row.file_path}`,
    original_name: row.original_name,
    duration_seconds: row.duration_seconds,
});

// PG returns TIME as HH:MM:SS; the API speaks HH:MM.
export const toHourMinute = (time: string | null) => (time === null ? null : time.slice(0, 5));
