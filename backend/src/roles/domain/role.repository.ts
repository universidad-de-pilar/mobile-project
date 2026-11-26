import { Permission } from "./permission.entity";
import { Role } from "./role.entity";

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY')

export interface IRoleRepository{
    getAll():Promise<Role[]>;
    getById(id:string):Promise<Role | null>;
    getPermissionsByRoleId(roleId:string):Promise<Permission[]>;
    getPermissionCodesByUserId(userId:string):Promise<string[]>;
    isRoot(userId:string):Promise<boolean>;
}
