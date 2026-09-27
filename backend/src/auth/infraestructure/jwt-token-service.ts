import { JwtService } from "@nestjs/jwt";
import { ITokenService } from "../application/ports/token-service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class JwtTokenService implements ITokenService{
    constructor(
        private readonly jwtService:JwtService
    ){}

    sign(payload: {sub:string;email:string}):Promise<string>{
        return this.jwtService.signAsync(payload);
    }
}