import { NotFoundException } from '@nestjs/common';
import {
  CreatePlaylistUseCase, DeletePlaylistUseCase, GetPlaylistDetailUseCase, ListPlaylistScreensUseCase,
  ListPlaylistsUseCase, RenamePlaylistUseCase, SetPlaylistItemsUseCase,
} from 'src/content/application/playlist.use-cases';

const expectCode = async (promise: Promise<unknown>, type: any, code: string) => {
  const error: any = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(type);
  expect(error.getResponse()).toMatchObject({ code });
};

const playlist = (over: object = {}) => ({
  playlist_id: 'p1', name: 'Morning', item_count: '2', created_at: new Date(), updated_at: new Date(), ...over,
});
const itemRow = (over: object = {}) => ({
  playlist_item_id: 'i1', playlist_id: 'p1', media_id: 'm1', type: 'image', file_path: 't1/content/a.jpg',
  original_name: 'a.jpg', duration_seconds: 8, ...over,
});
const media = (id: string, type: 'image' | 'video') => ({ media_id: id, type });

describe('Playlist use cases', () => {
  const tenant = { tenant_id: 't1' } as any;
  const repo = {
    list: jest.fn(), findOne: jest.fn(), create: jest.fn(), rename: jest.fn(), delete: jest.fn(),
    listItems: jest.fn(), replaceItems: jest.fn(), listScreens: jest.fn(), findOwnedIds: jest.fn(),
  };
  const mediaRepo = { findMany: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    repo.findOne.mockResolvedValue(playlist());
    repo.listItems.mockResolvedValue([]);
  });

  describe('ListPlaylistsUseCase', () => {
    it('debe listar las playlists del tenant con el conteo como número', async () => {
      repo.list.mockResolvedValue([playlist()]);
      const result = await new ListPlaylistsUseCase(repo as any).execute(tenant);

      expect(repo.list).toHaveBeenCalledWith('t1');
      expect(result).toEqual([expect.objectContaining({ playlist_id: 'p1', name: 'Morning', item_count: 2 })]);
    });
  });

  describe('CreatePlaylistUseCase / RenamePlaylistUseCase', () => {
    it('debe crear en el tenant', async () => {
      repo.create.mockResolvedValue(playlist({ item_count: '0' }));
      const result = await new CreatePlaylistUseCase(repo as any).execute(tenant, 'Morning');

      expect(repo.create).toHaveBeenCalledWith('t1', 'Morning');
      expect(result.item_count).toBe(0);
    });

    it('debe renombrar y fallar con 404 PLAYLIST_NOT_FOUND si no es del tenant', async () => {
      repo.rename.mockResolvedValueOnce(playlist({ name: 'Night' })).mockResolvedValueOnce(null);
      const useCase = new RenamePlaylistUseCase(repo as any);

      expect((await useCase.execute(tenant, 'p1', 'Night')).name).toBe('Night');
      expect(repo.rename).toHaveBeenCalledWith('t1', 'p1', 'Night');
      await expectCode(useCase.execute(tenant, 'p9', 'x'), NotFoundException, 'PLAYLIST_NOT_FOUND');
    });
  });

  describe('DeletePlaylistUseCase', () => {
    it('debe fallar con 404 si no es del tenant', async () => {
      repo.delete.mockResolvedValue(false);
      await expectCode(new DeletePlaylistUseCase(repo as any).execute(tenant, 'p1'), NotFoundException, 'PLAYLIST_NOT_FOUND');
      expect(repo.delete).toHaveBeenCalledWith('t1', 'p1');
    });

    it('debe borrar', async () => {
      repo.delete.mockResolvedValue(true);
      await expect(new DeletePlaylistUseCase(repo as any).execute(tenant, 'p1')).resolves.toBeUndefined();
    });
  });

  describe('GetPlaylistDetailUseCase', () => {
    const useCase = () => new GetPlaylistDetailUseCase(repo as any);

    it('debe fallar con 404 si no es del tenant, sin leer los items', async () => {
      repo.findOne.mockResolvedValue(null);
      await expectCode(useCase().execute(tenant, 'p1'), NotFoundException, 'PLAYLIST_NOT_FOUND');
      expect(repo.findOne).toHaveBeenCalledWith('t1', 'p1');
      expect(repo.listItems).not.toHaveBeenCalled();
    });

    it('debe devolver los items en orden con url y la duración efectiva', async () => {
      repo.listItems.mockResolvedValue([itemRow(), itemRow({ playlist_item_id: 'i2', media_id: 'm2', type: 'video', duration_seconds: 30 })]);
      const result = await useCase().execute(tenant, 'p1');

      expect(repo.listItems).toHaveBeenCalledWith('t1', ['p1']);
      expect(result.items).toEqual([
        { playlist_item_id: 'i1', media_id: 'm1', type: 'image', url: '/media/t1/content/a.jpg', original_name: 'a.jpg', duration_seconds: 8 },
        { playlist_item_id: 'i2', media_id: 'm2', type: 'video', url: '/media/t1/content/a.jpg', original_name: 'a.jpg', duration_seconds: 30 },
      ]);
      expect(result).toMatchObject({ playlist_id: 'p1', name: 'Morning' });
    });
  });

  describe('SetPlaylistItemsUseCase', () => {
    const useCase = () => new SetPlaylistItemsUseCase(repo as any, mediaRepo as any);

    it('debe fallar con 404 PLAYLIST_NOT_FOUND si la playlist no es del tenant', async () => {
      repo.findOne.mockResolvedValue(null);
      await expectCode(useCase().execute(tenant, 'p1', []), NotFoundException, 'PLAYLIST_NOT_FOUND');
      expect(repo.replaceItems).not.toHaveBeenCalled();
    });

    it('debe fallar con 404 MEDIA_NOT_FOUND si algún medio no es del tenant', async () => {
      mediaRepo.findMany.mockResolvedValue([media('m1', 'image')]);
      await expectCode(
        useCase().execute(tenant, 'p1', [{ media_id: 'm1', duration_seconds: 5 }, { media_id: 'mX', duration_seconds: 5 }]),
        NotFoundException, 'MEDIA_NOT_FOUND',
      );
      expect(mediaRepo.findMany).toHaveBeenCalledWith('t1', ['m1', 'mX']);
      expect(repo.replaceItems).not.toHaveBeenCalled();
    });

    it('imagen sin duración: 422 DURATION_REQUIRED', async () => {
      mediaRepo.findMany.mockResolvedValue([media('m1', 'image')]);
      const error: any = await useCase().execute(tenant, 'p1', [{ media_id: 'm1' }]).catch((e) => e);
      expect(error.getStatus()).toBe(422);
      expect(error.getResponse()).toMatchObject({ code: 'DURATION_REQUIRED' });
      expect(repo.replaceItems).not.toHaveBeenCalled();
    });

    it('video con duración: 422 DURATION_NOT_ALLOWED', async () => {
      mediaRepo.findMany.mockResolvedValue([media('v1', 'video')]);
      const error: any = await useCase().execute(tenant, 'p1', [{ media_id: 'v1', duration_seconds: 10 }]).catch((e) => e);
      expect(error.getStatus()).toBe(422);
      expect(error.getResponse()).toMatchObject({ code: 'DURATION_NOT_ALLOWED' });
      expect(repo.replaceItems).not.toHaveBeenCalled();
    });

    it('debe permitir el mismo medio varias veces con duraciones distintas y guardar el video sin duración', async () => {
      mediaRepo.findMany.mockResolvedValue([media('m1', 'image'), media('v1', 'video')]);
      const items = [
        { media_id: 'm1', duration_seconds: 5 },
        { media_id: 'v1' },
        { media_id: 'm1', duration_seconds: 20 },
      ];
      await useCase().execute(tenant, 'p1', items);

      expect(mediaRepo.findMany).toHaveBeenCalledWith('t1', ['m1', 'v1']);
      expect(repo.replaceItems).toHaveBeenCalledWith('t1', 'p1', [
        { media_id: 'm1', duration_seconds: 5 },
        { media_id: 'v1', duration_seconds: null },
        { media_id: 'm1', duration_seconds: 20 },
      ]);
    });

    it('debe aceptar la lista vacía para vaciar la playlist', async () => {
      const result = await useCase().execute(tenant, 'p1', []);
      expect(repo.replaceItems).toHaveBeenCalledWith('t1', 'p1', []);
      expect(result.items).toEqual([]);
    });
  });

  describe('ListPlaylistScreensUseCase', () => {
    const useCase = () => new ListPlaylistScreensUseCase(repo as any);

    it('debe fallar con 404 si la playlist no es del tenant', async () => {
      repo.findOne.mockResolvedValue(null);
      await expectCode(useCase().execute(tenant, 'p1'), NotFoundException, 'PLAYLIST_NOT_FOUND');
      expect(repo.listScreens).not.toHaveBeenCalled();
    });

    it('debe listar pantallas de cualquier local con su asignación, hora como HH:MM', async () => {
      repo.listScreens.mockResolvedValue([
        { screen_id: 's1', screen_name: 'Entrada', store_id: 'st1', store_name: 'Palermo', days: null, start_time: null, end_time: null },
        { screen_id: 's2', screen_name: 'Barra', store_id: 'st2', store_name: 'Centro', days: 31, start_time: '08:00:00', end_time: '12:30:00' },
      ]);
      const result = await useCase().execute(tenant, 'p1');

      expect(repo.listScreens).toHaveBeenCalledWith('t1', 'p1');
      expect(result).toEqual([
        { screen_id: 's1', screen_name: 'Entrada', store_id: 'st1', store_name: 'Palermo', days: null, start: null, end: null },
        { screen_id: 's2', screen_name: 'Barra', store_id: 'st2', store_name: 'Centro', days: 31, start: '08:00', end: '12:30' },
      ]);
    });
  });
});
