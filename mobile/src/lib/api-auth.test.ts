import { ApiError, authRequest, configureAuth, login } from './api';

const respond = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

describe('authRequest', () => {
  const onUnauthorized = jest.fn();

  beforeEach(() => {
    onUnauthorized.mockReset();
    configureAuth({ getToken: () => 'tok', onUnauthorized });
  });

  it('sends the bearer token and JSON content type', async () => {
    const fetchMock = respond(200, { ok: true });
    globalThis.fetch = fetchMock as typeof fetch;
    await authRequest('/x', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('leaves the content type to fetch for multipart bodies', async () => {
    const fetchMock = respond(200, {});
    globalThis.fetch = fetchMock as typeof fetch;
    await authRequest('/x', { method: 'POST', body: new FormData() });
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });

  it('calls the unauthorized handler once on 401 and still throws', async () => {
    globalThis.fetch = respond(401, { message: 'no' }) as typeof fetch;
    await expect(authRequest('/x')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not call the handler on other errors', async () => {
    globalThis.fetch = respond(403, { code: 'NOT_A_MEMBER', message: 'x' }) as typeof fetch;
    await expect(authRequest('/x')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('login', () => {
  it('does not trigger the unauthorized handler on bad credentials', async () => {
    const onUnauthorized = jest.fn();
    configureAuth({ getToken: () => null, onUnauthorized });
    globalThis.fetch = respond(401, { message: 'Las credenciales no son correctas' }) as typeof fetch;
    await expect(login('a@b.co', 'password1')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('returns the access token', async () => {
    globalThis.fetch = respond(200, { access_token: 't' }) as typeof fetch;
    await expect(login('a@b.co', 'password1')).resolves.toBe('t');
  });
});
