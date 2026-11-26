import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IRoleRepository } from "../domain/role.repository";
import { Role } from "../domain/role.entity";
import { Permission } from "../domain/permission.entity";
import { RoleOrmEntity } from "./role.orm-entity";
import { PermissionOrmEntity } from "./permission.orm-entity";

@Injectable()
export class PostgreRoleRepository implements IRoleRepository{

    constructor(
        @InjectRepository(RoleOrmEntity)
        private readonly roleDb: Repository<RoleOrmEntity>,
        @InjectRepository(PermissionOrmEntity)
        private readonly permissionDb: Repository<PermissionOrmEntity>
    ){}

    async getAll(): Promise<Role[]> {
        return this.roleDb.find();
    }

    async getById(id: string): Promise<Role | null> {
        return this.roleDb.findOne({
            where: {
                role_id: id
            }
        });
    }

    async getPermissionsByRoleId(roleId: string): Promise<Permission[]> {
        return this.permissionDb
            .createQueryBuilder('p')
            .innerJoin('roles_permissions', 'rp', 'rp.permission_id = p.permission_id')
            .where('rp.role_id = :roleId', { roleId })
            .getMany();
    }

    async getPermissionCodesByUserId(userId: string): Promise<string[]> {
        const rows = await this.permissionDb
            .createQueryBuilder('p')
            .select('p.code', 'code')
            .distinct(true)
            .innerJoin('roles_permissions', 'rp', 'rp.permission_id = p.permission_id')
            .innerJoin('users_roles', 'ur', 'ur.role_id = rp.role_id')
            .where('ur.user_id = :userId', { userId })
            .getRawMany<{ code: string }>();
        return rows.map((r) => r.code);
    }

    async isRoot(userId: string): Promise<boolean> {
        const rows = await this.roleDb.manager.query(
            "SELECT 1 FROM users_roles ur JOIN roles r ON r.role_id = ur.role_id WHERE ur.user_id = $1 AND r.name = 'root' LIMIT 1",
            [userId],
        );
        return rows.length > 0;
    }
}
