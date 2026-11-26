import { NotFoundException } from '@nestjs/common';
import { GetPlaylistUseCase } from 'src/screens/application/get-playlist.use-case';

describe('GetPlaylistUseCase', () => {
  const tenant = { tenant_id: 't1', slug: 'local1' } as any;
  const screenRepository = { findPlayerScreen: jest.fn(), getSchedule: jest.fn() };
  const playlistRepository = { listItems: jest.fn() };
  const screen = (over: object = {}) => ({ screen_id: 'sc1', store_id: 's1', store_name: 'Palermo', store_slug: 'palermo', ...over });
  const assignment = (over: object = {}) => ({
    playlist_id: 'pd', playlist_name: 'Default', days: null, start_time: null, end_time: null, ...over,
  });
  const item = (over: object = {}) => ({
    playlist_item_id: 'i1', playlist_id: 'pd', media_id: 'm1', type: 'image', file_path: 't1/content/m1.jpg',
    original_name: 'm1.jpg', duration_seconds: 10, ...over,
  });
  const useCase = () => new GetPlaylistUseCase(screenRepository as any, playlistRepository as any);

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.WEB_ORIGIN_TEMPLATE = 'http://{slug}.localhost:8081';
    screenRepository.findPlayerScreen.mockResolvedValue(screen());
    screenRepository.getSchedule.mockResolvedValue([assignment()]);
    playlistRepository.listItems.mockResolvedValue([item()]);
  });

  it('debe fallar con SCREEN_NOT_FOUND si el token no existe, está inactivo o es de otro tenant', async () => {
    screenRepository.findPlayerScreen.mockResolvedValue(null);

    const error: any = await useCase().execute(tenant, 'tok').catch((e) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.getResponse()).toMatchObject({ code: 'SCREEN_NOT_FOUND' });
    expect(screenRepository.findPlayerScreen).toHaveBeenCalledWith('t1', 'tok');
    expect(screenRepository.getSchedule).not.toHaveBeenCalled();
  });

  it('debe armar la respuesta con claves en el orden del contrato', async () => {
    const playlist = await useCase().execute(tenant, 'tok');

    expect(Object.keys(playlist)).toEqual(['version', 'poll_interval_seconds', 'store', 'qr_url', 'default', 'slots']);
    expect(playlist.poll_interval_seconds).toBe(30);
    expect(playlist.store).toEqual({ name: 'Palermo', slug: 'palermo' });
    expect(playlist.qr_url).toBe('http://local1.localhost:8081/palermo?src=sc1');
    expect(playlist.default).toEqual({
      items: [{ media_id: 'm1', type: 'image', url: '/media/t1/content/m1.jpg', duration_seconds: 10 }],
    });
    expect(playlist.slots).toEqual([]);
  });

  it('debe consultar los items de todas las playlists en una sola llamada, con el tenant', async () => {
    screenRepository.getSchedule.mockResolvedValue([
      assignment(),
      assignment({ playlist_id: 'pm', days: 31, start_time: '08:00:00', end_time: '12:00:00' }),
      assignment({ playlist_id: 'pm', days: 96, start_time: '10:00:00', end_time: '14:00:00' }),
    ]);

    await useCase().execute(tenant, 'tok');

    expect(screenRepository.getSchedule).toHaveBeenCalledWith('t1', 'sc1');
    expect(playlistRepository.listItems).toHaveBeenCalledTimes(1);
    expect(playlistRepository.listItems).toHaveBeenCalledWith('t1', ['pd', 'pm']);
  });

  it('debe incluir las franjas con días, hora HH:MM e items de su playlist, en el orden recibido', async () => {
    screenRepository.getSchedule.mockResolvedValue([
      assignment(),
      assignment({ playlist_id: 'pm', days: 31, start_time: '08:00:00', end_time: '12:00:00' }),
      assignment({ playlist_id: 'pn', days: 96, start_time: '18:30:00', end_time: '23:00:00' }),
    ]);
    playlistRepository.listItems.mockResolvedValue([
      item(),
      item({ playlist_id: 'pm', media_id: 'm2', type: 'video', file_path: 't1/content/m2.mp4', duration_seconds: 42 }),
      item({ playlist_id: 'pm', media_id: 'm1', duration_seconds: 5 }),
    ]);

    const playlist = await useCase().execute(tenant, 'tok');

    expect(playlist.slots).toEqual([
      {
        days: 31, start: '08:00', end: '12:00',
        items: [
          { media_id: 'm2', type: 'video', url: '/media/t1/content/m2.mp4', duration_seconds: 42 },
          { media_id: 'm1', type: 'image', url: '/media/t1/content/m1.jpg', duration_seconds: 5 },
        ],
      },
      { days: 96, start: '18:30', end: '23:00', items: [] },
    ]);
  });

  it('sin por defecto: default es null y las franjas se mantienen', async () => {
    screenRepository.getSchedule.mockResolvedValue([assignment({ playlist_id: 'pm', days: 1, start_time: '08:00:00', end_time: '12:00:00' })]);

    const playlist = await useCase().execute(tenant, 'tok');

    expect(playlist.default).toBeNull();
    expect(playlist.slots).toHaveLength(1);
  });

  it('sin asignaciones: default null, slots vacío, sin consultar items y con versión de 16 hex', async () => {
    screenRepository.getSchedule.mockResolvedValue([]);

    const playlist = await useCase().execute(tenant, 'tok');

    expect(playlist.default).toBeNull();
    expect(playlist.slots).toEqual([]);
    expect(playlist.version).toMatch(/^[0-9a-f]{16}$/);
    expect(playlistRepository.listItems).not.toHaveBeenCalled();
  });

  it('el mismo playlist en dos pantallas y franjas usa los mismos items', async () => {
    screenRepository.getSchedule.mockResolvedValue([
      assignment({ days: 1, start_time: '08:00:00', end_time: '09:00:00' }),
      assignment({ days: 2, start_time: '08:00:00', end_time: '09:00:00' }),
    ]);

    const playlist = await useCase().execute(tenant, 'tok');

    expect(playlist.slots[0].items).toEqual(playlist.slots[1].items);
    expect(playlist.slots[0].items).toHaveLength(1);
  });

  it('debe dar la misma versión con los mismos datos', async () => {
    const a = await useCase().execute(tenant, 'tok');
    const b = await useCase().execute(tenant, 'tok');

    expect(a.version).toBe(b.version);
  });

  it.each([
    ['cambia la duración de un item', () => playlistRepository.listItems.mockResolvedValue([item({ duration_seconds: 20 })])],
    ['se agrega un item', () => playlistRepository.listItems.mockResolvedValue([item(), item({ media_id: 'm2' })])],
    ['cambia el nombre del local', () => screenRepository.findPlayerScreen.mockResolvedValue(screen({ store_name: 'Centro' }))],
    ['cambia el slug del local', () => screenRepository.findPlayerScreen.mockResolvedValue(screen({ store_slug: 'centro' }))],
    ['se asigna otra playlist por defecto', () => screenRepository.getSchedule.mockResolvedValue([assignment({ playlist_id: 'pz' })])],
    ['se quita el por defecto', () => screenRepository.getSchedule.mockResolvedValue([])],
    ['se agrega una franja', () => screenRepository.getSchedule.mockResolvedValue([
      assignment(), assignment({ days: 1, start_time: '08:00:00', end_time: '09:00:00' }),
    ])],
  ])('debe cambiar la versión cuando %s', async (_name, change) => {
    const before = await useCase().execute(tenant, 'tok');
    change();
    const after = await useCase().execute(tenant, 'tok');

    expect(after.version).not.toBe(before.version);
  });

  it('debe cambiar la versión al reordenar los items', async () => {
    const [a, b] = [item({ media_id: 'ma' }), item({ media_id: 'mb' })];
    playlistRepository.listItems.mockResolvedValue([a, b]);
    const before = await useCase().execute(tenant, 'tok');
    playlistRepository.listItems.mockResolvedValue([b, a]);
    const after = await useCase().execute(tenant, 'tok');

    expect(after.version).not.toBe(before.version);
  });

  it('debe cambiar la versión al cambiar los días u horas de una franja', async () => {
    const slot = (over: object) => assignment({ playlist_id: 'pm', days: 1, start_time: '08:00:00', end_time: '09:00:00', ...over });
    screenRepository.getSchedule.mockResolvedValue([slot({})]);
    const base = (await useCase().execute(tenant, 'tok')).version;

    const versions = new Set([base]);
    for (const over of [{ days: 3 }, { start_time: '07:00:00' }, { end_time: '10:00:00' }]) {
      screenRepository.getSchedule.mockResolvedValue([slot(over)]);
      versions.add((await useCase().execute(tenant, 'tok')).version);
    }

    expect(versions.size).toBe(4);
  });
});
