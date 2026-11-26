import { redact } from '../../src/logging/redact';

describe('redact', () => {
  it('masks sensitive keys at any depth, case-insensitively', () => {
    const out = redact({
      email: 'a@b.com',
      Password: 'p1',
      nested: { accessToken: 't', list: [{ Authorization: 'Bearer x' }] },
      cookie: 'c',
      client_secret: 's',
    });
    expect(out).toEqual({
      email: 'a@b.com',
      Password: '[REDACTED]',
      nested: { accessToken: '[REDACTED]', list: [{ Authorization: '[REDACTED]' }] },
      cookie: '[REDACTED]',
      client_secret: '[REDACTED]',
    });
  });

  it('does not mutate the input and survives cycles', () => {
    const input: any = { password: 'p' };
    input.self = input;
    const out: any = redact(input);
    expect(input.password).toBe('p');
    expect(out.password).toBe('[REDACTED]');
    expect(out.self).toBe('[Circular]');
  });
});
