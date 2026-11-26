import { NotFoundException } from '@nestjs/common';
import { ClaimPairingUseCase, CreatePairingUseCase, PairScreenUseCase } from 'src/screens/application/screen-pairing.use-cases';
import { generateClaimSecret, generatePairingCode, normalizePairingCode, PAIRING_TTL_MS } from 'src/screens/domain/screen-pairing';

const expectCode = async (promise: Promise<unknown>, type: any, code: string) => {
  const error: any = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(type);
  expect(error.getResponse()).toMatchObject({ code });
};

describe('Screen pairing', () => {
  const tenant = { tenant_id: 't1', slug: 'local1' } as any;
  const pairingRepository = { create: jest.fn(), deleteExpired: jest.fn(), findClaim: jest.fn(), deleteClaim: jest.fn(), pair: jest.fn() };
  const screenRepository = { findOne: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    pairingRepository.create.mockResolvedValue(true);
    pairingRepository.pair.mockResolvedValue(true);
    screenRepository.findOne.mockResolvedValue({ screen_id: 'sc1' });
  });

  describe('domain', () => {
    it('debe generar un codigo de 6 caracteres sin los ambiguos 0, O, 1 e I', () => {
      for (let i = 0; i < 200; i++) expect(generatePairingCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    });

    it('debe generar un claim_secret base64url de 43 caracteres, distinto en cada llamada', () => {
      expect(generateClaimSecret()).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(generateClaimSecret()).not.toBe(generateClaimSecret());
    });

    it('debe normalizar el codigo con o sin guion, en minusculas y con espacios', () => {
      expect(normalizePairingCode(' abc-d23 ')).toBe('ABCD23');
      expect(normalizePairingCode('ABCD23')).toBe('ABCD23');
    });
  });

  describe('CreatePairingUseCase', () => {
    const useCase = () => new CreatePairingUseCase(pairingRepository as any);

    it('debe devolver codigo, claim_secret y vencimiento a 10 minutos, y limpiar los vencidos del tenant', async () => {
      const before = Date.now();
      const result = await useCase().execute(tenant);

      expect(result.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(result.claim_secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(result.expires_at.getTime()).toBeGreaterThanOrEqual(before + PAIRING_TTL_MS);
      expect(pairingRepository.deleteExpired).toHaveBeenCalledWith('t1');
      expect(pairingRepository.create).toHaveBeenCalledWith('t1', { code: result.code, claim_secret: result.claim_secret, expires_at: result.expires_at });
    });

    it('debe reintentar con otro codigo si el codigo ya existe', async () => {
      pairingRepository.create.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      const result = await useCase().execute(tenant);

      expect(pairingRepository.create).toHaveBeenCalledTimes(2);
      expect(pairingRepository.create.mock.calls[1][1].code).toBe(result.code);
    });
  });

  describe('ClaimPairingUseCase', () => {
    const useCase = () => new ClaimPairingUseCase(pairingRepository as any);

    it('debe fallar con PAIRING_NOT_FOUND si el claim_secret no existe, venció o es de otro tenant', async () => {
      pairingRepository.findClaim.mockResolvedValue(null);

      await expectCode(useCase().execute(tenant, 'x'), NotFoundException, 'PAIRING_NOT_FOUND');
      expect(pairingRepository.findClaim).toHaveBeenCalledWith('t1', 'x');
    });

    it('debe responder pending mientras nadie vincule el codigo', async () => {
      pairingRepository.findClaim.mockResolvedValue({ token: null });

      expect(await useCase().execute(tenant, 'x')).toEqual({ status: 'pending' });
      expect(pairingRepository.deleteClaim).not.toHaveBeenCalled();
    });

    it('debe devolver el token y borrar la fila al estar vinculado', async () => {
      pairingRepository.findClaim.mockResolvedValue({ token: 'tok' });

      expect(await useCase().execute(tenant, 'x')).toEqual({ status: 'paired', token: 'tok' });
      expect(pairingRepository.deleteClaim).toHaveBeenCalledWith('t1', 'x');
    });

    // Una pantalla inactiva llega del repositorio sin token: no se filtra ni se borra el vínculo.
    it('no debe entregar token si la pantalla vinculada esta inactiva', async () => {
      pairingRepository.findClaim.mockResolvedValue({ token: null });

      const result: any = await useCase().execute(tenant, 'x');

      expect(result.token).toBeUndefined();
      expect(pairingRepository.deleteClaim).not.toHaveBeenCalled();
    });
  });

  describe('PairScreenUseCase', () => {
    const useCase = () => new PairScreenUseCase(pairingRepository as any, screenRepository as any);

    it('debe fallar con SCREEN_NOT_FOUND si la pantalla no es del tenant, sin vincular', async () => {
      screenRepository.findOne.mockResolvedValue(null);

      await expectCode(useCase().execute(tenant, 'otra', 'ABCD23'), NotFoundException, 'SCREEN_NOT_FOUND');
      expect(pairingRepository.pair).not.toHaveBeenCalled();
    });

    it('debe vincular el codigo normalizado a la pantalla del tenant', async () => {
      await useCase().execute(tenant, 'sc1', ' abc-d23 ');

      expect(pairingRepository.pair).toHaveBeenCalledWith('t1', 'sc1', 'ABCD23');
    });

    it('debe fallar con PAIRING_CODE_INVALID si el codigo no existe, venció, es de otro tenant o ya fue vinculado', async () => {
      pairingRepository.pair.mockResolvedValue(false);

      await expectCode(useCase().execute(tenant, 'sc1', 'ABCD23'), NotFoundException, 'PAIRING_CODE_INVALID');
    });
  });
});
