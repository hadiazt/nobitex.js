import { DEFAULT_TIMEOUT_MS, DEFAULT_USER_AGENT } from '../constants.js';
import {
  NobitexApiError,
  NobitexAuthenticationError,
  NobitexCredentialsError,
  NobitexNetworkError,
  NobitexNotFoundError,
  NobitexPermissionError,
  NobitexRateLimitError,
  NobitexServerError,
  NobitexTimeoutError,
  type NobitexApiErrorOptions,
  type RequestInfo,
} from '../errors/index.js';
import { sleep as defaultSleep } from '../utils/encoding.js';
import { buildQueryString, type QueryParams } from '../utils/query.js';
import type { Authenticator } from './auth.js';
import type {
  ClientHooks,
  FetchLike,
  RequestOptions,
  RetryOptions,
  TotpRequestOptions,
} from './options.js';

/** HTTP methods used by the Nobitex API. */
export type HttpMethod = 'GET' | 'POST' | 'DELETE';

/**
 * - `none`: public endpoint, credentials are never sent.
 * - `required`: fails fast with {@link NobitexCredentialsError} when the client has no credentials.
 * - `optional`: credentials are sent when available (e.g. user-specific margin leverage).
 */
export type AuthMode = 'none' | 'required' | 'optional';

/** Description of a single API call. */
export interface RequestSpec {
  method: HttpMethod;
  /** Path starting with `/`, without the query string. */
  path: string;
  query?: QueryParams | undefined;
  /** JSON body. */
  body?: unknown;
  /** Authentication requirement (default `required`). */
  auth?: AuthMode | undefined;
  /**
   * Whether the request can be safely repeated after a network/5xx failure. Defaults to `true` for
   * `GET` and `false` otherwise — orders and withdrawals are never retried blindly.
   */
  idempotent?: boolean | undefined;
  /**
   * `standard` (default) checks the `status` envelope; `udf` handles the TradingView-style
   * `{ s: "ok" | "no_data" | "error" }` envelope of the OHLC endpoint.
   */
  envelope?: 'standard' | 'udf' | undefined;
}

/** Resolved, fully-defaulted retry configuration. */
interface ResolvedRetry {
  maxRetries: number;
  retryOnRateLimit: boolean;
  maxRateLimitWaitMs: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/** Options for {@link HttpClient}. */
export interface HttpClientOptions {
  baseUrl: string;
  authenticator?: Authenticator | undefined;
  timeout?: number | undefined;
  userAgent?: string | undefined;
  retry?: RetryOptions | false | undefined;
  fetch?: FetchLike | undefined;
  hooks?: ClientHooks | undefined;
  /** @internal Overridable for tests. */
  sleep?: ((ms: number, signal?: AbortSignal) => Promise<void>) | undefined;
  /** @internal Overridable for tests (jitter source, returns [0, 1)). */
  random?: (() => number) | undefined;
}

const TIMEOUT = Symbol('timeout');

function resolveRetry(retry: RetryOptions | false | undefined): ResolvedRetry {
  if (retry === false) {
    return {
      maxRetries: 0,
      retryOnRateLimit: false,
      maxRateLimitWaitMs: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
    };
  }
  return {
    maxRetries: Math.max(0, retry?.maxRetries ?? 2),
    retryOnRateLimit: retry?.retryOnRateLimit ?? true,
    maxRateLimitWaitMs: retry?.maxRateLimitWaitMs ?? 30_000,
    baseDelayMs: retry?.baseDelayMs ?? 500,
    maxDelayMs: retry?.maxDelayMs ?? 8_000,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

/** Low-level HTTP transport shared by all resources. */
export class HttpClient {
  /** Base URL without a trailing slash. */
  readonly baseUrl: string;
  readonly #timeout: number;
  readonly #userAgent: string;
  readonly #retry: ResolvedRetry;
  readonly #fetch: FetchLike;
  readonly #hooks: ClientHooks;
  readonly #sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  readonly #random: () => number;
  #authenticator: Authenticator | undefined;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.#authenticator = options.authenticator;
    this.#timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.#userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.#retry = resolveRetry(options.retry);
    // `fetch` is typed as always present, but may be missing in exotic runtimes.
    const globalFetch = (globalThis as { fetch?: FetchLike }).fetch;
    const fetchImpl = options.fetch ?? globalFetch;
    if (!fetchImpl) {
      throw new TypeError('No global fetch available; pass the `fetch` option explicitly.');
    }
    this.#fetch = fetchImpl;
    this.#hooks = options.hooks ?? {};
    this.#sleep = options.sleep ?? defaultSleep;
    this.#random = options.random ?? Math.random;
  }

  /** Whether credentials are configured. */
  get hasCredentials(): boolean {
    return this.#authenticator !== undefined;
  }

  /** Kind of the configured credentials, if any. */
  get authKind(): Authenticator['kind'] | undefined {
    return this.#authenticator?.kind;
  }

  /** Replaces (or clears) the credentials used for subsequent requests. */
  setAuthenticator(authenticator: Authenticator | undefined): void {
    this.#authenticator = authenticator;
  }

  /**
   * Sends a request and returns the parsed JSON body.
   *
   * @throws {NobitexCredentialsError} Protected endpoint called without credentials (nothing sent).
   * @throws {NobitexApiError} Non-2xx status or `status: "failed"` body (see subclasses for
   *   401/403/404/429/5xx).
   * @throws {NobitexTimeoutError} No response within the timeout.
   * @throws {NobitexNetworkError} The server could not be reached.
   */
  async request<T>(spec: RequestSpec, options: TotpRequestOptions = {}): Promise<T> {
    const method = spec.method;
    const pathWithQuery = `${spec.path}${buildQueryString(spec.query)}`;
    const info: RequestInfo = { method, path: pathWithQuery };
    const auth = spec.auth ?? 'required';
    const authenticator = auth === 'none' ? undefined : this.#authenticator;

    if (auth === 'required' && !authenticator) {
      throw new NobitexCredentialsError(
        `${method} ${spec.path} requires authentication; create the client with a \`token\` or \`apiKey\`.`,
      );
    }

    const bodyText = spec.body === undefined ? '' : JSON.stringify(spec.body);
    const idempotent = spec.idempotent ?? method === 'GET';
    const timeoutMs = options.timeout ?? this.#timeout;

    for (let attempt = 0; ; attempt++) {
      options.signal?.throwIfAborted();
      const headers: Record<string, string> = {
        ...options.headers,
        Accept: 'application/json',
        'User-Agent': this.#userAgent,
      };
      if (bodyText) headers['Content-Type'] = 'application/json';
      if (options.totp) headers['X-TOTP'] = options.totp;
      if (authenticator) {
        // Re-signed on every attempt so the API-key timestamp stays fresh.
        Object.assign(
          headers,
          await authenticator.headers({ method, path: pathWithQuery, body: bodyText }),
        );
      }

      this.#emit('onRequest', { method, path: pathWithQuery, attempt });
      const startedAt = Date.now();

      let status: number;
      let responseHeaders: Headers;
      let parsed: unknown;
      try {
        const result = await this.#send(
          `${this.baseUrl}${pathWithQuery}`,
          { method, headers, ...(bodyText ? { body: bodyText } : {}) },
          timeoutMs,
          options.signal,
          info,
        );
        ({ status, headers: responseHeaders, body: parsed } = result);
      } catch (error) {
        const retriable =
          (error instanceof NobitexNetworkError || error instanceof NobitexTimeoutError) &&
          idempotent &&
          attempt < this.#retry.maxRetries;
        if (!retriable) throw error;
        await this.#sleep(this.#backoffDelay(attempt), options.signal);
        continue;
      }

      this.#emit('onResponse', {
        method,
        path: pathWithQuery,
        attempt,
        status,
        durationMs: Date.now() - startedAt,
      });

      const error = this.#toError(status, responseHeaders, parsed, info, spec.envelope);
      if (!error) return parsed as T;

      const delay = this.#retryDelay(error, attempt, idempotent);
      if (delay === undefined) throw error;
      await this.#sleep(delay, options.signal);
    }
  }

  async #send(
    url: string,
    init: RequestInit,
    timeoutMs: number,
    userSignal: AbortSignal | undefined,
    info: RequestInfo,
  ): Promise<{ status: number; headers: Headers; body: unknown }> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(TIMEOUT);
    }, timeoutMs);
    const signal = userSignal
      ? AbortSignal.any([userSignal, controller.signal])
      : controller.signal;

    try {
      const response = await this.#fetch(url, { ...init, signal });
      const text = await response.text();
      return { status: response.status, headers: response.headers, body: parseBody(text) };
    } catch (error) {
      if (userSignal?.aborted) throw userSignal.reason;
      if (controller.signal.aborted)
        throw new NobitexTimeoutError(info, timeoutMs, { cause: error });
      throw new NobitexNetworkError(info, { cause: error });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Converts a response into an error, or returns `undefined` when it is a success. */
  #toError(
    status: number,
    headers: Headers,
    body: unknown,
    info: RequestInfo,
    envelope: RequestSpec['envelope'],
  ): NobitexApiError | undefined {
    const ok = status >= 200 && status < 300;

    if (ok && envelope === 'udf') {
      if (isRecord(body) && (body.s === 'ok' || body.s === 'no_data')) return undefined;
      const message =
        isRecord(body) && typeof body.errmsg === 'string' ? body.errmsg : 'Invalid response';
      return new NobitexApiError(message, {
        code: 'UDF_ERROR',
        httpStatus: status,
        request: info,
        body,
      });
    }

    if (ok && !isRecord(body)) {
      return new NobitexApiError('Expected a JSON object in the response body', {
        code: 'INVALID_RESPONSE',
        httpStatus: status,
        request: info,
        body,
      });
    }
    if (ok && isRecord(body) && body.status !== 'failed') return undefined;

    const record = isRecord(body) ? body : {};
    const code = typeof record.code === 'string' ? record.code : 'HTTP_ERROR';
    const detail = [record.message, record.detail, record.error].find(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
    const message = `${detail ?? `HTTP ${status}`} [${code}] (${info.method} ${info.path})`;
    const options: NobitexApiErrorOptions = { code, httpStatus: status, request: info, body };

    if (status === 429 || code === 'TooManyRequests') {
      return new NobitexRateLimitError(message, {
        ...options,
        backOff: toFiniteNumber(record.backOff) ?? toFiniteNumber(headers.get('retry-after')),
        limit: toFiniteNumber(record.limit),
      });
    }
    if (status === 401) return new NobitexAuthenticationError(message, options);
    if (status === 403) return new NobitexPermissionError(message, options);
    if (status === 404) return new NobitexNotFoundError(message, options);
    if (status >= 500) return new NobitexServerError(message, options);
    return new NobitexApiError(message, options);
  }

  /** Delay before retrying `error`, or `undefined` when it must be surfaced. */
  #retryDelay(error: NobitexApiError, attempt: number, idempotent: boolean): number | undefined {
    if (attempt >= this.#retry.maxRetries) return undefined;
    if (error instanceof NobitexRateLimitError) {
      if (!this.#retry.retryOnRateLimit) return undefined;
      const wait =
        error.backOff !== undefined ? error.backOff * 1000 : this.#backoffDelay(attempt + 1);
      return wait <= this.#retry.maxRateLimitWaitMs ? wait : undefined;
    }
    if (error instanceof NobitexServerError && idempotent) return this.#backoffDelay(attempt);
    return undefined;
  }

  /** Exponential back-off with "equal jitter". */
  #backoffDelay(attempt: number): number {
    const exp = Math.min(this.#retry.maxDelayMs, this.#retry.baseDelayMs * 2 ** attempt);
    return Math.round(exp / 2 + (this.#random() * exp) / 2);
  }

  #emit<K extends keyof ClientHooks>(
    hook: K,
    event: Parameters<NonNullable<ClientHooks[K]>>[0],
  ): void {
    const fn = this.#hooks[hook] as ((e: typeof event) => void) | undefined;
    if (!fn) return;
    try {
      fn(event);
    } catch {
      // Hooks must never break requests.
    }
  }
}

function parseBody(text: string): unknown {
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Shared base class for API resources. */
export abstract class Resource {
  protected readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  protected request<T>(spec: RequestSpec, options?: TotpRequestOptions): Promise<T> {
    return this.http.request<T>(spec, options);
  }
}

export type { RequestOptions, TotpRequestOptions };
