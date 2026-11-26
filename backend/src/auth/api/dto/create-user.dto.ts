import { IsEmail, IsString, Matches, MinLength } from "class-validator";

export class RegisterUserDto {
    @IsEmail()
    email:string;

    @IsString()
    @MinLength(8)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
        {
        message:
            'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
        },
    )
    password:string;

    @IsString()
    @MinLength(3)
    first_name:string;

    @IsString()
    @MinLength(3)
    last_name:string;
}