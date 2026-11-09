import { afterEach, describe, expect, it, vi } from 'vitest';
import { NobitexApiError, NobitexNotFoundError } from '../../src/index.js';
import { createTestClient, jsonResponse } from '../helpers/mock-fetch.js';

const signer = { key: 'pub', sign: () => Promise.resolve(new Uint8Array([1, 2, 3])) };

describe('token-only public endpoints (optional-token auth)', () => {
  it('send a token when the client uses one', async () => {
    const { client, last } = createTestClient({ token: 't' }, () =>
      jsonResponse({ status: 'ok', pools: {} }),
    );
    await client.margin.getLiquidityPools();
    expect(last().headers.authorization).toBe('Token t');
  });

  it('are called anonymously by API-key clients instead of being signed', async () => {
    const { client, requests } = createTestClient({ apiKey: signer }, () =>
      jsonResponse({ status: 'ok', markets: {}, pools: {} }),
    );
    await client.margin.getMarkets();
    await client.margin.getLiquidityPools();
    for (const request of requests) {
      expect(request.headers['nobitex-key']).toBeUndefined();
      expect(request.headers['nobitex-signature']).toBeUndefined();
      expect(request.headers.authorization).toBeUndefined();
    }
  });

  it('do not require credentials', async () => {
    const { client, last } = createTestClient({}, () => jsonResponse({ status: 'ok', pools: {} }));
    await client.margin.getLiquidityPools();
    expect(last().headers.authorization).toBeUndefined();
  });

  it('API-key clients still sign regular endpoints', async () => {
    const { client, last } = createTestClient({ apiKey: signer });
    await client.account.getProfile();
    expect(last().headers['nobitex-key']).toBe('pub');
    expect(last().headers['nobitex-signature']).toBe('AQID');
  });
});

describe('error mapping', () => {
  it('keeps the code of Django-style `{ message, error }` errors', async () => {
    const { client } = createTestClient({ token: 't' }, () =>
      jsonResponse({ message: 'Withdraw not found', error: 'NotFound' }, 404),
    );
    const error = await client.withdrawals.cancel({ withdraw: 1 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NobitexNotFoundError);
    expect((error as NobitexNotFoundError).code).toBe('NotFound');
  });

  it('ignores free-text `error` fields when choosing the code', async () => {
    const { client } = createTestClient({ token: 't' }, () =>
      jsonResponse({ status: 'failed', error: 'Something went wrong' }),
    );
    const error = await client.account.getProfile().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NobitexApiError);
    expect((error as NobitexApiError).code).toBe('HTTP_ERROR');
  });

  it('surfaces update-status failures (no code) with the order in `body`', async () => {
    const body = { status: 'failed', updatedStatus: 'Done', order: { id: 1 } };
    const { client } = createTestClient({ token: 't' }, () => jsonResponse(body));
    const error = await client.orders.cancel(1).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NobitexApiError);
    expect((error as NobitexApiError).body).toEqual(body);
  });
});

describe('request headers', () => {
  it('allows a per-request User-Agent override', async () => {
    const { client, last } = createTestClient({ token: 't' });
    await client.account.getProfile({ headers: { 'User-Agent': 'TraderBot/my-bot-2.1' } });
    expect(last().headers['user-agent']).toBe('TraderBot/my-bot-2.1');
  });
});

describe('auth.login deprecation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits a single DeprecationWarning pointing to API keys', async () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
    const login = { status: 'success', key: 'k', device: 'd' };
    const { client } = createTestClient({}, () => jsonResponse(login));
    await client.auth.login({ username: 'u@x.io', password: 'p' }, { totp: '1' });
    await client.auth.login({ username: 'u@x.io', password: 'p' }, { totp: '1' });
    const calls = emitWarning.mock.calls.filter(
      ([, options]) =>
        (options as { code?: string } | undefined)?.code === 'NOBITEX_LOGIN_DEPRECATED',
    );
    // Module state is isolated per test file, so the flag starts fresh here.
    expect(calls).toHaveLength(1);
    expect(String(calls[0]![0])).toContain('apiKey');
    expect(calls[0]![1]).toMatchObject({ type: 'DeprecationWarning' });
  });
});
