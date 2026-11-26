import { Inject, Injectable } from "@nestjs/common";
import { ROLE_REPOSITORY, type IRoleRepository } from "../domain/role.repository";

@Injectable()
export class GetRolesUseCase {

    constructor(
        @Inject(ROLE_REPOSITORY)
        private readonly roleRepository: IRoleRepository,
    ){}

    async execute(){
        return this.roleRepository.getAll();
    }
}
