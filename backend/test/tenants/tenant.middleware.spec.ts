import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { TenantMiddleware } from 'src/tenants/api/tenant.middleware';

describe('TenantMiddleware', () => {
  const repository = { findBySlug: jest.fn() };
  const middleware = new TenantMiddleware(repository as any);
  const tenant = { tenant_id: 't1', slug: 'local1', name: 'Local 1', is_active: true };

  const run = async (host: string | undefined, headers: Record<string, string> = {}, path = '/stores') => {
    const req: any = { headers: { host, ...headers }, originalUrl: path };
    const next = jest.fn();
    await middleware.use(req, {} as any, next);
    return { req, next };
  };

  beforeEach(() => jest.clearAllMocks());

  it('resolves the tenant from the Host subdomain', async () => {
    repository.findBySlug.mockResolvedValue(tenant);
    const { req, next } = await run('local1.localhost:3000');
    expect(repository.findBySlug).toHaveBeenCalledWith('local1');
    expect(req.tenant).toBe(tenant);
    expect(next).toHaveBeenCalled();
  });

  it('falls back to X-Tenant-Slug when Host has no slug', async () => {
    repository.findBySlug.mockResolvedValue(tenant);
    const { req } = await run('192.168.0.10:3000', { 'x-tenant-slug': 'local1' });
    expect(repository.findBySlug).toHaveBeenCalledWith('local1');
    expect(req.tenant).toBe(tenant);
  });

  it('ignores X-Tenant-Slug when Host already gives a slug', async () => {
    repository.findBySlug.mockResolvedValue(tenant);
    await run('local1.localhost', { 'x-tenant-slug': 'other' });
    expect(repository.findBySlug).toHaveBeenCalledWith('local1');
  });

  it.each([
    ['no slug anywhere', 'localhost', {}],
    ['reserved slug in Host', 'www.localhost', {}],
    ['invalid slug in header', '10.0.0.1', { 'x-tenant-slug': 'Bad_Slug' }],
  ])('404 TENANT_NOT_FOUND: %s (no lookup)', async (_n, host, headers) => {
    await expect(run(host, headers)).rejects.toMatchObject({
      response: { code: 'TENANT_NOT_FOUND' },
    });
    expect(repository.findBySlug).not.toHaveBeenCalled();
  });

  it('404 TENANT_NOT_FOUND when the tenant does not exist', async () => {
    repository.findBySlug.mockResolvedValue(null);
    await expect(run('nope.localhost')).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('suspended tenant (is_active = false)', () => {
    beforeEach(() => repository.findBySlug.mockResolvedValue({ ...tenant, is_active: false }));

    it.each(['/stores', '/public/stores/x/catalog', '/orders', '/auth/login', '/auth/register'])(
      '503 TENANT_SUSPENDED on %s',
      async (path) => {
        const error = await run('local1.localhost', {}, path).catch((e) => e);
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.getResponse()).toMatchObject({ statusCode: 503, code: 'TENANT_SUSPENDED' });
      },
    );

    it('the admin host is unaffected', async () => {
      const { req, next } = await run('admin.localhost', {}, '/tenants');
      expect(req.platformAdmin).toBe(true);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('admin context', () => {
    it.each([
      ['Host admin.<base>', 'admin.localhost:3000', {}],
      ['X-Tenant-Slug admin', '10.0.0.1', { 'x-tenant-slug': 'admin' }],
    ])('flags the platform context without a tenant lookup: %s', async (_n, host, headers) => {
      const { req, next } = await run(host, headers, '/tenants');
      expect(req.platformAdmin).toBe(true);
      expect(req.tenant).toBeUndefined();
      expect(repository.findBySlug).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it.each(['/auth/register', '/me', '/tenants', '/tenants/abc?x=1'])('allows %s', async (path) => {
      const { req } = await run('admin.localhost', {}, path);
      expect(req.platformAdmin).toBe(true);
    });

    it.each(['/stores', '/public/stores/x/catalog', '/orders', '/tenantsx', '/media/a.png'])(
      '404 TENANT_NOT_FOUND on %s (no leak of tenant-scoped routes)',
      async (path) => {
        await expect(run('admin.localhost', {}, path)).rejects.toMatchObject({ response: { code: 'TENANT_NOT_FOUND' } });
      },
    );
  });

  describe('auth routes', () => {
    it('go through without a tenant when the host does not resolve one', async () => {
      repository.findBySlug.mockResolvedValue(null);
      const { req, next } = await run('nope.localhost', {}, '/auth/login');
      expect(req.tenant).toBeUndefined();
      expect(req.platformAdmin).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });
});
