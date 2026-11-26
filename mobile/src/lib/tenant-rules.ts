import { ApiError } from '@/lib/api';

// Mirrors the backend slug format and reserved list (database/scripts/001_schema.sql).
const SLUG = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const RESERVED = ['www', 'api', 'app', 'admin'];

export type NewTenantForm = { name: string; slug: string; ownerEmail: string; storeName: string; storeSlug: string };
export type NewTenantInput = { name: string; slug: string; owner_email: string; store: { name: string; slug: string } };
type Field = keyof NewTenantForm;

export const isTenantSuspended = (error: unknown) =>
  error instanceof ApiError && error.status === 503 && error.code === 'TENANT_SUSPENDED';

const slugError = (slug: string) =>
  !SLUG.test(slug) || RESERVED.includes(slug)
    ? 'Usá de 3 a 30 letras minúsculas, números o guiones (sin guion al inicio ni al final).'
    : undefined;

export function validateNewTenant(form: NewTenantForm): { input?: NewTenantInput; errors?: Partial<Record<Field, string>> } {
  const v = {
    name: form.name.trim(),
    slug: form.slug.trim(),
    ownerEmail: form.ownerEmail.trim(),
    storeName: form.storeName.trim(),
    storeSlug: form.storeSlug.trim(),
  };
  const nameError = (n: string) => (!n ? 'Ingresá el nombre.' : n.length > 150 ? 'Admite hasta 150 caracteres.' : undefined);
  const errors: Partial<Record<Field, string>> = {
    name: nameError(v.name),
    slug: slugError(v.slug),
    ownerEmail: /^\S+@\S+\.\S+$/.test(v.ownerEmail) ? undefined : 'Ingresá un email válido.',
    storeName: nameError(v.storeName),
    storeSlug: slugError(v.storeSlug),
  };
  const found = Object.fromEntries(Object.entries(errors).filter(([, m]) => m));
  if (Object.keys(found).length) return { errors: found };
  return { input: { name: v.name, slug: v.slug, owner_email: v.ownerEmail, store: { name: v.storeName, slug: v.storeSlug } } };
}

export function tenantErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'SLUG_TAKEN') return 'Ese slug ya está en uso.';
    if (error.code === 'INVALID_SLUG') return 'El slug es inválido o está reservado.';
    if (error.code === 'USER_NOT_FOUND') return 'El dueño debe registrarse antes con ese email.';
    if (error.status === 403) return 'Solo el administrador de la plataforma puede hacer esto.';
    if (error.status === 0) return 'No se pudo conectar con el servidor.';
  }
  return 'No se pudo completar la operación.';
}
