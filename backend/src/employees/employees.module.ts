import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { EmployeesController } from './api/employees.controller';
import { CreateEmployeeUseCase } from './application/create.use-case';
import { ListEmployeesUseCase } from './application/list.use-case';
import { SetEmployeeStoresUseCase } from './application/set-stores.use-case';
import { UpdateEmployeeUseCase } from './application/update.use-case';
import { EMPLOYEE_REPOSITORY } from './domain/employee.repository';
import { PostgreEmployeeRepository } from './infraestructure/postgre-employee.repository';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [EmployeesController],
  providers: [
    {
      provide: EMPLOYEE_REPOSITORY,
      useClass: PostgreEmployeeRepository,
    },
    ListEmployeesUseCase,
    CreateEmployeeUseCase,
    UpdateEmployeeUseCase,
    SetEmployeeStoresUseCase,
  ],
})
export class EmployeesModule {}
