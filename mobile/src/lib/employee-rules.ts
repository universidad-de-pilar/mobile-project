import { ApiError } from '@/lib/api';

export type EmployeeForm = { email: string; firstName: string; lastName: string; password: string; storeIds: string[] };
export type NewEmployeeInput = { email: string; first_name: string; last_name: string; password: string; store_ids: string[] };
type Field = keyof EmployeeForm;

// Mismas reglas que el registro del backend (create-user.dto.ts).
const PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const nameError = (name: string) =>
  name.trim().length < 3 ? 'Ingresá al menos 3 caracteres.' : undefined;

export function validateEmployee(form: EmployeeForm): { input?: NewEmployeeInput; errors?: Partial<Record<Field, string>> } {
  const v = { ...form, email: form.email.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim() };
  const errors: Partial<Record<Field, string>> = {
    email: /^\S+@\S+\.\S+$/.test(v.email) ? undefined : 'Ingresá un email válido.',
    firstName: nameError(v.firstName),
    lastName: nameError(v.lastName),
    password: PASSWORD.test(v.password)
      ? undefined
      : 'Mínimo 8 caracteres con mayúscula, minúscula, número y carácter especial.',
    storeIds: v.storeIds.length ? undefined : 'Elegí al menos un local.',
  };
  const found = Object.fromEntries(Object.entries(errors).filter(([, m]) => m));
  if (Object.keys(found).length) return { errors: found };
  return {
    input: { email: v.email, first_name: v.firstName, last_name: v.lastName, password: v.password, store_ids: v.storeIds },
  };
}

export const toggleStore = (ids: string[], id: string) =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];

export function storesSummary(ids: string[], stores: { store_id: string; name: string }[]) {
  const names = stores.filter((s) => ids.includes(s.store_id)).map((s) => s.name);
  return names.length ? names.join(', ') : 'Sin locales';
}

export function employeeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'EMAIL_TAKEN') return 'Ese email ya está registrado.';
    if (error.code === 'INVALID_STORES') return 'Algún local no pertenece a tu comercio.';
    if (error.code === 'CANNOT_DEACTIVATE_SELF') return 'No podés desactivarte a vos mismo.';
    if (error.code === 'EMPLOYEE_NOT_EDITABLE') return 'Este usuario no se puede editar.';
    if (error.code === 'EMPLOYEE_NOT_FOUND') return 'El empleado ya no existe.';
    if (error.status === 403) return 'No tenés permiso para hacer esto.';
    if (error.status === 0) return 'No se pudo conectar con el servidor.';
  }
  return 'No se pudo completar la operación.';
}
