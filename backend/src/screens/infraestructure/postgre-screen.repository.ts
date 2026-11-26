import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { IScreenRepository, NewSchedule, NewScreen, PlayerScreen, ScheduleRow, ScreenPatch, ScreenRow } from "../domain/screen.repository";

const COLUMNS = 'screen_id, store_id, name, token, is_active, created_at, updated_at';

@Injectable()
export class PostgreScreenRepository implements IScreenRepository {

    constructor(@InjectDataSource() private readonly dataSource: DataSource){}

    async create(tenantId: string, screen: NewScreen): Promise<ScreenRow> {
        const rows = await this.dataSource.query(
            `INSERT INTO screens (tenant_id, store_id, name, token) VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
            [tenantId, screen.store_id, screen.name, screen.token],
        );
        return rows[0];
    }

    listByStore(tenantId: string, storeId: string): Promise<ScreenRow[]> {
        return this.dataSource.query(
            `SELECT ${COLUMNS} FROM screens WHERE tenant_id = $1 AND store_id = $2 ORDER BY created_at`,
            [tenantId, storeId],
        );
    }

    async update(tenantId: string, screenId: string, patch: ScreenPatch): Promise<ScreenRow | null> {
        const fields = (['name', 'is_active'] as const).filter((field) => patch[field] !== undefined);
        const sets = fields.map((field, i) => `${field} = $${i + 3}`).join(', ');
        // pg returns [rows, affectedCount] for UPDATE
        const [rows] = await this.dataSource.query(
            `UPDATE screens SET ${sets}, updated_at = now() WHERE tenant_id = $1 AND screen_id = $2 RETURNING ${COLUMNS}`,
            [tenantId, screenId, ...fields.map((field) => patch[field])],
        );
        return rows[0] ?? null;
    }

    async findOne(tenantId: string, screenId: string): Promise<ScreenRow | null> {
        const rows = await this.dataSource.query(
            `SELECT ${COLUMNS} FROM screens WHERE tenant_id = $1 AND screen_id = $2`,
            [tenantId, screenId],
        );
        return rows[0] ?? null;
    }

    getSchedule(tenantId: string, screenId: string): Promise<ScheduleRow[]> {
        return this.dataSource.query(
            `SELECT sp.playlist_id, p.name AS playlist_name, sp.days, sp.start_time, sp.end_time
             FROM screen_playlists sp
             JOIN screens sc ON sc.screen_id = sp.screen_id AND sc.tenant_id = $1
             JOIN playlists p ON p.playlist_id = sp.playlist_id AND p.tenant_id = $1
             WHERE sp.screen_id = $2
             ORDER BY (sp.days IS NOT NULL), sp.start_time, sp.days, sp.screen_playlist_id`,
            [tenantId, screenId],
        );
    }

    async replaceSchedule(tenantId: string, screenId: string, schedule: NewSchedule): Promise<void> {
        const rows = [
            ...(schedule.default_playlist_id ? [{ playlist_id: schedule.default_playlist_id, days: null, start: null, end: null }] : []),
            ...schedule.slots,
        ];
        await this.dataSource.transaction(async (manager) => {
            await manager.query(
                `DELETE FROM screen_playlists sp USING screens sc
                 WHERE sc.screen_id = sp.screen_id AND sc.tenant_id = $1 AND sp.screen_id = $2`,
                [tenantId, screenId],
            );
            if (!rows.length) return;
            await manager.query(
                `INSERT INTO screen_playlists (screen_id, playlist_id, days, start_time, end_time)
                 SELECT $2::uuid, v.playlist_id, v.days, v.start_time, v.end_time
                 FROM unnest($3::uuid[], $4::smallint[], $5::time[], $6::time[]) AS v(playlist_id, days, start_time, end_time)
                 JOIN playlists p ON p.playlist_id = v.playlist_id AND p.tenant_id = $1`,
                [tenantId, screenId, rows.map((r) => r.playlist_id), rows.map((r) => r.days), rows.map((r) => r.start), rows.map((r) => r.end)],
            );
        });
    }

    async findPlayerScreen(tenantId: string, token: string): Promise<PlayerScreen | null> {
        const rows = await this.dataSource.query(
            `SELECT sc.screen_id, sc.store_id, st.name AS store_name, st.slug AS store_slug
             FROM screens sc JOIN stores st ON st.store_id = sc.store_id AND st.tenant_id = sc.tenant_id
             WHERE sc.tenant_id = $1 AND sc.token = $2 AND sc.is_active AND st.is_active`,
            [tenantId, token],
        );
        return rows[0] ?? null;
    }
}
