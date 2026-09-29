import type { NobitexEnvironment } from '../constants.js';
import type { Ed25519Signer } from './auth.js';

/** Minimal `fetch` signature the SDK depends on (lets you inject undici, a proxy agent, mocks…). */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** API key credentials with a private key held in memory. */
export interface ApiKeyCredentials {
  /** Public key (`key` field returned by `POST /apikeys/create`). */
  key: string;
  /** Private key (`privateKey` field, base64 Ed25519 seed) — shown only once at creation time. */
  privateKey: string;
}

/**
 * API key credentials with an external signer — use this to keep the private key in a KMS/HSM or
 * a separate process. `sign` receives the UTF-8 bytes of `timestamp + method + url + body`.
 */
export interface ApiKeySignerCredentials {
  key: string;
  sign: Ed25519Signer;
}

/** Automatic retry behaviour. */
export interface RetryOptions {
  /** Maximum retries per request (default `2`). */
  maxRetries?: number | undefined;
  /**
   * Retry after HTTP 429 / `TooManyRequests`, waiting the server-provided `backOff` (default
   * `true`). Safe for every method because rate-limited requests are not processed.
   */
  retryOnRateLimit?: boolean | undefined;
  /** Give up instead of waiting when the server asks to back off longer than this (default `30000`). */
  maxRateLimitWaitMs?: number | undefined;
  /** Initial delay for exponential back-off on network/5xx errors (default `500`). */
  baseDelayMs?: number | undefined;
  /** Upper bound for exponential back-off (default `8000`). */
  maxDelayMs?: number | undefined;
}

/** Event emitted before each HTTP attempt. Contains no credentials. */
export interface RequestEvent {
  method: string;
  /** Path including the query string. */
  path: string;
  /** 0 for the first attempt, then 1, 2, … for retries. */
  attempt: number;
}

/** Event emitted after each HTTP attempt that received a response. */
export interface ResponseEvent extends RequestEvent {
  status: number;
  durationMs: number;
}

/** Observability hooks (logging, metrics, tracing). Exceptions thrown by hooks are ignored. */
export interface ClientHooks {
  onRequest?: ((event: RequestEvent) => void) | undefined;
  onResponse?: ((event: ResponseEvent) => void) | undefined;
}

/** Options for {@link NobitexClient}. */
export interface NobitexClientOptions {
  /**
   * API token (`Authorization: Token …`). Get one from the Nobitex panel or `client.auth.login()`.
   * Mutually exclusive with `apiKey`.
   */
  token?: string | undefined;
  /** Ed25519 API key credentials. Mutually exclusive with `token`. */
  apiKey?: ApiKeyCredentials | ApiKeySignerCredentials | undefined;
  /** `production` (default) or `testnet`. Ignored when `baseUrl` is set. */
  environment?: NobitexEnvironment | undefined;
  /** Override the REST base URL (e.g. a reverse proxy). */
  baseUrl?: string | undefined;
  /** Per-request timeout in milliseconds (default `30000`). */
  timeout?: number | undefined;
  /**
   * `User-Agent` header. Nobitex asks bots to use `TraderBot/<name>`; the default is
   * `TraderBot/nobitex.js-<version>`.
   */
  userAgent?: string | undefined;
  /** Retry configuration, or `false` to disable all automatic retries. */
  retry?: RetryOptions | false | undefined;
  /** Custom `fetch` implementation (defaults to `globalThis.fetch`). */
  fetch?: FetchLike | undefined;
  /** Observability hooks. */
  hooks?: ClientHooks | undefined;
}

/** Options accepted by every endpoint method. */
export interface RequestOptions {
  /** Abort the request. */
  signal?: AbortSignal | undefined;
  /** Override the client timeout for this call (milliseconds). */
  timeout?: number | undefined;
  /** Extra headers (cannot override authentication headers). */
  headers?: Record<string, string> | undefined;
}

/** Options for endpoints that may require a 2FA one-time password. */
export interface TotpRequestOptions extends RequestOptions {
  /** Current TOTP code, sent as the `X-TOTP` header. */
  totp?: string | undefined;
}
