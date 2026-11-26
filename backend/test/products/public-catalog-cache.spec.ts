import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PublicCatalogController } from '../../src/products/api/public-catalog.controller';
import { GetPublicCatalogUseCase } from '../../src/products/application/get-public-catalog.use-case';

const catalog = { categories: [{ category_id: 'c1', name: 'Pizzas', products: [] }] };

describe('public catalog caching', () => {
  let app: INestApplication;
  let execute: jest.Mock;

  beforeEach(async () => {
    execute = jest.fn().mockResolvedValue(catalog);
    const mod = await Test.createTestingModule({
      controllers: [PublicCatalogController],
      providers: [{ provide: GetPublicCatalogUseCase, useValue: { execute } }],
    }).compile();
    app = mod.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => { req.tenant = { tenant_id: 't1' }; next(); });
    await app.init();
  });

  afterEach(() => app.close());

  it('returns an ETag and a short public Cache-Control', async () => {
    const res = await request(app.getHttpServer()).get('/public/stores/s/catalog').expect(200);
    expect(res.headers.etag).toBeDefined();
    expect(res.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300');
    expect(res.body).toEqual(catalog);
  });

  it('varies by X-Tenant-Slug so shared caches never mix tenants', async () => {
    const res = await request(app.getHttpServer()).get('/public/stores/s/catalog').expect(200);
    expect(res.headers.vary).toMatch(/X-Tenant-Slug/i);
  });

  it('answers 304 with no body when If-None-Match matches', async () => {
    const first = await request(app.getHttpServer()).get('/public/stores/s/catalog');
    const res = await request(app.getHttpServer()).get('/public/stores/s/catalog').set('If-None-Match', first.headers.etag).expect(304);
    expect(res.text).toBe('');
  });

  it('changes the ETag when the catalog changes', async () => {
    const first = await request(app.getHttpServer()).get('/public/stores/s/catalog');
    execute.mockResolvedValue({ categories: [] });
    const res = await request(app.getHttpServer()).get('/public/stores/s/catalog').set('If-None-Match', first.headers.etag).expect(200);
    expect(res.headers.etag).not.toBe(first.headers.etag);
  });

  it('does not set cache headers on error responses', async () => {
    execute.mockRejectedValue(new NotFoundException());
    const res = await request(app.getHttpServer()).get('/public/stores/s/catalog').expect(404);
    expect(res.headers['cache-control']).toBeUndefined();
  });
});
