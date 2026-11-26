export const SLUG_FORMAT = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const RESERVED_SLUGS = ['www', 'api', 'app', 'admin'];
export const ADMIN_SLUG = 'admin';

export function isValidSlug(slug: string): boolean {
  return SLUG_FORMAT.test(slug) && !RESERVED_SLUGS.includes(slug);
}

// Returns the single label before baseDomain, or null when the host is not {slug}.{baseDomain}.
export function extractSlugFromHost(host: string | undefined, baseDomain: string): string | null {
  const hostname = (host ?? '').toLowerCase().replace(/:\d+$/, '');
  const suffix = `.${baseDomain.toLowerCase()}`;
  if (!hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  return slug && !slug.includes('.') ? slug : null;
}
