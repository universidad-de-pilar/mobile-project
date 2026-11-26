import { UnprocessableEntityException } from '@nestjs/common';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { LocalImageStorage } from 'src/products/infraestructure/local-image-storage';

const solid = (width: number, format: 'png' | 'jpeg' | 'webp' = 'png') =>
  sharp({ create: { width, height: 100, channels: 3, background: '#ff0000' } }).toFormat(format).toBuffer();

describe('LocalImageStorage', () => {
  let dir: string;
  const storage = new LocalImageStorage();

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'uploads-'));
    process.env.UPLOADS_DIR = dir;
  });
  afterEach(async () => {
    delete process.env.UPLOADS_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  const widthOf = async (imagePath: string) => (await sharp(await readFile(join(dir, imagePath))).metadata()).width;

  it('TC-036: debe reducir una imagen de 4000 px a un ancho de 1280 px como maximo', async () => {
    const imagePath = await storage.save('t1', await solid(4000), 'png');

    expect(imagePath).toMatch(/^t1\/products\/[0-9a-f-]{36}\.png$/);
    expect(await widthOf(imagePath)).toBeLessThanOrEqual(1280);
  });

  it('no debe agrandar una imagen chica y debe conservar el formato', async () => {
    const imagePath = await storage.save('t1', await solid(200, 'webp'), 'webp');

    expect(imagePath.endsWith('.webp')).toBe(true);
    expect(await widthOf(imagePath)).toBe(200);
  });

  it('debe fallar con MEDIA_UNREADABLE si los bytes no se pueden decodificar y no dejar archivos', async () => {
    const corrupt = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);

    const error: any = await storage.save('t1', corrupt, 'png').catch((e) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect(error.getResponse()).toMatchObject({ code: 'MEDIA_UNREADABLE' });
    await expect(stat(join(dir, 't1'))).rejects.toThrow();
  });

  it('debe borrar el archivo y tolerar que ya no exista', async () => {
    const imagePath = await storage.save('t1', await solid(50), 'png');

    await storage.remove(imagePath);
    await expect(stat(join(dir, imagePath))).rejects.toThrow();
    await expect(storage.remove(imagePath)).resolves.toBeUndefined();
  });
});
