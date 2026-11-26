import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ROLE_REPOSITORY } from './domain/role.repository';
import { PostgreRoleRepository } from './infraestructure/postgre-role.repository';
import { RoleOrmEntity } from './infraestructure/role.orm-entity';
import { PermissionOrmEntity } from './infraestructure/permission.orm-entity';
import { RolePermissionOrmEntity } from './infraestructure/role-permission.orm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoleOrmEntity, PermissionOrmEntity, RolePermissionOrmEntity])],
  controllers: [],
  providers: [
    {
        provide: ROLE_REPOSITORY,
        useClass: PostgreRoleRepository
    }
  ],
  exports:[ROLE_REPOSITORY]
})
export class RolesModule {}
