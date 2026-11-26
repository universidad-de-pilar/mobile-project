import { Inject, Injectable } from "@nestjs/common";
import { employeeNotEditable, employeeNotFound, invalidStores } from "../domain/employee.errors";
import { EMPLOYEE_REPOSITORY, type IEmployeeRepository } from "../domain/employee.repository";

@Injectable()
export class SetEmployeeStoresUseCase {

    constructor(
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: IEmployeeRepository,
    ){}

    async execute(tenantId: string, userId: string, storeIds: string[]){
        const member = await this.employeeRepository.findMember(tenantId, userId);
        if (!member) throw employeeNotFound();
        if (member.role !== 'employee') throw employeeNotEditable();

        const unique = [...new Set(storeIds)];
        if (unique.length === 0 || !(await this.employeeRepository.areActiveStoresOfTenant(tenantId, unique))) {
            throw invalidStores();
        }

        return this.employeeRepository.replaceStores(tenantId, userId, unique);
    }
}
