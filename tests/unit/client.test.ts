import { inspect } from 'node:util';
import { describe, expect, it } from 'vitest';
import {
  BASE_URLS,
  NobitexClient,
  NobitexCredentialsError,
  NobitexValidationError,
  VERSION,
} from '../../src/index.js';
import { login } from '../fixtures/docs-examples.js';
import { createTestClient, jsonResponse } from '../helpers/mock-fetch.js';
import packageJson from '../../package.json' with { type: 'json' };

describe('NobitexClient configuration', () => {
  it('uses production by default and supports testnet', () => {
    expect(new NobitexClient().baseUrl).toBe(BASE_URLS.production);
    expect(new NobitexClient({ environment: 'testnet' }).baseUrl).toBe(BASE_URLS.testnet);
    expect(BASE_URLS.production).toBe('https://apiv2.nobitex.ir');
  });

  it('accepts a custom https baseUrl (trailing slashes removed) and localhost over http', () => {
    expect(new NobitexClient({ baseUrl: 'https://proxy.example.ir/' }).baseUrl).toBe(
      'https://proxy.example.ir',
    );
    expect(new NobitexClient({ baseUrl: 'http://localhost:8080' }).baseUrl).toBe(
      'http://localhost:8080',
    );
  });

  it.each([
    [{ baseUrl: 'http://proxy.example.ir' }, 'baseUrl'],
    [{ baseUrl: 'not a url' }, 'baseUrl'],
    [{ environment: 'staging' as 'testnet' }, 'environment'],
    [{ timeout: 0 }, 'timeout'],
    [{ token: 't', apiKey: { key: 'k', privateKey: 'p' } }, 'token'],
  ])('rejects invalid options %o', (options, param) => {
    expect(() => new NobitexClient(options)).toThrow(NobitexValidationError);
    try {
      new NobitexClient(options);
    } catch (error) {
      expect((error as NobitexValidationError).param).toBe(param);
    }
  });

  it('reports authentication state', () => {
    expect(new NobitexClient().isAuthenticated).toBe(false);
    expect(new NobitexClient({ token: 't' }).isAuthenticated).toBe(true);
    expect(
      new NobitexClient({ apiKey: { key: 'k', sign: () => Promise.resolve('s') } }).toJSON(),
    ).toEqual({ baseUrl: BASE_URLS.production, authenticated: true, auth: 'apiKey' });
  });

  it('never leaks credentials through JSON.stringify or util.inspect', () => {
    const client = new NobitexClient({ token: 'super-secret-token' });
    expect(JSON.stringify(client)).not.toContain('super-secret-token');
    expect(inspect(client, { depth: 10, showHidden: true })).not.toContain('super-secret-token');

    const keyed = new NobitexClient({
      apiKey: { key: 'public', privateKey: 'S5y19KewZzheCWCO4xqMcwwvtR8vQ-hHjE_cdjz-XxE=' },
    });
    expect(inspect(keyed, { depth: 10, showHidden: true })).not.toContain('S5y19');
  });

  it('keeps VERSION in sync with package.json', () => {
    expect(VERSION).toBe(packageJson.version);
  });
});

describe('NobitexClient.fromEnv', () => {
  it('reads a token, environment and base URL', () => {
    const client = NobitexClient.fromEnv({
      NOBITEX_TOKEN: ' tkn ',
      NOBITEX_ENV: 'testnet',
    });
    expect(client.isAuthenticated).toBe(true);
    expect(client.baseUrl).toBe(BASE_URLS.testnet);

    const proxied = NobitexClient.fromEnv({ NOBITEX_BASE_URL: 'https://p.example' });
    expect(proxied.baseUrl).toBe('https://p.example');
    expect(proxied.isAuthenticated).toBe(false);
  });

  it('reads an API key pair and requires both halves', () => {
    const client = NobitexClient.fromEnv({
      NOBITEX_API_KEY: 'pub',
      NOBITEX_API_PRIVATE_KEY: 'S5y19KewZzheCWCO4xqMcwwvtR8vQ-hHjE_cdjz-XxE=',
    });
    expect(client.toJSON().auth).toBe('apiKey');
    expect(() => NobitexClient.fromEnv({ NOBITEX_API_KEY: 'pub' })).toThrow(/must be set together/);
  });

  it('ignores blank variables and lets explicit options win', () => {
    expect(NobitexClient.fromEnv({ NOBITEX_TOKEN: '   ' }).isAuthenticated).toBe(false);
    const client = NobitexClient.fromEnv(
      { NOBITEX_TOKEN: 'env-token' },
      { apiKey: { key: 'k', sign: () => Promise.resolve('s') } },
    );
    expect(client.toJSON().auth).toBe('apiKey');
  });

  it('defaults to process.env', () => {
    const previous = process.env.NOBITEX_TOKEN;
    process.env.NOBITEX_TOKEN = 'from-process';
    try {
      expect(NobitexClient.fromEnv().isAuthenticated).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.NOBITEX_TOKEN;
      else process.env.NOBITEX_TOKEN = previous;
    }
  });
});

describe('token lifecycle', () => {
  it('login() stores the returned token, logout() clears it', async () => {
    const { client, requests } = createTestClient({}, (request) =>
      jsonResponse(request.url.pathname === '/auth/login/' ? login : { detail: 'ok' }),
    );
    await expect(client.account.getProfile()).rejects.toBeInstanceOf(NobitexCredentialsError);

    const response = await client.auth.login(
      { username: 'name@example.com', password: 'pw', remember: true, device: 'AlRyansW' },
      { totp: '123456' },
    );
    expect(response.key).toBe(login.key);
    const loginRequest = requests[0]!;
    expect(loginRequest.headers.authorization).toBeUndefined();
    expect(loginRequest.headers['x-totp']).toBe('123456');
    expect(loginRequest.body).toEqual({
      username: 'name@example.com',
      password: 'pw',
      captcha: 'api',
      remember: 'yes',
      device: 'AlRyansW',
    });
    expect(client.isAuthenticated).toBe(true);

    await client.account.getProfile();
    expect(requests[1]!.headers.authorization).toBe(`Token ${login.key}`);

    await client.auth.logout();
    expect(requests[2]!.url.pathname).toBe('/auth/logout/');
    expect(client.isAuthenticated).toBe(false);
  });

  it('login({ useToken: false }) leaves the client unchanged', async () => {
    const { client, last } = createTestClient({}, () => jsonResponse(login));
    await client.auth.login({ username: 'u@x.io', password: 'p' }, { useToken: false });
    expect(client.isAuthenticated).toBe(false);
    expect(last().body).toMatchObject({ remember: 'no', captcha: 'api' });
  });

  it('setToken() swaps credentials', async () => {
    const { client, last } = createTestClient({ token: 'a' });
    client.setToken('b');
    await client.account.getProfile();
    expect(last().headers.authorization).toBe('Token b');
    client.setToken(undefined);
    expect(client.isAuthenticated).toBe(false);
  });
});

describe('client.request escape hatch', () => {
  it('calls arbitrary endpoints with the shared pipeline', async () => {
    const { client, last } = createTestClient({ token: 't' }, () =>
      jsonResponse({ status: 'ok', count: 2 }),
    );
    const result = await client.request<{ count: number }>({
      method: 'GET',
      path: '/market/orders/open-count',
      query: { tradeType: 'spot' },
    });
    expect(result.count).toBe(2);
    expect(last().url.search).toBe('?tradeType=spot');
    expect(last().headers.authorization).toBe('Token t');
  });

  it('requires an absolute path', () => {
    const { client } = createTestClient();
    expect(() => client.request({ method: 'GET', path: 'relative' })).toThrow(
      NobitexValidationError,
    );
  });
});
