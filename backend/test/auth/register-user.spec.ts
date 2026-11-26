import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RegisterUseCase } from 'src/auth/application/register.use-case';
import { IUserRepository } from 'src/users/domain/user.repository';



describe('RegisterUserUseCase', () => {
  let useCase: RegisterUseCase;

  const usersRepository = {
    getByEmail: jest.fn(),
    create:jest.fn(),
    createRoot:jest.fn()
  }

  const passwordHasher = {
    hash: jest.fn()
  }

  beforeEach(()=>{
    jest.clearAllMocks();

    useCase = new RegisterUseCase(
      usersRepository as any,
      passwordHasher as any
    )
  })

  it('debe registrar un usuario', async ()=>{
    usersRepository.getByEmail.mockResolvedValue(null);

    passwordHasher.hash.mockResolvedValue('hash-password',);

    usersRepository.create.mockResolvedValue({
      user_id: 'user-id-created',
      email: 'test@test.com',
      first_name: 'test-name',
      last_name: 'test-lastname',
      created_at: 'datetime-now'
    });

    const result = await useCase.execute({
      email: 'test@test.com',
      password: 'Test!123#',
      first_name: 'test-name',
      last_name: 'test-lastname'
    });

    expect(usersRepository.getByEmail)
      .toHaveBeenCalledWith('test@test.com');

    expect(passwordHasher.hash)
      .toHaveBeenCalledWith('Test!123#');

    expect(usersRepository.create)
      .toHaveBeenCalled;
    
      expect(result.email)
        .toBe('test@test.com')
  });

  it('debe fallar cuando un email ya existe', async ()=> {
    usersRepository.getByEmail.mockResolvedValue({
      id:'existing-user',
      email: 'test@duplicado.com'
    });

    await expect(
      useCase.execute({
        email:'test@duplicado.com',
        password: 'Test!123#',
        first_name: 'test',
        last_name: 'duplicado'
      })
    ).rejects.toThrow(ConflictException);

    expect(passwordHasher.hash)
      .not
      .toHaveBeenCalled();

    expect(usersRepository.create)
      .not
      .toHaveBeenCalled();
      
  })

  describe('en el contexto admin', () => {
    const input = { email: 'root@test.com', password: 'Test!123#', first_name: 'Root', last_name: 'Admin' };

    beforeEach(() => {
      usersRepository.getByEmail.mockResolvedValue(null);
      passwordHasher.hash.mockResolvedValue('hash-password');
    });

    it('el primer registro crea el usuario con rol root', async () => {
      usersRepository.createRoot.mockResolvedValue({ user_id: 'u1', email: input.email });

      const result = await useCase.execute(input, true);

      expect(usersRepository.createRoot).toHaveBeenCalledWith({
        email: input.email, password_hash: 'hash-password', first_name: 'Root', last_name: 'Admin',
      });
      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(result.email).toBe(input.email);
    });

    it('rechaza con 403 ADMIN_ALREADY_EXISTS cuando ya existe un root', async () => {
      usersRepository.createRoot.mockResolvedValue(null);

      const error = await useCase.execute(input, true).catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.getResponse()).toMatchObject({ code: 'ADMIN_ALREADY_EXISTS' });
    });

    it('un email repetido sigue dando 409', async () => {
      usersRepository.getByEmail.mockResolvedValue({ email: input.email });

      await expect(useCase.execute(input, true)).rejects.toThrow(ConflictException);
      expect(usersRepository.createRoot).not.toHaveBeenCalled();
    });
  });
});
