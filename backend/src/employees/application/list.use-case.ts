import { Inject, Injectable } from "@nestjs/common";
import { EMPLOYEE_REPOSITORY, type IEmployeeRepository } from "../domain/employee.repository";

@Injectable()
export class ListEmployeesUseCase {

    constructor(
        @Inject(EMPLOYEE_REPOSITORY)
        private readonly employeeRepository: IEmployeeRepository,
    ){}

    execute(tenantId: string){
        return this.employeeRepository.list(tenantId);
    }
}
