import { ApiError } from '@/lib/api';

export function validateLogin(email: string, password: string): { email?: string; password?: string } {
  const errors: { email?: string; password?: string } = {};
  const trimmed = email.trim();
  if (!trimmed) errors.email = 'Ingresá tu email.';
  else if (!/^\S+@\S+\.\S+$/.test(trimmed)) errors.email = 'Ingresá un email válido.';
  if (password.length < 8) errors.password = 'La contraseña tiene al menos 8 caracteres.';
  return errors;
}

export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Email o contraseña incorrectos.';
    if (error.status === 0) return 'No se pudo conectar con el servidor.';
    if (error.status === 403) return 'Tu usuario no pertenece a este local.';
  }
  return 'No se pudo ingresar. Probá de nuevo.';
}
