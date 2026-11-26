import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from "class-validator";
import { IMAGE_MIN_SECONDS, IMAGE_MAX_SECONDS, PLAYLIST_MAX_ITEMS } from "../../domain/content-media";

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class PlaylistNameDto {
    @Transform(trim)
    @IsString()
    @Length(1, 80)
    name: string;
}

export class PlaylistItemDto {
    @IsUUID()
    media_id: string;

    // Required for images and forbidden for videos; the use case checks it against the media type.
    @IsOptional()
    @IsInt()
    @Min(IMAGE_MIN_SECONDS)
    @Max(IMAGE_MAX_SECONDS)
    duration_seconds?: number;
}

export class SetPlaylistItemsDto {
    @IsArray()
    @ArrayMaxSize(PLAYLIST_MAX_ITEMS)
    @ValidateNested({ each: true })
    @Type(() => PlaylistItemDto)
    items: PlaylistItemDto[];
}
