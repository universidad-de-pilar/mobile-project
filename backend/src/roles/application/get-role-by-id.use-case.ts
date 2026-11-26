import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ROLE_REPOSITORY, type IRoleRepository } from "../domain/role.repository";

@Injectable()
export class GetRoleByIdUseCase {

    constructor(
        @Inject(ROLE_REPOSITORY)
        private readonly roleRepository: IRoleRepository,
    ){}

    async execute(roleId: string){

        const role = await this.roleRepository.getById(roleId);

        if (!role){
            throw new NotFoundException(`El rol con ID ${roleId} no existe`);
        }

        return role;
    }
}
