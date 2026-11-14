import { ApiError } from './api';
import { employeeErrorMessage, storesSummary, toggleStore, validateEmployee } from './employee-rules';

const valid = { email: ' ana@acme.com ', firstName: ' Ana ', lastName: 'Pérez', password: 'Abcdef1!', storeIds: ['s1'] };

describe('validateEmployee', () => {
  it('accepts valid data and returns the trimmed API body', () => {
    expect(validateEmployee(valid)).toEqual({
      input: { email: 'ana@acme.com', first_name: 'Ana', last_name: 'Pérez', password: 'Abcdef1!', store_ids: ['s1'] },
    });
  });

  it('flags every invalid field', () => {
    const { errors } = validateEmployee({ email: 'x', firstName: 'ab', lastName: '', password: 'abc', storeIds: [] });
    expect(Object.keys(errors ?? {}).sort()).toEqual(['email', 'firstName', 'lastName', 'password', 'storeIds']);
  });

  it.each(['abcdef1!', 'ABCDEF1!', 'Abcdefg!', 'Abcdefg1', 'Ab1!'])('rejects the weak password %s', (password) => {
    expect(validateEmployee({ ...valid, password }).errors?.password).toBeDefined();
  });
});

describe('toggleStore', () => {
  it('adds and removes without mutating', () => {
    const ids = ['a'];
    expect(toggleStore(ids, 'b')).toEqual(['a', 'b']);
    expect(toggleStore(ids, 'a')).toEqual([]);
    expect(ids).toEqual(['a']);
  });
});

describe('storesSummary', () => {
  const stores = [{ store_id: 'a', name: 'Centro' }, { store_id: 'b', name: 'Norte' }];
  it.each([
    [[], 'Sin locales'],
    [['a'], 'Centro'],
    [['a', 'b'], 'Centro, Norte'],
    [['zzz'], 'Sin locales'],
  ])('summarizes %p', (ids, text) => {
    expect(storesSummary(ids, stores)).toBe(text);
  });
});

describe('employeeErrorMessage', () => {
  it.each([
    [new ApiError(409, 'EMAIL_TAKEN', 'x'), 'Ese email ya está registrado.'],
    [new ApiError(400, 'INVALID_STORES', 'x'), 'Algún local no pertenece a tu comercio.'],
    [new ApiError(409, 'CANNOT_DEACTIVATE_SELF', 'x'), 'No podés desactivarte a vos mismo.'],
    [new ApiError(403, 'EMPLOYEE_NOT_EDITABLE', 'x'), 'Este usuario no se puede editar.'],
    [new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'x'), 'El empleado ya no existe.'],
    [new ApiError(403, null, 'x'), 'No tenés permiso para hacer esto.'],
    [new ApiError(0, null, 'x'), 'No se pudo conectar con el servidor.'],
    [new Error('x'), 'No se pudo completar la operación.'],
  ])('maps %p', (error, message) => {
    expect(employeeErrorMessage(error)).toBe(message);
  });
});
