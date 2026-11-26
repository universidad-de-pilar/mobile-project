import { tenantFromHost } from './tenant';

describe('tenantFromHost', () => {
  it('extracts the subdomain', () => {
    expect(tenantFromHost('local1.localhost', 'localhost')).toBe('local1');
    expect(tenantFromHost('Local1.mostrador.io', 'mostrador.io')).toBe('local1');
  });

  it.each([
    ['localhost', 'localhost'],
    ['www.mostrador.io', 'mostrador.io'],
    ['127.0.0.1', 'localhost'],
    ['a.b.mostrador.io', 'mostrador.io'],
    ['app.azurewebsites.net', 'mostrador.io'],
    ['evilmostrador.io', 'mostrador.io'],
  ])('returns null for %s', (host, base) => {
    expect(tenantFromHost(host, base)).toBeNull();
  });
});
