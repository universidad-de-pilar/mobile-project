import { Inject, Injectable } from "@nestjs/common";
import { playlistNotFound } from "src/content/domain/content.errors";
import { PLAYLIST_REPOSITORY, type IPlaylistRepository } from "src/content/domain/playlist.repository";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { findOverlap, isValidSlot, splitSchedule, type Slot } from "../domain/screen-schedule";
import { invalidSlot, screenNotFound, slotOverlap } from "../domain/screen.errors";
import { SCREEN_REPOSITORY, type IScreenRepository } from "../domain/screen.repository";

export interface ScheduleInput { default_playlist_id?: string | null; slots: Slot[] }

const readSchedule = async (screens: IScreenRepository, tenantId: string, screenId: string) => {
    const { defaultRow, slotRows } = splitSchedule(await screens.getSchedule(tenantId, screenId));
    return { default_playlist_id: defaultRow?.playlist_id ?? null, slots: slotRows };
};

@Injectable()
export class GetScreenScheduleUseCase {
    constructor(@Inject(SCREEN_REPOSITORY) private readonly screens: IScreenRepository){}

    async execute(tenant: Tenant, screenId: string){
        if (!(await this.screens.findOne(tenant.tenant_id, screenId))) throw screenNotFound();
        return readSchedule(this.screens, tenant.tenant_id, screenId);
    }
}

@Injectable()
export class SetScreenScheduleUseCase {
    constructor(
        @Inject(SCREEN_REPOSITORY) private readonly screens: IScreenRepository,
        @Inject(PLAYLIST_REPOSITORY) private readonly playlists: IPlaylistRepository,
    ){}

    // Replaces the default and every slot. Overlap is rejected here; outside every slot the default plays.
    async execute(tenant: Tenant, screenId: string, input: ScheduleInput){
        const tenantId = tenant.tenant_id;
        if (!(await this.screens.findOne(tenantId, screenId))) throw screenNotFound();

        if (!input.slots.every(isValidSlot)) throw invalidSlot();
        const overlap = findOverlap(input.slots);
        if (overlap) throw slotOverlap(overlap);

        const defaultId = input.default_playlist_id ?? null;
        const ids = [...new Set([...(defaultId ? [defaultId] : []), ...input.slots.map((slot) => slot.playlist_id)])];
        if (ids.length && (await this.playlists.findOwnedIds(tenantId, ids)).length !== ids.length) throw playlistNotFound();

        await this.screens.replaceSchedule(tenantId, screenId, { default_playlist_id: defaultId, slots: input.slots });
        return readSchedule(this.screens, tenantId, screenId);
    }
}
