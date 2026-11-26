import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import {
    IPlaylistRepository, NewPlaylistItem, PlaylistItemRow, PlaylistRow, PlaylistScreenRow,
} from "../domain/playlist.repository";

const SELECT_WITH_COUNT = `SELECT p.playlist_id, p.name, p.created_at, p.updated_at,
        (SELECT COUNT(*) FROM playlist_items pi WHERE pi.playlist_id = p.playlist_id) AS item_count
     FROM playlists p`;

@Injectable()
export class PostgrePlaylistRepository implements IPlaylistRepository {

    constructor(@InjectDataSource() private readonly dataSource: DataSource){}

    list(tenantId: string): Promise<PlaylistRow[]> {
        return this.dataSource.query(`${SELECT_WITH_COUNT} WHERE p.tenant_id = $1 ORDER BY lower(p.name), p.created_at`, [tenantId]);
    }

    async findOne(tenantId: string, playlistId: string): Promise<PlaylistRow | null> {
        const rows = await this.dataSource.query(`${SELECT_WITH_COUNT} WHERE p.tenant_id = $1 AND p.playlist_id = $2`, [tenantId, playlistId]);
        return rows[0] ?? null;
    }

    async create(tenantId: string, name: string): Promise<PlaylistRow> {
        const rows = await this.dataSource.query(
            `INSERT INTO playlists (tenant_id, name) VALUES ($1, $2)
             RETURNING playlist_id, name, 0 AS item_count, created_at, updated_at`,
            [tenantId, name],
        );
        return rows[0];
    }

    async rename(tenantId: string, playlistId: string, name: string): Promise<PlaylistRow | null> {
        // pg returns [rows, affectedCount] for UPDATE
        const [rows] = await this.dataSource.query(
            `UPDATE playlists SET name = $3, updated_at = now() WHERE tenant_id = $1 AND playlist_id = $2 RETURNING playlist_id`,
            [tenantId, playlistId, name],
        );
        return rows[0] ? this.findOne(tenantId, playlistId) : null;
    }

    async delete(tenantId: string, playlistId: string): Promise<boolean> {
        const [, affected] = await this.dataSource.query(
            `DELETE FROM playlists WHERE tenant_id = $1 AND playlist_id = $2`,
            [tenantId, playlistId],
        );
        return affected > 0;
    }

    listItems(tenantId: string, playlistIds: string[]): Promise<PlaylistItemRow[]> {
        return this.dataSource.query(
            `SELECT pi.playlist_item_id, pi.playlist_id, pi.media_id, m.type, m.file_path, m.original_name,
                    COALESCE(pi.duration_seconds, m.duration_seconds) AS duration_seconds
             FROM playlist_items pi
             JOIN playlists p ON p.playlist_id = pi.playlist_id AND p.tenant_id = $1
             JOIN media_items m ON m.media_id = pi.media_id AND m.tenant_id = $1
             WHERE pi.playlist_id = ANY($2::uuid[])
             ORDER BY pi.playlist_id, pi.position`,
            [tenantId, playlistIds],
        );
    }

    async replaceItems(tenantId: string, playlistId: string, items: NewPlaylistItem[]): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            await manager.query(`DELETE FROM playlist_items WHERE playlist_id = $1`, [playlistId]);
            if (items.length) {
                await manager.query(
                    `INSERT INTO playlist_items (playlist_id, media_id, position, duration_seconds)
                     SELECT $1::uuid, v.media_id, v.pos, v.duration
                     FROM unnest($2::uuid[], $3::smallint[]) WITH ORDINALITY AS v(media_id, duration, pos)`,
                    [playlistId, items.map((i) => i.media_id), items.map((i) => i.duration_seconds)],
                );
            }
            await manager.query(`UPDATE playlists SET updated_at = now() WHERE tenant_id = $1 AND playlist_id = $2`, [tenantId, playlistId]);
        });
    }

    listScreens(tenantId: string, playlistId: string): Promise<PlaylistScreenRow[]> {
        return this.dataSource.query(
            `SELECT sc.screen_id, sc.name AS screen_name, st.store_id, st.name AS store_name,
                    sp.days, sp.start_time, sp.end_time
             FROM screen_playlists sp
             JOIN playlists p ON p.playlist_id = sp.playlist_id AND p.tenant_id = $1
             JOIN screens sc ON sc.screen_id = sp.screen_id AND sc.tenant_id = $1
             JOIN stores st ON st.store_id = sc.store_id AND st.tenant_id = $1
             WHERE sp.playlist_id = $2
             ORDER BY st.name, sc.name, sp.start_time NULLS FIRST`,
            [tenantId, playlistId],
        );
    }

    async findOwnedIds(tenantId: string, playlistIds: string[]): Promise<string[]> {
        const rows = await this.dataSource.query(
            `SELECT playlist_id FROM playlists WHERE tenant_id = $1 AND playlist_id = ANY($2::uuid[])`,
            [tenantId, playlistIds],
        );
        return rows.map((r: { playlist_id: string }) => r.playlist_id);
    }
}
