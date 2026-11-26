import { Inject, Injectable } from "@nestjs/common";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { withPlayerUrl } from "../domain/screen-player";
import { emptyUpdate, screenNotFound } from "../domain/screen.errors";
import { SCREEN_REPOSITORY, type IScreenRepository, type ScreenPatch } from "../domain/screen.repository";

@Injectable()
export class UpdateScreenUseCase {

    constructor(
        @Inject(SCREEN_REPOSITORY)
        private readonly screenRepository: IScreenRepository,
    ){}

    async execute(tenant: Tenant, screenId: string, input: ScreenPatch){
        const patch: ScreenPatch = {};
        if (input.name !== undefined) patch.name = input.name.trim();
        if (input.is_active !== undefined) patch.is_active = input.is_active;
        if (Object.keys(patch).length === 0) throw emptyUpdate();

        const screen = await this.screenRepository.update(tenant.tenant_id, screenId, patch);
        if (!screen) throw screenNotFound();

        return withPlayerUrl(tenant.slug, screen);
    }
}
