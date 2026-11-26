export interface ScreenRow {
    screen_id: string;
    store_id: string;
    name: string;
    token: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface NewScreen { store_id: string; name: string; token: string }

export type ScreenPatch = Partial<Pick<ScreenRow, 'name' | 'is_active'>>;

export interface ScheduleRow {
    playlist_id: string;
    playlist_name: string;
    days: number | null; // null = default playlist
    start_time: string | null;
    end_time: string | null;
}

export interface NewSchedule {
    default_playlist_id: string | null;
    slots: { playlist_id: string; days: number; start: string; end: string }[];
}

export interface PlayerScreen { screen_id: string; store_id: string; store_name: string; store_slug: string }

export interface IScreenRepository {
    create(tenantId: string, screen: NewScreen): Promise<ScreenRow>;
    listByStore(tenantId: string, storeId: string): Promise<ScreenRow[]>;
    update(tenantId: string, screenId: string, patch: ScreenPatch): Promise<ScreenRow | null>;
    findOne(tenantId: string, screenId: string): Promise<ScreenRow | null>;
    // Default first, then slots by start time and days.
    getSchedule(tenantId: string, screenId: string): Promise<ScheduleRow[]>;
    // Replaces the default and every slot in one transaction.
    replaceSchedule(tenantId: string, screenId: string, schedule: NewSchedule): Promise<void>;
    // Only if the screen and its store are both active.
    findPlayerScreen(tenantId: string, token: string): Promise<PlayerScreen | null>;
}

export const SCREEN_REPOSITORY = Symbol('SCREEN_REPOSITORY');
