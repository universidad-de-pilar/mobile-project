import { Transform } from "class-transformer";
import { IsString, Length, Matches, MaxLength, ValidateIf } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Optional field that, when sent, must not be null (NOT NULL column).
const IsDefinedIfSent = () => ValidateIf((_, value) => value !== undefined);

// Nullable column: null clears it, undefined leaves it untouched.
const NullableIfSent = () => ValidateIf((_, value) => value !== undefined && value !== null);

export class UpdateStoreDto {
    @IsDefinedIfSent()
    @Transform(trim)
    @IsString()
    @Length(1, 150)
    name?: string;

    @NullableIfSent()
    @IsString()
    @MaxLength(255)
    address?: string | null;

    @NullableIfSent()
    @IsString()
    @MaxLength(50)
    phone?: string | null;

    @NullableIfSent()
    @Matches(/^\+[1-9][0-9]{7,14}$/, { message: 'whatsapp_number must be in international E.164 format, e.g. +5491112345678' })
    whatsapp_number?: string | null;
}
