import { Inject, Injectable } from "@nestjs/common";
import { ROLE_REPOSITORY, type IRoleRepository } from "src/roles/domain/role.repository";
import { STORE_REPOSITORY, type IStoreRepository, type StoreRow } from "src/stores/domain/store.repository";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { TENANT_REPOSITORY, type ITenantRepository } from "src/tenants/domain/tenant.repository";
import { USER_REPOSITORY, type IUserRepository } from "src/users/domain/user.repository";

@Injectable()
export class GetMeUseCase {

    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
        @Inject(ROLE_REPOSITORY)
        private readonly roleRepository: IRoleRepository,
        @Inject(STORE_REPOSITORY)
        private readonly storeRepository: IStoreRepository,
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
    ){}

    // tenant is undefined in the platform admin context.
    async execute(tenant: Tenant | undefined, userId: string){
        const [user, stores, allowed, permissions, isRoot] = await Promise.all([
            this.userRepository.getById(userId),
            tenant ? this.storeRepository.list(tenant.tenant_id) : ([] as StoreRow[]),
            tenant ? this.tenantRepository.allowedStoreIds(tenant.tenant_id, userId) : null,
            this.roleRepository.getPermissionCodesByUserId(userId),
            this.roleRepository.isRoot(userId),
        ]);

        return {
            user: { user_id: user!.user_id, email: user!.email, first_name: user!.first_name, last_name: user!.last_name },
            tenant: tenant ? { tenant_id: tenant.tenant_id, name: tenant.name, slug: tenant.slug } : null,
            stores: stores.filter((s) => s.is_active && (allowed === null || allowed.includes(s.store_id))).map(({ store_id, name, slug }) => ({ store_id, name, slug })),
            permissions,
            is_root: isRoot,
        };
    }
}
