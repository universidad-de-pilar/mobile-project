import { Controller, Get, Headers, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createHash } from 'node:crypto';
import { Public } from 'src/auth/api/public.decorator';
import { CurrentTenant } from 'src/tenants/api/current-tenant.decorator';
import { Tenant } from 'src/tenants/domain/tenant.entity';
import { GetPublicCatalogUseCase } from '../application/get-public-catalog.use-case';

// Short TTL: catalog edits reach customers within ~1 min (stale-while-revalidate hides the refetch).
const CATALOG_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

@Controller('public/stores')
export class PublicCatalogController {
  constructor(private readonly getPublicCatalog: GetPublicCatalogUseCase) {}

  @Public()
  @Get(':storeSlug/catalog')
  async catalog(
    @CurrentTenant() tenant: Tenant,
    @Param('storeSlug') storeSlug: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const catalog = await this.getPublicCatalog.execute(tenant, storeSlug);
    // Headers are set only after success, so error responses (404, 503) are never cached.
    const etag = `"${createHash('sha1').update(JSON.stringify(catalog)).digest('hex')}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', CATALOG_CACHE_CONTROL);
    // The tenant may come from this header instead of the host.
    res.vary('X-Tenant-Slug');
    if (ifNoneMatch === etag) {
      res.status(304);
      return;
    }
    return catalog;
  }
}
