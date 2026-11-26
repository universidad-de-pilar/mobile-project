import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/api/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const tokenService = {
    verify: jest.fn(),
  };

  const buildContext = (headers: Record<string, string> = {}) => {
    const request: any = { headers };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    };
    return { context: context as any, request };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);

    guard = new JwtAuthGuard(reflector as any, tokenService as any);
  });

  it('debe permitir una ruta publica sin token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { context } = buildContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it('debe fallar cuando falta el header Authorization', async () => {
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe fallar cuando el header no es Bearer', async () => {
    const { context } = buildContext({ authorization: 'Basic abc123' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it('debe fallar cuando el token es invalido o expiro', async () => {
    tokenService.verify.mockRejectedValue(new Error('jwt expired'));
    const { context } = buildContext({ authorization: 'Bearer bad-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe permitir el acceso y setear request.user cuando el token es valido', async () => {
    const payload = { sub: 'user-1', email: 'test@test.com' };
    tokenService.verify.mockResolvedValue(payload);
    const { context, request } = buildContext({
      authorization: 'Bearer good-token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(tokenService.verify).toHaveBeenCalledWith('good-token');
    expect(request.user).toEqual(payload);
  });
});
