import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateContentUseCase } from 'src/content/application/create-content.use-case';
import { DeleteContentUseCase } from 'src/content/application/delete-content.use-case';
import { ListContentUseCase } from 'src/content/application/list-content.use-case';
import { detectMedia } from 'src/content/domain/content-media';

const expectCode = async (promise: Promise<unknown>, type: any, code: string) => {
  const error: any = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(type);
  expect(error.getResponse()).toMatchObject({ code });
};

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(8)]);

const row = (over: object = {}) => ({
  media_id: 'm1', type: 'image', file_path: 't1/content/a.jpg', original_name: 'a.jpg',
  mime_type: 'image/jpeg', size_bytes: '100', duration_seconds: null,
  created_at: new Date(), updated_at: new Date(), ...over,
});

describe('Media library use cases', () => {
  const tenant = { tenant_id: 't1' } as any;
  const repo = { list: jest.fn(), create: jest.fn(), delete: jest.fn() };
  const storage = { save: jest.fn(), remove: jest.fn() };
  const probe = { durationSeconds: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    storage.save.mockResolvedValue('t1/content/new.jpg');
    repo.create.mockImplementation(async (_t, d) => row(d));
  });

  describe('detectMedia', () => {
    it('debe reconocer jpg y mp4 por su contenido', () => {
      expect(detectMedia(JPG)).toMatchObject({ type: 'image', ext: 'jpg', mime: 'image/jpeg' });
      expect(detectMedia(MP4)).toMatchObject({ type: 'video', ext: 'mp4', mime: 'video/mp4' });
    });

    it('debe rechazar otros formatos', () => {
      expect(detectMedia(Buffer.from('MZ-exe-file-bytes'))).toBeNull();
    });
  });

  describe('ListContentUseCase', () => {
    const useCase = () => new ListContentUseCase(repo as any);

    it('debe listar la biblioteca del tenant con url de /media y sin file_path', async () => {
      repo.list.mockResolvedValue([row(), row({ media_id: 'm2', type: 'video', duration_seconds: 12 })]);
      const result = await useCase().execute(tenant);

      expect(repo.list).toHaveBeenCalledWith('t1');
      expect(result[0]).toMatchObject({ media_id: 'm1', url: '/media/t1/content/a.jpg', size_bytes: 100, duration_seconds: null });
      expect(result[1]).toMatchObject({ type: 'video', duration_seconds: 12 });
      expect(result[0]).not.toHaveProperty('file_path');
    });
  });

  describe('CreateContentUseCase', () => {
    const useCase = () => new CreateContentUseCase(repo as any, storage as any, probe as any);
    const input = (over: object = {}) => ({ file: JPG, original_name: 'a.jpg', ...over });

    it('debe rechazar con 415 un formato desconocido sin guardar el archivo', async () => {
      const error: any = await useCase().execute(tenant, input({ file: Buffer.from('MZ-exe-file-bytes') })).catch((e) => e);
      expect(error.getStatus()).toBe(415);
      expect(error.getResponse()).toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('imagen: 5 242 880 bytes se acepta y 5 242 881 da 413 MEDIA_TOO_LARGE', async () => {
      const big = (n: number) => Buffer.concat([JPG, Buffer.alloc(n - JPG.length)]);
      await useCase().execute(tenant, input({ file: big(5_242_880) }));
      const error: any = await useCase().execute(tenant, input({ file: big(5_242_881) })).catch((e) => e);
      expect(error.getStatus()).toBe(413);
      expect(error.getResponse()).toMatchObject({ code: 'MEDIA_TOO_LARGE' });
    });

    it('imagen: se guarda en el tenant sin duración (se define en cada item de playlist)', async () => {
      const item = await useCase().execute(tenant, input());
      expect(repo.create).toHaveBeenCalledWith('t1', expect.objectContaining({
        type: 'image', file_path: 't1/content/new.jpg', original_name: 'a.jpg',
        mime_type: 'image/jpeg', size_bytes: JPG.length, duration_seconds: null,
      }));
      expect(item.url).toBe('/media/t1/content/new.jpg');
      expect(probe.durationSeconds).not.toHaveBeenCalled();
    });

    it('video: mide con ffprobe y guarda la duracion real', async () => {
      storage.save.mockResolvedValue('t1/content/v.mp4');
      probe.durationSeconds.mockResolvedValue(42);
      await useCase().execute(tenant, input({ file: MP4, original_name: 'v.mp4' }));

      expect(probe.durationSeconds).toHaveBeenCalledWith(MP4);
      expect(repo.create).toHaveBeenCalledWith('t1', expect.objectContaining({ type: 'video', mime_type: 'video/mp4', duration_seconds: 42 }));
    });

    it('video: exactamente 60 s se acepta; 61 da 422 VIDEO_TOO_LONG sin guardar el archivo', async () => {
      storage.save.mockResolvedValue('t1/content/v.mp4');
      probe.durationSeconds.mockResolvedValueOnce(60);
      await useCase().execute(tenant, input({ file: MP4 }));
      expect(storage.save).toHaveBeenCalledTimes(1);

      probe.durationSeconds.mockResolvedValueOnce(61);
      const error: any = await useCase().execute(tenant, input({ file: MP4 })).catch((e) => e);
      expect(error.getStatus()).toBe(422);
      expect(error.getResponse()).toMatchObject({ code: 'VIDEO_TOO_LONG' });
      expect(storage.save).toHaveBeenCalledTimes(1);
    });

    it('video: 52 428 801 bytes da 413 y 52 428 800 se acepta', async () => {
      probe.durationSeconds.mockResolvedValue(10);
      const big = (n: number) => Buffer.concat([MP4, Buffer.alloc(n - MP4.length)]);
      await useCase().execute(tenant, input({ file: big(52_428_800) }));
      const error: any = await useCase().execute(tenant, input({ file: big(52_428_801) })).catch((e) => e);
      expect(error.getStatus()).toBe(413);
    });

    it('video: ffprobe falla -> 422 MEDIA_UNREADABLE sin guardar el archivo', async () => {
      probe.durationSeconds.mockRejectedValue(new Error('boom'));
      const error: any = await useCase().execute(tenant, input({ file: MP4 })).catch((e) => e);
      expect(error.getStatus()).toBe(422);
      expect(error.getResponse()).toMatchObject({ code: 'MEDIA_UNREADABLE' });
      expect(storage.save).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('debe borrar el archivo si falla el insert', async () => {
      repo.create.mockRejectedValue(new Error('db'));
      await expect(useCase().execute(tenant, input())).rejects.toThrow('db');
      expect(storage.remove).toHaveBeenCalledWith('t1/content/new.jpg');
    });
  });

  describe('DeleteContentUseCase', () => {
    const useCase = () => new DeleteContentUseCase(repo as any, storage as any);

    it('debe fallar con 404 si no existe en el tenant', async () => {
      repo.delete.mockResolvedValue(null);
      await expectCode(useCase().execute(tenant, 'm1'), NotFoundException, 'MEDIA_NOT_FOUND');
      expect(repo.delete).toHaveBeenCalledWith('t1', 'm1');
      expect(storage.remove).not.toHaveBeenCalled();
    });

    it('debe fallar con 409 MEDIA_IN_USE si una playlist lo usa, y conservar el archivo', async () => {
      repo.delete.mockRejectedValue({ code: '23503' });
      await expectCode(useCase().execute(tenant, 'm1'), ConflictException, 'MEDIA_IN_USE');
      expect(storage.remove).not.toHaveBeenCalled();
    });

    it('debe propagar otros errores de la base', async () => {
      repo.delete.mockRejectedValue(new Error('db'));
      await expect(useCase().execute(tenant, 'm1')).rejects.toThrow('db');
    });

    it('debe borrar la fila y luego el archivo', async () => {
      repo.delete.mockResolvedValue(row());
      await useCase().execute(tenant, 'm1');
      expect(storage.remove).toHaveBeenCalledWith('t1/content/a.jpg');
    });
  });
});
