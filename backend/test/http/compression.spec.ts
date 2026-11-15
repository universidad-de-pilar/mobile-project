import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppLogger } from '../../src/logging/app-logger';
import { setupLogging } from '../../src/logging/setup-logging';
import { setupCompression } from '../../src/http/setup-compression';
import { PlayerController } from '../../src/screens/api/player.controller';
import { GetPlaylistUseCase } from '../../src/screens/application/get-playlist.use-case';
import { ClaimPairingUseCase, CreatePairingUseCase } from '../../src/screens/application/screen-pairing.use-cases';

@Controller()
class BigController {
  @Get('big') big() {
    return { items: Array.from({ length: 200 }, (_, i) => ({ id: i, name: `Product ${i}`, description: 'x'.repeat(40) })) };
  }
}

const playlist = { version: 'abc123', poll_interval_seconds: 30, store: { name: 'S', slug: 's' }, qr_url: 'u', items: [] };
const resource = { name: 'svc', version: '1', environment: 'test', node: 'h' };

describe('http compression', () => {
  let app: INestApplication;
  let lines: string[];

  beforeEach(async () => {
    lines = [];
    const logger = new AppLogger({ mode: 'json', resource, write: (l) => lines.push(l) });
    const mod = await Test.createTestingModule({
      controllers: [BigController, PlayerController],
      providers: [
        { provide: GetPlaylistUseCase, useValue: { execute: async () => playlist } },
        { provide: CreatePairingUseCase, useValue: {} },
        { provide: ClaimPairingUseCase, useValue: {} },
      ],
    }).compile();
    app = mod.createNestApplication();
    setupLogging(app, logger);
    setupCompression(app);
    app.use((req: any, _res: any, next: any) => { req.tenant = { tenant_id: 't1', slug: 'local1' }; next(); });
    await app.init();
  });

  afterEach(() => app.close());

  it('debe comprimir con gzip una respuesta JSON grande si el cliente lo acepta', async () => {
    const res = await request(app.getHttpServer()).get('/big').set('Accept-Encoding', 'gzip');

    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.body.items).toHaveLength(200);
  });

  it('no debe comprimir si el cliente no acepta gzip', async () => {
    const res = await request(app.getHttpServer()).get('/big').set('Accept-Encoding', 'identity');

    expect(res.headers['content-encoding']).toBeUndefined();
  });

  it('debe seguir respondiendo 304 al player con el ETag que el cliente recibio', async () => {
    const first = await request(app.getHttpServer()).get('/player/tok/playlist').set('Accept-Encoding', 'gzip');
    const etag = first.headers['etag'];

    const second = await request(app.getHttpServer())
      .get('/player/tok/playlist').set('Accept-Encoding', 'gzip').set('If-None-Match', etag);

    expect(first.status).toBe(200);
    expect(second.status).toBe(304);
  });

  it('debe seguir emitiendo un evento por peticion con la compresion activa', async () => {
    await request(app.getHttpServer()).get('/big').set('Accept-Encoding', 'gzip');
    await new Promise((r) => setTimeout(r, 30));

    const events = lines.map((l) => JSON.parse(l)).filter((l) => JSON.stringify(l).includes('HttpRequest'));
    expect(events).toHaveLength(1);
  });
});
