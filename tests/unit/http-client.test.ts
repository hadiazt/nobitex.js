import { describe, expect, it, vi } from 'vitest';
import { TokenAuthenticator } from '../../src/core/auth.js';
import { HttpClient, type HttpClientOptions } from '../../src/core/http-client.js';
import {
  DEFAULT_USER_AGENT,
  NobitexApiError,
  NobitexAuthenticationError,
  NobitexCredentialsError,
  NobitexNetworkError,
  NobitexNotFoundError,
  NobitexPermissionError,
  NobitexRateLimitError,
  NobitexServerError,
  NobitexTimeoutError,
  isNobitexApiError,
  isNobitexError,
} from '../../src/index.js';
import { rateLimited } from '../fixtures/docs-examples.js';
import { createMockFetch, jsonResponse, type Responder } from '../helpers/mock-fetch.js';

function setup(responder: Responder, options: Partial<HttpClientOptions> = {}) {
  const mock = createMockFetch(responder);
  const sleep = vi.fn((_ms: number) => Promise.resolve());
  const http = new HttpClient({
    baseUrl: 'https://api.test/',
    authenticator: new TokenAuthenticator('tkn'),
    fetch: mock.fetch,
    sleep,
    random: () => 0.5,
    ...options,
  });
  return { http, sleep, ...mock };
}

/** Responds with each response in turn. */
function sequence(...responses: (() => Response | Promise<Response>)[]): Responder {
  let i = 0;
  return () => {
    const next = responses[Math.min(i++, responses.length - 1)];
    return next!();
  };
}

describe('HttpClient requests', () => {
  it('builds URL, query string and default headers', async () => {
    const { http, last } = setup(() => jsonResponse({ status: 'ok', value: 1 }));
    const result = await http.request<{ value: number }>({
      method: 'GET',
      path: '/x',
      query: { a: 'b', list: ['1', 2], skip: undefined, nil: null, flag: false },
    });

    expect(result.value).toBe(1);
    const request = last();
    expect(request.url.toString()).toBe('https://api.test/x?a=b&list=1%2C2&flag=false');
    expect(request.headers).toMatchObject({
      accept: 'application/json',
      'user-agent': DEFAULT_USER_AGENT,
      authorization: 'Token tkn',
    });
    expect(DEFAULT_USER_AGENT).toMatch(/^TraderBot\/nobitex\.js-\d+\.\d+\.\d+/);
  });

  it('sends JSON bodies, TOTP and custom headers without letting them override auth', async () => {
    const { http, last } = setup(() => jsonResponse({ status: 'ok' }));
    await http.request(
      { method: 'POST', path: '/y', body: { a: 1 } },
      { totp: '123456', headers: { 'X-Extra': '1', Authorization: 'Token evil' } },
    );
    const request = last();
    expect(request.rawBody).toBe('{"a":1}');
    expect(request.headers['content-type']).toBe('application/json');
    expect(request.headers['x-totp']).toBe('123456');
    expect(request.headers['x-extra']).toBe('1');
    expect(request.headers.authorization).toBe('Token tkn');
  });

  it('never sends credentials to public endpoints', async () => {
    const { http, last } = setup(() => jsonResponse({ status: 'ok' }));
    await http.request({ method: 'GET', path: '/public', auth: 'none' });
    expect(last().headers.authorization).toBeUndefined();
  });

  it('fails fast without credentials on protected endpoints (no request sent)', async () => {
    const { http, requests } = setup(() => jsonResponse({ status: 'ok' }), {
      authenticator: undefined,
    });
    await expect(http.request({ method: 'GET', path: '/private' })).rejects.toBeInstanceOf(
      NobitexCredentialsError,
    );
    expect(requests).toHaveLength(0);
  });

  it('accepts non-"ok" success envelopes (login returns "success", logout has no status)', async () => {
    const { http } = setup(
      sequence(
        () => jsonResponse({ status: 'success', key: 'k' }),
        () => jsonResponse({ detail: 'bye' }),
      ),
    );
    await expect(http.request({ method: 'POST', path: '/login' })).resolves.toEqual({
      status: 'success',
      key: 'k',
    });
    await expect(http.request({ method: 'POST', path: '/logout' })).resolves.toEqual({
      detail: 'bye',
    });
  });

  it('allows swapping credentials at runtime', async () => {
    const { http, last } = setup(() => jsonResponse({ status: 'ok' }));
    expect(http.hasCredentials).toBe(true);
    expect(http.authKind).toBe('token');
    http.setAuthenticator(undefined);
    expect(http.hasCredentials).toBe(false);
    await http.request({ method: 'GET', path: '/p', auth: 'optional' });
    expect(last().headers.authorization).toBeUndefined();
  });

  it('throws a TypeError when no fetch implementation exists', () => {
    const original = globalThis.fetch;
    // @ts-expect-error -- simulating a runtime without fetch
    delete globalThis.fetch;
    try {
      expect(() => new HttpClient({ baseUrl: 'https://x' })).toThrow(TypeError);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('HttpClient error mapping', () => {
  it('turns HTTP 200 + status "failed" into NobitexApiError with code and message', async () => {
    const body = { status: 'failed', code: 'SmallOrder', message: 'Order is too small' };
    const { http } = setup(() => jsonResponse(body));

    const error = await http
      .request({ method: 'POST', path: '/market/orders/add' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NobitexApiError);
    expect(isNobitexError(error)).toBe(true);
    expect(isNobitexApiError(error, 'SmallOrder')).toBe(true);
    expect(isNobitexApiError(error, 'BadPrice')).toBe(false);
    const apiError = error as NobitexApiError;
    expect(apiError.code).toBe('SmallOrder');
    expect(apiError.is('SmallOrder')).toBe(true);
    expect(apiError.httpStatus).toBe(200);
    expect(apiError.body).toEqual(body);
    expect(apiError.request).toEqual({ method: 'POST', path: '/market/orders/add' });
    expect(apiError.message).toBe('Order is too small [SmallOrder] (POST /market/orders/add)');
  });

  it.each([
    [401, NobitexAuthenticationError],
    [403, NobitexPermissionError],
    [404, NobitexNotFoundError],
    [400, NobitexApiError],
    [422, NobitexApiError],
    [500, NobitexServerError],
    [503, NobitexServerError],
  ])('maps HTTP %i to %o', async (status, ErrorClass) => {
    const { http } = setup(() => jsonResponse({ detail: 'nope' }, status));
    const error = await http.request({ method: 'POST', path: '/e' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorClass);
    expect((error as NobitexApiError).code).toBe('HTTP_ERROR');
    expect((error as NobitexApiError).message).toContain('nope');
  });

  it('keeps non-JSON error bodies (e.g. an HTML gateway page)', async () => {
    const { http } = setup(() => new Response('<html>Bad gateway</html>', { status: 502 }));
    const error = (await http
      .request({ method: 'POST', path: '/e' })
      .catch((e: unknown) => e)) as NobitexApiError;
    expect(error).toBeInstanceOf(NobitexServerError);
    expect(error.body).toBe('<html>Bad gateway</html>');
    expect(error.message).toContain('HTTP 502');
  });

  it('rejects successful responses whose body is not a JSON object', async () => {
    const { http } = setup(() => new Response('not json', { status: 200 }));
    await expect(http.request({ method: 'GET', path: '/x' })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    const empty = setup(() => new Response(null, { status: 204 }));
    await expect(empty.http.request({ method: 'GET', path: '/x' })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('handles the UDF envelope of the OHLC endpoint', async () => {
    const { http } = setup(
      sequence(
        () => jsonResponse({ s: 'no_data' }),
        () => jsonResponse({ s: 'error', errmsg: 'Invalid resolution!' }),
        () => jsonResponse([]),
      ),
    );
    const spec = { method: 'GET', path: '/market/udf/history', envelope: 'udf' } as const;
    await expect(http.request(spec)).resolves.toEqual({ s: 'no_data' });
    await expect(http.request(spec)).rejects.toMatchObject({
      code: 'UDF_ERROR',
      message: 'Invalid resolution!',
    });
    await expect(http.request(spec)).rejects.toMatchObject({ code: 'UDF_ERROR' });
  });
});

describe('HttpClient rate limiting and retries', () => {
  it('waits for the server-provided backOff and retries (HTTP 429)', async () => {
    const { http, sleep, requests } = setup(
      sequence(
        () => jsonResponse(rateLimited, 429),
        () => jsonResponse({ status: 'ok', done: true }),
      ),
    );
    await expect(http.request({ method: 'POST', path: '/market/orders/add' })).resolves.toEqual({
      status: 'ok',
      done: true,
    });
    expect(requests).toHaveLength(2);
    expect(sleep).toHaveBeenCalledWith(12_000, undefined);
  });

  it('treats HTTP 200 + TooManyRequests the same way and uses Retry-After as fallback', async () => {
    const { http, sleep } = setup(
      sequence(
        () =>
          jsonResponse({ status: 'failed', code: 'TooManyRequests' }, 200, { 'Retry-After': '3' }),
        () => jsonResponse({ status: 'ok' }),
      ),
    );
    await http.request({ method: 'GET', path: '/x' });
    expect(sleep).toHaveBeenCalledWith(3_000, undefined);
  });

  it('surfaces NobitexRateLimitError when the backOff exceeds maxRateLimitWaitMs', async () => {
    const { http, requests } = setup(() => jsonResponse(rateLimited, 429), {
      retry: { maxRateLimitWaitMs: 5_000 },
    });
    const error = (await http
      .request({ method: 'GET', path: '/x' })
      .catch((e: unknown) => e)) as NobitexRateLimitError;
    expect(error).toBeInstanceOf(NobitexRateLimitError);
    expect(error.backOff).toBe(12);
    expect(error.limit).toBe(60);
    expect(requests).toHaveLength(1);
  });

  it('respects retryOnRateLimit: false and retry: false', async () => {
    for (const retry of [{ retryOnRateLimit: false }, false] as const) {
      const { http, requests } = setup(() => jsonResponse(rateLimited, 429), { retry });
      await expect(http.request({ method: 'GET', path: '/x' })).rejects.toBeInstanceOf(
        NobitexRateLimitError,
      );
      expect(requests).toHaveLength(1);
    }
  });

  it('falls back to exponential back-off when no backOff is given', async () => {
    const { http, sleep } = setup(
      sequence(
        () => jsonResponse({ status: 'failed', code: 'TooManyRequests' }, 429),
        () => jsonResponse({ status: 'ok' }),
      ),
    );
    await http.request({ method: 'GET', path: '/x' });
    // attempt+1 = 1 → min(8000, 500 * 2) = 1000 → equal jitter with random 0.5 → 750
    expect(sleep).toHaveBeenCalledWith(750, undefined);
  });

  it('retries idempotent requests on 5xx with exponential back-off', async () => {
    const { http, sleep, requests } = setup(
      sequence(
        () => jsonResponse({}, 502),
        () => jsonResponse({}, 503),
        () => jsonResponse({ status: 'ok' }),
      ),
    );
    await http.request({ method: 'GET', path: '/x' });
    expect(requests).toHaveLength(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([375, 750]);
  });

  it('gives up after maxRetries', async () => {
    const { http, requests } = setup(() => jsonResponse({}, 500), { retry: { maxRetries: 1 } });
    await expect(http.request({ method: 'GET', path: '/x' })).rejects.toBeInstanceOf(
      NobitexServerError,
    );
    expect(requests).toHaveLength(2);
  });

  it('NEVER retries non-idempotent requests (orders) after a 5xx or network error', async () => {
    const failing = setup(() => jsonResponse({}, 500));
    await expect(
      failing.http.request({ method: 'POST', path: '/market/orders/add', body: {} }),
    ).rejects.toBeInstanceOf(NobitexServerError);
    expect(failing.requests).toHaveLength(1);

    const network = setup(() => Promise.reject(new TypeError('socket hang up')));
    await expect(
      network.http.request({ method: 'POST', path: '/market/orders/add', body: {} }),
    ).rejects.toBeInstanceOf(NobitexNetworkError);
    expect(network.requests).toHaveLength(1);
  });

  it('retries POST requests explicitly marked idempotent', async () => {
    const { http, requests } = setup(
      sequence(
        () => jsonResponse({}, 500),
        () => jsonResponse({ status: 'ok' }),
      ),
    );
    await http.request({ method: 'POST', path: '/market/orders/status', idempotent: true });
    expect(requests).toHaveLength(2);
  });

  it('retries network errors for idempotent requests and wraps the cause', async () => {
    const cause = new TypeError('fetch failed');
    const { http, requests } = setup(() => Promise.reject(cause), { retry: { maxRetries: 2 } });
    const error = (await http
      .request({ method: 'GET', path: '/x' })
      .catch((e: unknown) => e)) as NobitexNetworkError;
    expect(error).toBeInstanceOf(NobitexNetworkError);
    expect(error.cause).toBe(cause);
    expect(error.message).toBe('GET /x failed: fetch failed');
    expect(requests).toHaveLength(3);
  });

  it('re-signs every attempt (fresh API-key timestamps)', async () => {
    const headers = vi.fn(() => Promise.resolve({ 'Nobitex-Key': 'k' }));
    const { http } = setup(
      sequence(
        () => jsonResponse({}, 500),
        () => jsonResponse({ status: 'ok' }),
      ),
      {
        authenticator: { kind: 'apiKey', headers },
      },
    );
    await http.request({ method: 'GET', path: '/x', query: { a: 1 } });
    expect(headers).toHaveBeenCalledTimes(2);
    expect(headers).toHaveBeenCalledWith({ method: 'GET', path: '/x?a=1', body: '' });
  });
});

describe('HttpClient timeouts and cancellation', () => {
  const hangingFetch: Responder = (request) =>
    new Promise((_resolve, reject) => {
      if (request.signal?.aborted) reject(request.signal.reason as Error);
      request.signal?.addEventListener('abort', () => {
        reject(request.signal?.reason as Error);
      });
    });

  it('throws NobitexTimeoutError after the configured timeout', async () => {
    const { http } = setup(hangingFetch, { timeout: 20, retry: false });
    const error = (await http
      .request({ method: 'GET', path: '/slow' })
      .catch((e: unknown) => e)) as NobitexTimeoutError;
    expect(error).toBeInstanceOf(NobitexTimeoutError);
    expect(error.timeoutMs).toBe(20);
    expect(error.request.path).toBe('/slow');
  });

  it('supports a per-request timeout override and retries timeouts for GET', async () => {
    const { http, requests } = setup(hangingFetch, { timeout: 10_000, retry: { maxRetries: 1 } });
    await expect(
      http.request({ method: 'GET', path: '/slow' }, { timeout: 10 }),
    ).rejects.toBeInstanceOf(NobitexTimeoutError);
    expect(requests).toHaveLength(2);
  });

  it('propagates user aborts unchanged and does not retry them', async () => {
    const { http, requests } = setup(hangingFetch);
    const controller = new AbortController();
    const reason = new Error('user cancelled');
    const pending = http.request({ method: 'GET', path: '/slow' }, { signal: controller.signal });
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    expect(requests.length).toBeLessThanOrEqual(1);
  });

  it('aborts while a request is in flight', async () => {
    const { http, requests } = setup(hangingFetch);
    const controller = new AbortController();
    const pending = http.request({ method: 'GET', path: '/slow' }, { signal: controller.signal });
    await vi.waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    controller.abort(new Error('stop'));
    await expect(pending).rejects.toThrow('stop');
  });

  it('does not send anything when the signal is already aborted', async () => {
    const { http, requests } = setup(hangingFetch);
    await expect(
      http.request(
        { method: 'GET', path: '/x' },
        { signal: AbortSignal.abort(new Error('early')) },
      ),
    ).rejects.toThrow('early');
    expect(requests).toHaveLength(0);
  });

  it('cancels a pending back-off sleep when aborted', async () => {
    const controller = new AbortController();
    const http = new HttpClient({
      baseUrl: 'https://api.test',
      fetch: createMockFetch(() => jsonResponse({}, 500)).fetch,
      retry: { baseDelayMs: 60_000, maxDelayMs: 60_000 },
    });
    const pending = http.request(
      { method: 'GET', path: '/x', auth: 'none' },
      { signal: controller.signal },
    );
    setTimeout(() => {
      controller.abort(new Error('abort during back-off'));
    }, 10);
    await expect(pending).rejects.toThrow('abort during back-off');
  });
});

describe('HttpClient hooks', () => {
  it('emits request/response events without credentials and ignores hook errors', async () => {
    const onRequest = vi.fn(() => {
      throw new Error('hook failure must not break requests');
    });
    const onResponse = vi.fn();
    const { http } = setup(() => jsonResponse({ status: 'ok' }), {
      hooks: { onRequest, onResponse },
    });
    await http.request({ method: 'GET', path: '/x', query: { q: 1 } });

    expect(onRequest).toHaveBeenCalledWith({ method: 'GET', path: '/x?q=1', attempt: 0 });
    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/x?q=1', attempt: 0, status: 200 }),
    );
    expect(JSON.stringify([onRequest.mock.calls, onResponse.mock.calls])).not.toContain('tkn');
  });
});
