import { Inject, Injectable } from "@nestjs/common";
import { cannotDeactivateSelf, employeeNotEditable, employeeNotFound } from "../domain/employee.errors";
import { EMPLOYEE_REPOSITORY, type EmployeePatch, type IEmployeeRepository } from "../domain/employee.repository";

@Injectable()
export class UpdateEmployeeUseCase {

    constructor(
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: IEmployeeRepository,
    ){}

    async execute(tenantId: string, actorId: string, userId: string, patch: EmployeePatch){
        if (actorId === userId && patch.is_active === false) throw cannotDeactivateSelf();

        const member = await this.employeeRepository.findMember(tenantId, userId);
        if (!member) throw employeeNotFound();
        if (member.role !== 'employee') throw employeeNotEditable();

        return this.employeeRepository.update(tenantId, userId, patch);
    }
}
