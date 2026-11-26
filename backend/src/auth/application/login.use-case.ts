import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { USER_REPOSITORY } from "src/users/domain/user.repository";
import type { IUserRepository } from "src/users/domain/user.repository";
import { LoginCommand } from "./commands/login.command";
import type { IPasswordHasher } from "./ports/password-hasher";
import { PASSWORD_HASHER } from "./ports/password-hasher";
import { TOKEN_SERVICE } from "./ports/token-service";
import type { ITokenService } from "./ports/token-service";

@Injectable()
export class LoginUseCase {

    constructor(
        @Inject(USER_REPOSITORY)
        private readonly usersRepository: IUserRepository,
        @Inject(PASSWORD_HASHER)
        private readonly passwordHasher: IPasswordHasher,
        @Inject(TOKEN_SERVICE)
        private readonly tokenService: ITokenService
    ){}

    async execute(dto: LoginCommand){
        const userExists = await this.usersRepository.getByEmailWithPassword(dto.email);
        if (userExists == null || !userExists.is_active){
            throw new UnauthorizedException(`Las credenciales no son correctas`);
        }

        if(await this.passwordHasher.compare(dto.password, userExists.password_hash)){

            const token = await this.tokenService.sign({
                sub: userExists.user_id,
                email: userExists.email
            })
            return {
                access_token: token
            }
        }

        throw new UnauthorizedException(`Las credenciales no son correctas`)
    }
}