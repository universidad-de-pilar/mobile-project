import { Inject, Injectable } from "@nestjs/common";
import { Tenant } from "src/tenants/domain/tenant.entity";
import { PAIRING_REPOSITORY, type IPairingRepository } from "../domain/pairing.repository";
import { generateClaimSecret, generatePairingCode, normalizePairingCode, PAIRING_TTL_MS } from "../domain/screen-pairing";
import { pairingCodeInvalid, pairingNotFound, screenNotFound } from "../domain/screen.errors";
import { SCREEN_REPOSITORY, type IScreenRepository } from "../domain/screen.repository";

const CODE_ATTEMPTS = 5;

@Injectable()
export class CreatePairingUseCase {

    constructor(
        @Inject(PAIRING_REPOSITORY)
        private readonly pairingRepository: IPairingRepository,
    ){}

    async execute(tenant: Tenant){
        await this.pairingRepository.deleteExpired(tenant.tenant_id);
        for (let i = 0; i < CODE_ATTEMPTS; i++) {
            const pairing = { code: generatePairingCode(), claim_secret: generateClaimSecret(), expires_at: new Date(Date.now() + PAIRING_TTL_MS) };
            if (await this.pairingRepository.create(tenant.tenant_id, pairing)) return pairing;
        }
        throw new Error('Could not generate a free pairing code');
    }
}

@Injectable()
export class ClaimPairingUseCase {

    constructor(
        @Inject(PAIRING_REPOSITORY)
        private readonly pairingRepository: IPairingRepository,
    ){}

    async execute(tenant: Tenant, claimSecret: string){
        const claim = await this.pairingRepository.findClaim(tenant.tenant_id, claimSecret);
        if (!claim) throw pairingNotFound();
        if (!claim.token) return { status: 'pending' as const };

        await this.pairingRepository.deleteClaim(tenant.tenant_id, claimSecret);
        return { status: 'paired' as const, token: claim.token };
    }
}

@Injectable()
export class PairScreenUseCase {

    constructor(
        @Inject(PAIRING_REPOSITORY)
        private readonly pairingRepository: IPairingRepository,
        @Inject(SCREEN_REPOSITORY)
        private readonly screenRepository: IScreenRepository,
    ){}

    async execute(tenant: Tenant, screenId: string, code: string){
        const screen = await this.screenRepository.findOne(tenant.tenant_id, screenId);
        if (!screen) throw screenNotFound();

        const paired = await this.pairingRepository.pair(tenant.tenant_id, screenId, normalizePairingCode(code));
        if (!paired) throw pairingCodeInvalid();
    }
}
