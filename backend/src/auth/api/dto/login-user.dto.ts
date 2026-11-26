import { IsEmail, IsString, Matches, MinLength } from "class-validator";

export class LoginUserDto {
    @IsEmail()
    email:string;

    @IsString()
    @MinLength(8)
    password:string;
}