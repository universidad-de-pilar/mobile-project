import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TENANT_REPOSITORY, type ITenantRepository } from '../domain/tenant.repository';
import { tenantNotFound, tenantSuspended } from '../domain/tenant.errors';
import { ADMIN_SLUG, extractSlugFromHost, isValidSlug } from '../domain/tenant-slug';

// The platform admin context only reaches these routes; the rest is tenant-scoped.
const ADMIN_ROUTES = /^\/(auth|me|tenants)(\/|\?|$)/;
const AUTH_ROUTES = /^\/auth(\/|\?|$)/;

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: ITenantRepository,
  ) {}

  async use(req: Request & { tenant?: unknown; platformAdmin?: boolean }, _res: Response, next: NextFunction) {
    const baseDomain = process.env.BASE_DOMAIN ?? 'localhost';
    const header = req.headers['x-tenant-slug'];
    // The header is only read when the Host gives no slug.
    const slug = extractSlugFromHost(req.headers.host, baseDomain) ?? (typeof header === 'string' ? header : null);

    if (slug === ADMIN_SLUG) {
      if (!ADMIN_ROUTES.test(req.originalUrl)) throw tenantNotFound();
      req.platformAdmin = true;
      return next();
    }

    const tenant = slug && isValidSlug(slug) ? await this.tenantRepository.findBySlug(slug) : null;
    // A suspended tenant is known but offline, including its login.
    if (tenant && !tenant.is_active) throw tenantSuspended();
    if (!tenant) {
      // Login and register do not need a tenant.
      if (AUTH_ROUTES.test(req.originalUrl)) return next();
      throw tenantNotFound();
    }

    req.tenant = tenant;
    next();
  }
}
