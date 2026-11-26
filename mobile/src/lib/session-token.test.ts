import { isTokenExpired } from './session-token';

const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

describe('isTokenExpired', () => {
  const now = 1_000_000_000;

  it('is false before exp', () => {
    expect(isTokenExpired(jwt({ exp: now / 1000 + 60 }), now)).toBe(false);
  });

  it('is true at or after exp', () => {
    expect(isTokenExpired(jwt({ exp: now / 1000 }), now)).toBe(true);
    expect(isTokenExpired(jwt({ exp: now / 1000 - 1 }), now)).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['not a jwt', 'abc'],
    ['bad base64', 'h.%%%.s'],
    ['not json', `h.${btoa('x')}.s`],
    ['no exp', jwt({ sub: '1' })],
    ['exp not a number', jwt({ exp: 'soon' })],
  ])('treats %s as expired', (_, token) => {
    expect(isTokenExpired(token, now)).toBe(true);
  });

  it('decodes base64url payloads', () => {
    const payload = btoa(JSON.stringify({ exp: now / 1000 + 60, e: '??>>' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(isTokenExpired(`h.${payload}.s`, now)).toBe(false);
  });
});
