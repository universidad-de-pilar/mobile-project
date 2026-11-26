import { Entity, PrimaryColumn } from "typeorm";

@Entity({name: 'roles_permissions'})
export class RolePermissionOrmEntity {
    @PrimaryColumn('uuid', {name: 'role_id'})
    role_id: string;

    @PrimaryColumn('uuid', {name: 'permission_id'})
    permission_id: string;
}
