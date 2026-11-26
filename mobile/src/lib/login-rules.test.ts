import { loginErrorMessage, validateLogin } from './login-rules';
import { ApiError } from './api';

describe('validateLogin', () => {
  it('accepts a valid email and an 8 character password', () => {
    expect(validateLogin(' a@b.co ', '12345678')).toEqual({});
  });

  it('requires the email and checks its shape', () => {
    expect(validateLogin('', '12345678').email).toBe('Ingresá tu email.');
    expect(validateLogin('nope', '12345678').email).toBe('Ingresá un email válido.');
  });

  it('requires at least 8 characters in the password', () => {
    expect(validateLogin('a@b.co', '1234567').password).toBe('La contraseña tiene al menos 8 caracteres.');
  });
});

describe('loginErrorMessage', () => {
  it('maps bad credentials, connection and non members', () => {
    expect(loginErrorMessage(new ApiError(401, null, 'x'))).toBe('Email o contraseña incorrectos.');
    expect(loginErrorMessage(new ApiError(0, null, 'x'))).toBe('No se pudo conectar con el servidor.');
    expect(loginErrorMessage(new ApiError(403, 'NOT_A_MEMBER', 'x'))).toBe('Tu usuario no pertenece a este local.');
  });

  it('falls back to a generic message', () => {
    expect(loginErrorMessage(new Error('boom'))).toBe('No se pudo ingresar. Probá de nuevo.');
  });
});
