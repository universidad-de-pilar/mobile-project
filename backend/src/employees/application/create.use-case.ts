import { Inject, Injectable } from "@nestjs/common";
import { PASSWORD_HASHER, type IPasswordHasher } from "src/auth/application/ports/password-hasher";
import { USER_REPOSITORY, type IUserRepository } from "src/users/domain/user.repository";
import { emailTaken, invalidStores } from "../domain/employee.errors";
import { EMPLOYEE_REPOSITORY, type IEmployeeRepository } from "../domain/employee.repository";

export interface CreateEmployeeCommand {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    store_ids: string[];
}

@Injectable()
export class CreateEmployeeUseCase {

    constructor(
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: IEmployeeRepository,
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
        @Inject(PASSWORD_HASHER)
        private readonly passwordHasher: IPasswordHasher,
    ){}

    async execute(tenantId: string, command: CreateEmployeeCommand){
        if (await this.userRepository.getByEmail(command.email)) throw emailTaken();

        const storeIds = [...new Set(command.store_ids)];
        if (storeIds.length === 0 || !(await this.employeeRepository.areActiveStoresOfTenant(tenantId, storeIds))) {
            throw invalidStores();
        }

        return this.employeeRepository.create(tenantId, {
            email: command.email,
            first_name: command.first_name,
            last_name: command.last_name,
            password_hash: await this.passwordHasher.hash(command.password),
            store_ids: storeIds,
        });
    }
}
