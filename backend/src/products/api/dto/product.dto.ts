import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, ValidateIf, Matches, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Optional field that, when sent, must not be null (NOT NULL columns).
const IsDefinedIfSent = () => ValidateIf((_, value) => value !== undefined);

// @Type(() => Boolean) would turn the string "false" into true.
const toBoolean = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

const PRICE = /^[0-9]{1,7}(\.[0-9]{1,2})?$/;

export class ListProductsQueryDto {
    @IsUUID()
    store_id: string;

    @IsOptional()
    @IsUUID()
    category_id?: string;

    @IsOptional()
    @Transform(toBoolean)
    @IsBoolean()
    is_available?: boolean;
}

export class CreateProductDto {
    @IsUUID()
    store_id: string;

    @IsUUID()
    category_id: string;

    @Transform(trim)
    @IsString()
    @Length(1, 80)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @Matches(PRICE)
    price: string;

    @IsOptional()
    @IsBoolean()
    is_available?: boolean;

    @IsOptional()
    @IsInt()
    sort_order?: number;

    @Transform(trim)
    @IsString()
    @Length(1, 64)
    sku: string;

    @IsOptional()
    @IsBoolean()
    gluten_free?: boolean;
}

export class UpdateProductDto {
    @IsDefinedIfSent()
    @IsUUID()
    category_id?: string;

    @IsDefinedIfSent()
    @Transform(trim)
    @IsString()
    @Length(1, 80)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string | null;

    @IsDefinedIfSent()
    @Matches(PRICE)
    price?: string;

    @IsDefinedIfSent()
    @IsBoolean()
    is_available?: boolean;

    @IsDefinedIfSent()
    @IsInt()
    sort_order?: number;

    @IsDefinedIfSent()
    @Transform(trim)
    @IsString()
    @Length(1, 64)
    sku?: string;

    @IsDefinedIfSent()
    @IsBoolean()
    gluten_free?: boolean;
}
