import { Inject, Injectable } from "@nestjs/common";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { durationNotAllowed, durationRequired, mediaNotFound, playlistNotFound } from "../domain/content.errors";
import { CONTENT_REPOSITORY, type IContentRepository } from "../domain/content.repository";
import {
    PLAYLIST_REPOSITORY, toHourMinute, toPlaylistItemResponse, toPlaylistResponse,
    type IPlaylistRepository, type NewPlaylistItem,
} from "../domain/playlist.repository";

export interface PlaylistItemInput { media_id: string; duration_seconds?: number }

@Injectable()
export class ListPlaylistsUseCase {
    constructor(@Inject(PLAYLIST_REPOSITORY) private readonly playlists: IPlaylistRepository){}

    async execute(tenant: Tenant){
        return (await this.playlists.list(tenant.tenant_id)).map(toPlaylistResponse);
    }
}

@Injectable()
export class CreatePlaylistUseCase {
    constructor(@Inject(PLAYLIST_REPOSITORY) private readonly playlists: IPlaylistRepository){}

    async execute(tenant: Tenant, name: string){
        return toPlaylistResponse(await this.playlists.create(tenant.tenant_id, name));
    }
}

@Injectable()
export class RenamePlaylistUseCase {
    constructor(@Inject(PLAYLIST_REPOSITORY) private readonly playlists: IPlaylistRepository){}

    async execute(tenant: Tenant, playlistId: string, name: string){
        const row = await this.playlists.rename(tenant.tenant_id, playlistId, name);
        if (!row) throw playlistNotFound();
        return toPlaylistResponse(row);
    }
}

@Injectable()
export class DeletePlaylistUseCase {
    constructor(@Inject(PLAYLIST_REPOSITORY) private readonly playlists: IPlaylistRepository){}

    async execute(tenant: Tenant, playlistId: string){
        if (!(await this.playlists.delete(tenant.tenant_id, playlistId))) throw playlistNotFound();
    }
}

@Injectable()
export class GetPlaylistDetailUseCase {
    constructor(@Inject(PLAYLIST_REPOSITORY) private readonly playlists: IPlaylistRepository){}

    async execute(tenant: Tenant, playlistId: string){
        const row = await this.playlists.findOne(tenant.tenant_id, playlistId);
        if (!row) throw playlistNotFound();

        const items = await this.playlists.listItems(tenant.tenant_id, [playlistId]);
        return { ...toPlaylistResponse(row), items: items.map(toPlaylistItemResponse) };
    }
}

@Injectable()
export class SetPlaylistItemsUseCase {
    constructor(
        @Inject(PLAYLIST_REPOSITORY) private readonly playlists: IPlaylistRepository,
        @Inject(CONTENT_REPOSITORY) private readonly media: IContentRepository,
    ){}

    // Replaces the whole list. Images need their own duration; videos use their real one.
    async execute(tenant: Tenant, playlistId: string, input: PlaylistItemInput[]){
        const tenantId = tenant.tenant_id;
        if (!(await this.playlists.findOne(tenantId, playlistId))) throw playlistNotFound();

        const ids = [...new Set(input.map((item) => item.media_id))];
        const found = ids.length ? await this.media.findMany(tenantId, ids) : [];
        if (found.length !== ids.length) throw mediaNotFound();
        const typeOf = new Map(found.map((m) => [m.media_id, m.type]));

        const items: NewPlaylistItem[] = input.map((item) => {
            const isImage = typeOf.get(item.media_id) === 'image';
            if (isImage && item.duration_seconds === undefined) throw durationRequired();
            if (!isImage && item.duration_seconds !== undefined) throw durationNotAllowed();
            return { media_id: item.media_id, duration_seconds: item.duration_seconds ?? null };
        });

        await this.playlists.replaceItems(tenantId, playlistId, items);
        return new GetPlaylistDetailUseCase(this.playlists).execute(tenant, playlistId);
    }
}

@Injectable()
export class ListPlaylistScreensUseCase {
    constructor(@Inject(PLAYLIST_REPOSITORY) private readonly playlists: IPlaylistRepository){}

    // One entry per assignment; days/start/end are null for the screen's default playlist.
    async execute(tenant: Tenant, playlistId: string){
        if (!(await this.playlists.findOne(tenant.tenant_id, playlistId))) throw playlistNotFound();

        const rows = await this.playlists.listScreens(tenant.tenant_id, playlistId);
        return rows.map(({ start_time, end_time, ...row }) => ({ ...row, start: toHourMinute(start_time), end: toHourMinute(end_time) }));
    }
}
