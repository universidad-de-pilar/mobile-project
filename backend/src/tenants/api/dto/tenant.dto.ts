import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches, MaxLength, ValidateIf, ValidateNested } from "class-validator";
import { SLUG_FORMAT } from "../../domain/tenant-slug";

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Optional field that, when sent, must not be null (NOT NULL columns).
const IsDefinedIfSent = () => ValidateIf((_, value) => value !== undefined);

const SLUG_MESSAGE = 'slug must be 3 to 30 lowercase letters, digits or hyphens, not starting or ending with a hyphen';

export class CreateTenantStoreDto {
    @Transform(trim)
    @IsString()
    @Length(1, 150)
    name: string;

    @Matches(SLUG_FORMAT, { message: SLUG_MESSAGE })
    slug: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    address?: string;
}

export class CreateTenantDto {
    @Transform(trim)
    @IsString()
    @Length(1, 150)
    name: string;

    @Matches(SLUG_FORMAT, { message: SLUG_MESSAGE })
    slug: string;

    @ValidateNested()
    @Type(() => CreateTenantStoreDto)
    store: CreateTenantStoreDto;

    @IsEmail()
    owner_email: string;
}

export class UpdateTenantDto {
    @IsDefinedIfSent()
    @Transform(trim)
    @IsString()
    @Length(1, 150)
    name?: string;

    @IsDefinedIfSent()
    @IsBoolean()
    is_active?: boolean;
}
