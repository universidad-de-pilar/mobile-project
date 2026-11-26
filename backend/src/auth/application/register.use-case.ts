import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { USER_REPOSITORY } from "src/users/domain/user.repository";
import type { IUserRepository } from "src/users/domain/user.repository";
import { RegisterUserCommand } from "./commands/register.command";
import { adminAlreadyExists } from "../domain/auth.errors";
import type { IPasswordHasher } from "./ports/password-hasher";
import { PASSWORD_HASHER } from "./ports/password-hasher";

@Injectable()
export class RegisterUseCase {

    constructor(
        @Inject(USER_REPOSITORY)
        private readonly usersRepository: IUserRepository,
        @Inject(PASSWORD_HASHER)
        private readonly passwordHasher: IPasswordHasher
    ){}

    async execute(dto: RegisterUserCommand, isAdminContext = false){
        const userExists = await this.usersRepository.getByEmail(dto.email);
        if (userExists != null){
            throw new ConflictException(`El email ${dto.email} ya se encuentra registrado`);
        }

        const data = {
            email: dto.email,
            password_hash: await this.passwordHasher.hash(dto.password),
            first_name: dto.first_name,
            last_name: dto.last_name
        };

        if (!isAdminContext) return await this.usersRepository.create(data);

        const root = await this.usersRepository.createRoot(data);
        if (!root) throw adminAlreadyExists();
        return root;
    }
}