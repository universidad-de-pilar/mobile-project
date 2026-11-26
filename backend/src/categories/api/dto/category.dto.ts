import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Length, ValidateIf } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Optional field that, when sent, must not be null (NOT NULL columns).
const IsDefinedIfSent = () => ValidateIf((_, value) => value !== undefined);

export class ListCategoriesQueryDto {
    @IsUUID()
    store_id: string;
}

export class CreateCategoryDto {
    @IsUUID()
    store_id: string;

    @Transform(trim)
    @IsString()
    @Length(1, 80)
    name: string;

    @IsOptional()
    @IsInt()
    sort_order?: number;
}

export class UpdateCategoryDto {
    @IsDefinedIfSent()
    @Transform(trim)
    @IsString()
    @Length(1, 80)
    name?: string;

    @IsDefinedIfSent()
    @IsInt()
    sort_order?: number;
}
