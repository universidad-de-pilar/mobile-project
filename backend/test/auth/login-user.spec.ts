import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from 'src/auth/application/login.use-case';



describe('LoginUserUseCase', () => {
  let useCase: LoginUseCase;

  const usersRepository = {
    getByEmailWithPassword: jest.fn()
  };

  const passwordHasher = {
    compare: jest.fn()
  };

  const tokenService = {
    sign: jest.fn()
  };

  

  beforeEach(()=>{
    jest.clearAllMocks();

    useCase = new LoginUseCase(
      usersRepository as any,
      passwordHasher as any,
      tokenService as any,
    )
  })

  it('debe retornar un token cuando las credenciales son validas y el usuario esta activo', async ()=>{
    usersRepository.getByEmailWithPassword.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password_hash: 'hashed-password',
        is_active: true
    });

    passwordHasher.compare.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password_hash: 'hashed-password',
        is_active:true
    });

    passwordHasher.compare.mockResolvedValue(true);

    tokenService.sign.mockResolvedValue('jwt-token');

    const result = await useCase.execute({
        email: 'test@test.com',
        password: 'hashed-password'
    })

    expect(result.access_token)
        .toBe('jwt-token');
  });

  it('debe fallar cuando el user o pass son incorrectos', async ()=> {
      usersRepository.getByEmailWithPassword.mockResolvedValue({
        user_id: 'user-1',
        email: 'test@test.com',
        password_hash: 'hashed-password',
      });

      passwordHasher.compare.mockResolvedValue(false);

      await expect(
        useCase.execute({
            email: 'test@test.com',
            password: 'wrong-password'
        })
      ).rejects.toThrow(UnauthorizedException);
  });

  it('debe fallar cuando el user esta inactivo', async ()=> {
      usersRepository.getByEmailWithPassword.mockResolvedValue({
        user_id: 'user-1',
        email: 'test@test.com',
        password_hash: 'hashed-password',
        is_active: false
      });

      await expect(
        useCase.execute({
            email: 'test@test.com',
            password: 'Test!123#'
        })
      ).rejects.toThrow(UnauthorizedException);

      expect(passwordHasher.compare).not.toHaveBeenCalled();
      expect(tokenService.sign).not.toHaveBeenCalled();
  });

  it('debe arrojar unauthorized cuando el usuario no existe', async () => {
    usersRepository.getByEmailWithPassword.mockResolvedValue(null);

    await expect(
        useCase.execute({
            email: 'unknown@test.com',
            password: '1234567'
        })
    ).rejects.toThrow(UnauthorizedException)
  });
});
