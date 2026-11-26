import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { IPairingRepository, NewPairing } from "../domain/pairing.repository";

@Injectable()
export class PostgrePairingRepository implements IPairingRepository {

    constructor(@InjectDataSource() private readonly dataSource: DataSource){}

    async create(tenantId: string, pairing: NewPairing): Promise<boolean> {
        const rows = await this.dataSource.query(
            `INSERT INTO screen_pairings (code, claim_secret, tenant_id, expires_at) VALUES ($1, $2, $3, $4)
             ON CONFLICT (code) DO NOTHING RETURNING code`,
            [pairing.code, pairing.claim_secret, tenantId, pairing.expires_at],
        );
        return rows.length > 0;
    }

    async deleteExpired(tenantId: string): Promise<void> {
        await this.dataSource.query(`DELETE FROM screen_pairings WHERE tenant_id = $1 AND expires_at <= now()`, [tenantId]);
    }

    async findClaim(tenantId: string, claimSecret: string): Promise<{ token: string | null } | null> {
        const rows = await this.dataSource.query(
            `SELECT CASE WHEN sc.is_active THEN sc.token END AS token
             FROM screen_pairings p LEFT JOIN screens sc ON sc.screen_id = p.screen_id AND sc.tenant_id = p.tenant_id
             WHERE p.tenant_id = $1 AND p.claim_secret = $2 AND p.expires_at > now()`,
            [tenantId, claimSecret],
        );
        return rows[0] ?? null;
    }

    async deleteClaim(tenantId: string, claimSecret: string): Promise<void> {
        await this.dataSource.query(`DELETE FROM screen_pairings WHERE tenant_id = $1 AND claim_secret = $2`, [tenantId, claimSecret]);
    }

    async pair(tenantId: string, screenId: string, code: string): Promise<boolean> {
        // pg devuelve [filas, cantidad] en UPDATE
        const [rows] = await this.dataSource.query(
            `UPDATE screen_pairings SET screen_id = $3
             WHERE tenant_id = $1 AND code = $2 AND screen_id IS NULL AND expires_at > now() RETURNING code`,
            [tenantId, code, screenId],
        );
        return rows.length > 0;
    }
}
