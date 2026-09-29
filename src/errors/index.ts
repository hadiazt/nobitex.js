import type { NobitexErrorCode } from './codes.js';

export type { KnownErrorCode, NobitexErrorCode } from './codes.js';

/** Information about the request that produced an error. Never contains credentials. */
export interface RequestInfo {
  method: string;
  /** Path including the query string, e.g. `/market/orders/list?status=open`. */
  path: string;
}

/** Base class of every error thrown by the SDK. Use `instanceof NobitexError` to catch them all. */
export class NobitexError extends Error {
  override name = 'NobitexError';
}

/** Options for {@link NobitexApiError}. */
export interface NobitexApiErrorOptions {
  code: NobitexErrorCode;
  httpStatus: number;
  request: RequestInfo;
  /** Parsed response body (or raw text when the body is not JSON). */
  body?: unknown;
}

/**
 * The server rejected the request: either a non-2xx HTTP status, or an HTTP 200 whose body has
 * `status: "failed"`. Inspect {@link NobitexApiError.code} for the machine-readable reason.
 */
export class NobitexApiError extends NobitexError {
  override name = 'NobitexApiError';
  /** Nobitex error code, e.g. `SmallOrder`, or `HTTP_ERROR` when the body carried no code. */
  readonly code: NobitexErrorCode;
  /** HTTP status code of the response. */
  readonly httpStatus: number;
  /** Method and path of the failed request. */
  readonly request: RequestInfo;
  /** Parsed response body. */
  readonly body: unknown;

  constructor(message: string, options: NobitexApiErrorOptions) {
    super(message);
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.request = options.request;
    this.body = options.body;
  }

  /** Type-safe check for a specific error code. */
  is(code: NobitexErrorCode): boolean {
    return this.code === code;
  }
}

/** HTTP 401 — the token or API-key signature is missing, invalid or expired. */
export class NobitexAuthenticationError extends NobitexApiError {
  override name = 'NobitexAuthenticationError';
}

/** HTTP 403 — the credentials are valid but not allowed to perform this operation. */
export class NobitexPermissionError extends NobitexApiError {
  override name = 'NobitexPermissionError';
}

/** HTTP 404 — the endpoint or the requested object does not exist. */
export class NobitexNotFoundError extends NobitexApiError {
  override name = 'NobitexNotFoundError';
}

/** HTTP 5xx — a temporary problem on Nobitex's side. */
export class NobitexServerError extends NobitexApiError {
  override name = 'NobitexServerError';
}

/** Options for {@link NobitexRateLimitError}. */
export interface NobitexRateLimitErrorOptions extends NobitexApiErrorOptions {
  /** Seconds to wait before retrying (from the `backOff` field or the `Retry-After` header). */
  backOff?: number | undefined;
  /** Maximum number of calls allowed in the current window. */
  limit?: number | undefined;
}

/**
 * HTTP 429 / `TooManyRequests`. Repeatedly ignoring rate limits gets the token blocked for two
 * minutes on every endpoint, so always honour {@link NobitexRateLimitError.backOff}.
 */
export class NobitexRateLimitError extends NobitexApiError {
  override name = 'NobitexRateLimitError';
  /** Seconds to wait before retrying, when provided by the server. */
  readonly backOff: number | undefined;
  /** Allowed number of calls in the window, when provided by the server. */
  readonly limit: number | undefined;

  constructor(message: string, options: NobitexRateLimitErrorOptions) {
    super(message, options);
    this.backOff = options.backOff;
    this.limit = options.limit;
  }
}

/** Invalid input detected locally — the request was never sent. */
export class NobitexValidationError extends NobitexError {
  override name = 'NobitexValidationError';
  /** Name of the offending parameter. */
  readonly param: string;

  constructor(param: string, message: string) {
    super(`Invalid "${param}": ${message}`);
    this.param = param;
  }
}

/** Credentials are required for this endpoint but the client was created without any. */
export class NobitexCredentialsError extends NobitexError {
  override name = 'NobitexCredentialsError';
}

/** The request did not complete within the configured timeout. */
export class NobitexTimeoutError extends NobitexError {
  override name = 'NobitexTimeoutError';
  /** Method and path of the request that timed out. */
  readonly request: RequestInfo;
  /** Timeout that was exceeded, in milliseconds. */
  readonly timeoutMs: number;

  constructor(request: RequestInfo, timeoutMs: number, options?: ErrorOptions) {
    super(`${request.method} ${request.path} timed out after ${timeoutMs}ms`, options);
    this.request = request;
    this.timeoutMs = timeoutMs;
  }
}

/** The request could not reach the server (DNS failure, connection reset, TLS error, …). */
export class NobitexNetworkError extends NobitexError {
  override name = 'NobitexNetworkError';
  /** Method and path of the request that failed. */
  readonly request: RequestInfo;

  constructor(request: RequestInfo, options?: ErrorOptions) {
    const reason = options?.cause instanceof Error ? `: ${options.cause.message}` : '';
    super(`${request.method} ${request.path} failed${reason}`, options);
    this.request = request;
  }
}

/** Type guard for any SDK error. */
export function isNobitexError(error: unknown): error is NobitexError {
  return error instanceof NobitexError;
}

/** Type guard for server-side API errors, optionally narrowed to a specific code. */
export function isNobitexApiError(
  error: unknown,
  code?: NobitexErrorCode,
): error is NobitexApiError {
  return error instanceof NobitexApiError && (code === undefined || error.code === code);
}
