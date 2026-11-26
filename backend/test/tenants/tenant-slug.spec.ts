import { extractSlugFromHost, isValidSlug } from 'src/tenants/domain/tenant-slug';

describe('extractSlugFromHost', () => {
  it.each([
    ['local1.localhost', 'localhost', 'local1'],
    ['local1.localhost:3000', 'localhost', 'local1'],
    ['local1.mostrador.io', 'mostrador.io', 'local1'],
    ['Local1.Mostrador.IO', 'mostrador.io', 'local1'],
  ])('%s with base %s gives %s', (host, base, slug) => {
    expect(extractSlugFromHost(host, base)).toBe(slug);
  });

  it.each([
    ['localhost', 'localhost'],
    ['localhost:3000', 'localhost'],
    ['mostrador.io', 'mostrador.io'],
    ['192.168.0.10:3000', 'localhost'],
    ['local1.other.com', 'mostrador.io'],
    ['a.b.localhost', 'localhost'],
    ['', 'localhost'],
    [undefined, 'localhost'],
  ])('%s with base %s gives null', (host, base) => {
    expect(extractSlugFromHost(host, base)).toBeNull();
  });
});

describe('isValidSlug', () => {
  it.each(['abc', 'local1', 'a-b', 'a'.repeat(30)])('accepts %s', (s) => {
    expect(isValidSlug(s)).toBe(true);
  });

  it.each(['ab', 'a'.repeat(31), 'Local1', 'local_1', '-abc', 'abc-', 'www', 'api', 'app', 'admin'])(
    'rejects %s',
    (s) => {
      expect(isValidSlug(s)).toBe(false);
    },
  );
});
