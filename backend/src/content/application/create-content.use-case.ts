import { Inject, Injectable } from "@nestjs/common";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { detectMedia, VIDEO_MAX_SECONDS } from "../domain/content-media";
import { mediaTooLarge, mediaUnreadable, unsupportedMediaType, videoTooLong } from "../domain/content.errors";
import { CONTENT_REPOSITORY, toMediaResponse, type IContentRepository } from "../domain/content.repository";
import { CONTENT_STORAGE, VIDEO_PROBE, type IContentStorage, type IVideoProbe } from "./ports/content-ports";

export interface CreateContentInput {
    file: Buffer;
    original_name: string;
}

@Injectable()
export class CreateContentUseCase {

    constructor(
        @Inject(CONTENT_REPOSITORY)
        private readonly contentRepository: IContentRepository,
        @Inject(CONTENT_STORAGE)
        private readonly storage: IContentStorage,
        @Inject(VIDEO_PROBE)
        private readonly videoProbe: IVideoProbe,
    ){}

    async execute(tenant: Tenant, input: CreateContentInput){
        const tenantId = tenant.tenant_id;
        const media = detectMedia(input.file);
        if (!media) throw unsupportedMediaType();
        if (input.file.length > media.maxBytes) throw mediaTooLarge(media.type === 'image' ? '5 MB' : '50 MB');

        // Measured before saving so an invalid video is never stored. Images get their duration per playlist item.
        const duration = media.type === 'video' ? await this.measureVideo(input.file) : null;

        const filePath = await this.storage.save(tenantId, input.file, media.ext);
        try {
            const row = await this.contentRepository.create(tenantId, {
                type: media.type,
                file_path: filePath,
                original_name: input.original_name.slice(0, 255),
                mime_type: media.mime,
                size_bytes: input.file.length,
                duration_seconds: duration,
            });
            return toMediaResponse(row);
        } catch (error) {
            await this.storage.remove(filePath);
            throw error;
        }
    }

    private async measureVideo(video: Buffer){
        let seconds: number;
        try {
            seconds = await this.videoProbe.durationSeconds(video);
        } catch {
            throw mediaUnreadable();
        }
        if (!(seconds >= 1)) throw mediaUnreadable();
        if (seconds > VIDEO_MAX_SECONDS) throw videoTooLong();
        return seconds;
    }
}
