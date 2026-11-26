import { Inject, Injectable } from "@nestjs/common";
import { withSelfOrderUrl } from "src/stores/domain/store-url";
import { USER_REPOSITORY, type IUserRepository } from "src/users/domain/user.repository";
import { invalidSlug, userNotFound } from "../domain/tenant.errors";
import { isValidSlug } from "../domain/tenant-slug";
import { TENANT_REPOSITORY, type ITenantRepository } from "../domain/tenant.repository";
import { webOrigin } from "../domain/web-origin";

export interface CreateTenantInput {
    name: string;
    slug: string;
    store: { name: string; slug: string; address?: string };
    owner_email: string;
}

@Injectable()
export class CreateTenantUseCase {

    constructor(
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: ITenantRepository,
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
    ){}

    async execute(input: CreateTenantInput){
        if (!isValidSlug(input.slug)) throw invalidSlug();

        const owner = await this.userRepository.getByEmail(input.owner_email);
        if (!owner) throw userNotFound();

        const { tenant, store } = await this.tenantRepository.createWithOwner({
            name: input.name.trim(),
            slug: input.slug,
            store: { name: input.store.name.trim(), slug: input.store.slug, address: input.store.address ?? null },
            ownerId: owner.user_id,
        });

        return { ...tenant, web_origin: webOrigin(tenant.slug), store: withSelfOrderUrl(tenant.slug, store) };
    }
}
