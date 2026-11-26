import { createHash } from "crypto";
import { Inject, Injectable } from "@nestjs/common";
import { PLAYLIST_REPOSITORY, type IPlaylistRepository, type PlaylistItemRow } from "src/content/domain/playlist.repository";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { webOrigin } from "src/tenants/domain/web-origin";
import { splitSchedule } from "../domain/screen-schedule";
import { screenNotFound } from "../domain/screen.errors";
import { SCREEN_REPOSITORY, type IScreenRepository } from "../domain/screen.repository";

const toPlayerItem = (i: PlaylistItemRow) => ({
    media_id: i.media_id, type: i.type, url: `/media/${i.file_path}`, duration_seconds: i.duration_seconds,
});

@Injectable()
export class GetPlaylistUseCase {

    constructor(
        @Inject(SCREEN_REPOSITORY)
        private readonly screenRepository: IScreenRepository,
        @Inject(PLAYLIST_REPOSITORY)
        private readonly playlistRepository: IPlaylistRepository,
    ){}

    // The player picks the active slot with its own clock, so every slot travels with its items.
    async execute(tenant: Tenant, token: string){
        const screen = await this.screenRepository.findPlayerScreen(tenant.tenant_id, token);
        if (!screen) throw screenNotFound();

        const { defaultRow, slotRows } = splitSchedule(await this.screenRepository.getSchedule(tenant.tenant_id, screen.screen_id));
        const ids = [...new Set([...(defaultRow ? [defaultRow.playlist_id] : []), ...slotRows.map((s) => s.playlist_id)])];
        const rows = ids.length ? await this.playlistRepository.listItems(tenant.tenant_id, ids) : [];
        const itemsOf = (playlistId: string) => rows.filter((r) => r.playlist_id === playlistId).map(toPlayerItem);

        // Key order matters: the version hashes this JSON as is.
        const body = {
            poll_interval_seconds: 30,
            store: { name: screen.store_name, slug: screen.store_slug },
            qr_url: `${webOrigin(tenant.slug)}/${screen.store_slug}?src=${screen.screen_id}`,
            default: defaultRow ? { items: itemsOf(defaultRow.playlist_id) } : null,
            slots: slotRows.map((s) => ({ days: s.days, start: s.start, end: s.end, items: itemsOf(s.playlist_id) })),
        };
        const version = createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16);

        return { version, ...body };
    }
}
