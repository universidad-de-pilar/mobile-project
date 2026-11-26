import { ApiError } from './api';
import { isTenantSuspended, tenantErrorMessage, validateNewTenant } from './tenant-rules';

const valid = {
  name: ' Acme ',
  slug: 'acme',
  ownerEmail: ' dueno@acme.com ',
  storeName: 'Centro',
  storeSlug: 'centro',
};

describe('isTenantSuspended', () => {
  it('detects the 503 TENANT_SUSPENDED error', () => {
    expect(isTenantSuspended(new ApiError(503, 'TENANT_SUSPENDED', 'x'))).toBe(true);
  });

  it.each([
    new ApiError(503, null, 'x'),
    new ApiError(404, 'TENANT_NOT_FOUND', 'x'),
    new ApiError(0, null, 'x'),
    new Error('x'),
    null,
  ])('ignores other errors: %p', (error) => {
    expect(isTenantSuspended(error)).toBe(false);
  });
});

describe('validateNewTenant', () => {
  it('accepts valid data and returns the trimmed API body', () => {
    expect(validateNewTenant(valid)).toEqual({
      input: {
        name: 'Acme',
        slug: 'acme',
        owner_email: 'dueno@acme.com',
        store: { name: 'Centro', slug: 'centro' },
      },
    });
  });

  it('requires every field', () => {
    const { errors } = validateNewTenant({ name: '', slug: '', ownerEmail: '', storeName: '', storeSlug: '' });
    expect(Object.keys(errors ?? {}).sort()).toEqual(['name', 'ownerEmail', 'slug', 'storeName', 'storeSlug']);
  });

  it.each(['ab', 'Acme', '-acme', 'acme-', 'a_b', 'a'.repeat(31), 'admin', 'www', 'api', 'app'])(
    'rejects the slug %s',
    (slug) => {
      expect(validateNewTenant({ ...valid, slug }).errors?.slug).toBeDefined();
    },
  );

  it('rejects an invalid email and a name over 150 characters', () => {
    expect(validateNewTenant({ ...valid, ownerEmail: 'nope' }).errors?.ownerEmail).toBeDefined();
    expect(validateNewTenant({ ...valid, name: 'a'.repeat(151) }).errors?.name).toBeDefined();
  });
});

describe('tenantErrorMessage', () => {
  it.each([
    [new ApiError(409, 'SLUG_TAKEN', 'x'), 'Ese slug ya está en uso.'],
    [new ApiError(400, 'INVALID_SLUG', 'x'), 'El slug es inválido o está reservado.'],
    [new ApiError(404, 'USER_NOT_FOUND', 'x'), 'El dueño debe registrarse antes con ese email.'],
    [new ApiError(403, null, 'x'), 'Solo el administrador de la plataforma puede hacer esto.'],
    [new ApiError(0, null, 'x'), 'No se pudo conectar con el servidor.'],
    [new Error('x'), 'No se pudo completar la operación.'],
  ])('maps %p', (error, message) => {
    expect(tenantErrorMessage(error)).toBe(message);
  });
});
