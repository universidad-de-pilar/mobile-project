import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { GetScreenScheduleUseCase, SetScreenScheduleUseCase } from 'src/screens/application/screen-schedule.use-cases';
import { findOverlap, isValidSlot, slotsOverlap } from 'src/screens/domain/screen-schedule';

const MON = 1, TUE = 2, WED = 4, SAT = 32, SUN = 64;
const slot = (days: number, start: string, end: string, playlist_id = 'p1') => ({ playlist_id, days, start, end });

const expectCode = async (promise: Promise<unknown>, type: any, code: string) => {
  const error: any = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(type);
  expect(error.getResponse()).toMatchObject({ code });
};

describe('Screen schedule rules', () => {
  describe('slotsOverlap', () => {
    it('debe solapar si comparten un día y los intervalos se cruzan', () => {
      expect(slotsOverlap(slot(MON | TUE, '08:00', '12:00'), slot(TUE | WED, '11:00', '14:00'))).toBe(true);
    });

    it('debe solapar si un intervalo contiene al otro', () => {
      expect(slotsOverlap(slot(MON, '08:00', '18:00'), slot(MON, '10:00', '11:00'))).toBe(true);
    });

    it('no debe solapar si solo se tocan en el borde (el fin es exclusivo)', () => {
      expect(slotsOverlap(slot(MON, '08:00', '12:00'), slot(MON, '12:00', '14:00'))).toBe(false);
      expect(slotsOverlap(slot(MON, '12:00', '14:00'), slot(MON, '08:00', '12:00'))).toBe(false);
    });

    it('no debe solapar si no comparten ningún día aunque el horario coincida', () => {
      expect(slotsOverlap(slot(MON | TUE, '08:00', '12:00'), slot(SAT | SUN, '08:00', '12:00'))).toBe(false);
    });

    it('debe solapar con horarios idénticos y un solo día en común', () => {
      expect(slotsOverlap(slot(MON | SAT, '08:00', '12:00'), slot(SAT | SUN, '08:00', '12:00'))).toBe(true);
    });
  });

  describe('findOverlap', () => {
    it('debe devolver null sin solapes', () => {
      expect(findOverlap([slot(MON, '08:00', '12:00'), slot(MON, '12:00', '18:00'), slot(TUE, '08:00', '18:00')])).toBeNull();
      expect(findOverlap([])).toBeNull();
    });

    it('debe devolver los índices del primer par que se solapa', () => {
      expect(findOverlap([slot(MON, '08:00', '12:00'), slot(TUE, '08:00', '12:00'), slot(MON, '11:00', '13:00')])).toEqual([0, 2]);
    });
  });

  describe('isValidSlot', () => {
    it.each([
      [slot(1, '08:00', '08:01'), true],
      [slot(127, '00:00', '23:59'), true],
      [slot(1, '12:00', '12:00'), false],
      [slot(1, '12:00', '08:00'), false],
      [slot(0, '08:00', '12:00'), false],
      [slot(128, '08:00', '12:00'), false],
    ])('%j -> %s', (candidate, expected) => {
      expect(isValidSlot(candidate)).toBe(expected);
    });
  });
});

describe('Screen schedule use cases', () => {
  const tenant = { tenant_id: 't1' } as any;
  const screenRepository = { findOne: jest.fn(), getSchedule: jest.fn(), replaceSchedule: jest.fn() };
  const playlistRepository = { findOwnedIds: jest.fn() };
  const row = (over: object = {}) => ({
    playlist_id: 'p1', playlist_name: 'Morning', days: null, start_time: null, end_time: null, ...over,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    screenRepository.findOne.mockResolvedValue({ screen_id: 'sc1' });
    screenRepository.getSchedule.mockResolvedValue([]);
    playlistRepository.findOwnedIds.mockImplementation(async (_t, ids) => ids);
  });

  describe('GetScreenScheduleUseCase', () => {
    const useCase = () => new GetScreenScheduleUseCase(screenRepository as any);

    it('debe fallar con 404 SCREEN_NOT_FOUND si la pantalla no es del tenant', async () => {
      screenRepository.findOne.mockResolvedValue(null);
      await expectCode(useCase().execute(tenant, 'sc1'), NotFoundException, 'SCREEN_NOT_FOUND');
      expect(screenRepository.findOne).toHaveBeenCalledWith('t1', 'sc1');
      expect(screenRepository.getSchedule).not.toHaveBeenCalled();
    });

    it('sin asignaciones: sin por defecto y sin franjas', async () => {
      expect(await useCase().execute(tenant, 'sc1')).toEqual({ default_playlist_id: null, slots: [] });
    });

    it('debe separar el por defecto de las franjas, con hora como HH:MM', async () => {
      screenRepository.getSchedule.mockResolvedValue([
        row({ playlist_id: 'pd', playlist_name: 'Default' }),
        row({ playlist_id: 'pm', playlist_name: 'Morning', days: 31, start_time: '08:00:00', end_time: '12:30:00' }),
      ]);

      expect(await useCase().execute(tenant, 'sc1')).toEqual({
        default_playlist_id: 'pd',
        slots: [{ playlist_id: 'pm', playlist_name: 'Morning', days: 31, start: '08:00', end: '12:30' }],
      });
      expect(screenRepository.getSchedule).toHaveBeenCalledWith('t1', 'sc1');
    });
  });

  describe('SetScreenScheduleUseCase', () => {
    const useCase = () => new SetScreenScheduleUseCase(screenRepository as any, playlistRepository as any);

    it('debe fallar con 404 SCREEN_NOT_FOUND si la pantalla no es del tenant, sin guardar', async () => {
      screenRepository.findOne.mockResolvedValue(null);
      await expectCode(useCase().execute(tenant, 'sc1', { default_playlist_id: 'p1', slots: [] }), NotFoundException, 'SCREEN_NOT_FOUND');
      expect(screenRepository.replaceSchedule).not.toHaveBeenCalled();
    });

    it('debe fallar con 422 INVALID_SLOT si el fin no es posterior al inicio', async () => {
      await expectCode(
        useCase().execute(tenant, 'sc1', { slots: [slot(MON, '12:00', '12:00')] }),
        UnprocessableEntityException, 'INVALID_SLOT',
      );
      expect(screenRepository.replaceSchedule).not.toHaveBeenCalled();
    });

    it('debe fallar con 422 SLOT_OVERLAP indicando las franjas que chocan', async () => {
      const error: any = await useCase().execute(tenant, 'sc1', {
        slots: [slot(MON, '08:00', '12:00'), slot(TUE, '08:00', '12:00'), slot(MON, '11:00', '13:00', 'p2')],
      }).catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.getResponse()).toMatchObject({ code: 'SLOT_OVERLAP', details: { slots: [0, 2] } });
      expect(screenRepository.replaceSchedule).not.toHaveBeenCalled();
    });

    it('debe permitir franjas contiguas, el mismo playlist en varias franjas y días distintos a la misma hora', async () => {
      await useCase().execute(tenant, 'sc1', {
        default_playlist_id: 'pd',
        slots: [slot(MON, '08:00', '12:00'), slot(MON, '12:00', '18:00'), slot(SAT | SUN, '08:00', '12:00')],
      });

      expect(screenRepository.replaceSchedule).toHaveBeenCalledWith('t1', 'sc1', {
        default_playlist_id: 'pd',
        slots: [slot(MON, '08:00', '12:00'), slot(MON, '12:00', '18:00'), slot(SAT | SUN, '08:00', '12:00')],
      });
    });

    it('debe fallar con 404 PLAYLIST_NOT_FOUND si alguna playlist es de otro tenant, sin guardar', async () => {
      playlistRepository.findOwnedIds.mockResolvedValue(['pd']);
      await expectCode(
        useCase().execute(tenant, 'sc1', { default_playlist_id: 'pd', slots: [slot(MON, '08:00', '12:00', 'pX')] }),
        NotFoundException, 'PLAYLIST_NOT_FOUND',
      );
      expect(playlistRepository.findOwnedIds).toHaveBeenCalledWith('t1', ['pd', 'pX']);
      expect(screenRepository.replaceSchedule).not.toHaveBeenCalled();
    });

    it('sin por defecto: guarda default_playlist_id null y devuelve la agenda guardada', async () => {
      screenRepository.getSchedule.mockResolvedValue([row({ playlist_id: 'p1', days: 1, start_time: '08:00:00', end_time: '09:00:00' })]);

      const result = await useCase().execute(tenant, 'sc1', { slots: [slot(MON, '08:00', '09:00')] });

      expect(screenRepository.replaceSchedule).toHaveBeenCalledWith('t1', 'sc1', {
        default_playlist_id: null, slots: [slot(MON, '08:00', '09:00')],
      });
      expect(result).toEqual({
        default_playlist_id: null,
        slots: [{ playlist_id: 'p1', playlist_name: 'Morning', days: 1, start: '08:00', end: '09:00' }],
      });
    });

    it('agenda vacía: quita todo sin consultar playlists', async () => {
      await useCase().execute(tenant, 'sc1', { default_playlist_id: null, slots: [] });

      expect(playlistRepository.findOwnedIds).not.toHaveBeenCalled();
      expect(screenRepository.replaceSchedule).toHaveBeenCalledWith('t1', 'sc1', { default_playlist_id: null, slots: [] });
    });
  });
});
