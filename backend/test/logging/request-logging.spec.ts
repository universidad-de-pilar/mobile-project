import { BadRequestException, Body, Controller, Get, INestApplication, Post, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import http from 'node:http';
import { AppLogger } from '../../src/logging/app-logger';
import { setupLogging } from '../../src/logging/setup-logging';

@Controller()
class DemoController {
  @Get('ok') ok() { return { ok: true }; }
  @Post('login') login(@Body() body: any) { return { token: 'jwt-secret-value', echo: body.email }; }
  @Get('search') search(@Query('token') t: string) { return { t }; }
  @Get('boom') boom() { throw new Error('kaboom'); }
  @Get('slow') slow() { return new Promise((r) => setTimeout(() => r({ ok: true }), 300)); }
  @Get('bad') bad() { throw new BadRequestException('nope'); }
}

const resource = { name: 'svc', version: '1', environment: 'test', node: 'h' };
const sleep = () => new Promise((r) => setTimeout(r, 30));

async function build() {
  const lines: string[] = [];
  const logger = new AppLogger({ mode: 'json', resource, write: (l) => lines.push(l) });
  const mod = await Test.createTestingModule({ controllers: [DemoController] }).compile();
  const app: INestApplication = mod.createNestApplication();
  setupLogging(app, logger);
  // Stands in for TenantMiddleware, which sets req.tenant.
  app.use((req: any, _res: any, next: any) => {
    const slug = req.headers['x-tenant-slug'];
    if (slug) req.tenant = { tenant_id: `tenant-${slug}` };
    next();
  });
  await app.init();
  return { app, lines };
}

const parsed = (lines: string[]) => lines.map((l) => JSON.parse(l));

describe('request logging', () => {
  let app: INestApplication;
  afterEach(() => app?.close());

  it('emits one wide event per request with tenant and timing', async () => {
    const ctx = await build();
    app = ctx.app;
    await request(app.getHttpServer()).get('/ok').set('x-tenant-slug', 'acme').expect(200);
    await sleep();
    const [e] = parsed(ctx.lines);
    expect(ctx.lines).toHaveLength(1);
    expect(e.message).toBe('GET /ok 200 OK');
    expect(e['log.level']).toBe('INFO');
    expect(e.events).toMatchObject({
      method: 'GET', path: '/ok', status_code: 200, outcome: 'success', tenant_id: 'tenant-acme',
    });
    expect(typeof e.events.duration_ms).toBe('number');
  });

  it('reuses a valid x-request-id and generates one otherwise', async () => {
    const ctx = await build();
    app = ctx.app;
    const a = await request(app.getHttpServer()).get('/ok').set('x-request-id', 'client-id-123');
    const b = await request(app.getHttpServer()).get('/ok').set('x-request-id', 'bad id with spaces!');
    const c = await request(app.getHttpServer()).get('/ok');
    await sleep();
    expect(a.headers['x-request-id']).toBe('client-id-123');
    expect(b.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(c.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(parsed(ctx.lines).map((e) => e.events.request_id)).toEqual([
      'client-id-123', b.headers['x-request-id'], c.headers['x-request-id'],
    ]);
  });

  it('records error fields on unhandled errors and answers 500', async () => {
    const ctx = await build();
    app = ctx.app;
    await request(app.getHttpServer()).get('/boom').expect(500);
    await sleep();
    const [e] = parsed(ctx.lines);
    expect(ctx.lines).toHaveLength(1);
    expect(e['log.level']).toBe('ERROR');
    expect(e['error.type']).toBe('Error');
    expect(e['error.message']).toBe('kaboom');
    expect(e['error.stack_trace']).toContain('kaboom');
    expect(e.events.outcome).toBe('error');
  });

  it('keeps Nest default body for plain errors', async () => {
    const ctx = await build();
    app = ctx.app;
    const res = await request(app.getHttpServer()).get('/boom').expect(500);
    expect(res.text).toBe('{"statusCode":500,"message":"Internal server error"}');
  });

  it('keeps HttpException 4xx body and logs it as INFO', async () => {
    const ctx = await build();
    app = ctx.app;
    const res = await request(app.getHttpServer()).get('/bad').expect(400);
    expect(res.body).toEqual({ statusCode: 400, message: 'nope', error: 'Bad Request' });
    await sleep();
    expect(parsed(ctx.lines)[0]['log.level']).toBe('INFO');
  });

  it('keeps http-errors status (413) and does not log it as ERROR', async () => {
    const ctx = await build();
    app = ctx.app;
    const res = await request(app.getHttpServer()).post('/login').send({ email: 'x'.repeat(200 * 1024) }).expect(413);
    expect(res.text).toBe('{"statusCode":413,"message":"request entity too large"}');
    await sleep();
    const [e] = parsed(ctx.lines);
    expect(e['log.level']).toBe('INFO');
    expect(e).not.toHaveProperty('error.type');
  });

  it('records a client abort as 499', async () => {
    const ctx = await build();
    app = ctx.app;
    await app.listen(0);
    const { port } = app.getHttpServer().address();
    const req = http.get({ port, path: '/slow' });
    req.on('error', () => {});
    setTimeout(() => req.destroy(), 50);
    await new Promise((r) => setTimeout(r, 150));
    const [e] = parsed(ctx.lines);
    expect(e.events).toMatchObject({ status_code: 499, outcome: 'error' });
  });

  // TC-127: every line is JSON with request_id and tenant_id and leaks no secrets
  it('logs 10 varied requests as JSON with request_id and tenant_id and no secrets', async () => {
    const ctx = await build();
    app = ctx.app;
    await app.listen(0); // one listening server shared by every request
    const s = () => request(app.getHttpServer());
    const requests = [
      s().get('/ok'),
      s().get('/ok').set('x-tenant-slug', 'a'),
      s().get('/ok').set('x-tenant-slug', 'b').set('x-request-id', 'rid-abcdef'),
      s().post('/login').send({ email: 'u@x.com', password: 'hunter2-pass' }),
      s().post('/login').set('x-tenant-slug', 'a').send({ email: 'u@x.com', password: 'hunter2-pass' }),
      s().get('/search?token=query-token-value'),
      s().get('/missing'),
      s().get('/boom'),
      s().get('/ok').set('Authorization', 'Bearer header-token-value'),
      s().get('/ok').set('Cookie', 'session=cookie-secret-value'),
    ];
    for (const r of requests) await r; // supertest sends on await
    await sleep();
    expect(ctx.lines).toHaveLength(10);
    for (const e of parsed(ctx.lines)) {
      expect(e.events.request_id).toEqual(expect.any(String));
      expect(e.events).toHaveProperty('tenant_id');
    }
    const all = ctx.lines.join('');
    for (const secret of ['hunter2-pass', 'query-token-value', 'header-token-value', 'cookie-secret-value', 'jwt-secret-value']) {
      expect(all).not.toContain(secret);
    }
  });
});
