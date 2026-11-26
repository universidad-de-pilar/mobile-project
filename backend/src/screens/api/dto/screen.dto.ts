import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min, ValidateIf, ValidateNested } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ListScreensQueryDto {
    @IsUUID()
    store_id: string;
}

export class CreateScreenDto {
    @IsUUID()
    store_id: string;

    @Transform(trim)
    @IsString()
    @Length(1, 80)
    name: string;
}

export class UpdateScreenDto {
    @ValidateIf((_, value) => value !== undefined)
    @Transform(trim)
    @IsString()
    @Length(1, 80)
    name?: string;

    @ValidateIf((_, value) => value !== undefined)
    @IsBoolean()
    is_active?: boolean;
}

export class PairScreenDto {
    @IsString()
    @Length(1, 32)
    code: string;
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SlotDto {
    @IsUUID()
    playlist_id: string;

    // Weekday bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64.
    @IsInt()
    @Min(1)
    @Max(127)
    days: number;

    @Matches(HH_MM)
    start: string;

    @Matches(HH_MM)
    end: string;
}

export class SetScheduleDto {
    @IsOptional()
    @IsUUID()
    default_playlist_id?: string | null;

    @IsArray()
    @ArrayMaxSize(50)
    @ValidateNested({ each: true })
    @Type(() => SlotDto)
    slots: SlotDto[];
}
