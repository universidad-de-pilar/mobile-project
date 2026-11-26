import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsString, IsUUID, MinLength, ValidateIf } from "class-validator";
import { RegisterUserDto } from "src/auth/api/dto/create-user.dto";

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Optional field that, when sent, must not be null (NOT NULL columns).
const IsDefinedIfSent = () => ValidateIf((_, value) => value !== undefined);

export class StoreIdsDto {
    @IsArray()
    @IsUUID('all', { each: true })
    store_ids: string[];
}

// Mismas reglas de email, contraseña y nombres que el registro.
export class CreateEmployeeDto extends RegisterUserDto {
    @IsArray()
    @IsUUID('all', { each: true })
    store_ids: string[];
}

export class UpdateEmployeeDto {
    @IsDefinedIfSent()
    @Transform(trim)
    @IsString()
    @MinLength(3)
    first_name?: string;

    @IsDefinedIfSent()
    @Transform(trim)
    @IsString()
    @MinLength(3)
    last_name?: string;

    @IsDefinedIfSent()
    @IsBoolean()
    is_active?: boolean;
}
