import {
  Resource,
  type HttpClient,
  type RequestOptions,
  type TotpRequestOptions,
} from '../core/http-client.js';
import type {
  LoginParams,
  LoginResponse,
  LogoutResponse,
  WebSocketTokenResponse,
} from '../types/index.js';
import { assertNonEmptyString } from '../utils/validation.js';

let loginDeprecationWarned = false;

/** Emits a one-time deprecation warning (Node.js `process.emitWarning`, no-op elsewhere). */
function warnLoginDeprecated(): void {
  if (loginDeprecationWarned) return;
  loginDeprecationWarned = true;
  const proc = (globalThis as { process?: { emitWarning?: (msg: string, opts: object) => void } })
    .process;
  proc?.emitWarning?.(
    'client.auth.login() uses the captcha-less bot login (POST /auth/login/ with captcha "api"), ' +
      'which Nobitex is disabling (announcement of 2026-11-08). Create an API key in the Nobitex ' +
      'panel and pass `apiKey: { key, privateKey }` (or NOBITEX_API_KEY / NOBITEX_API_PRIVATE_KEY).',
    { type: 'DeprecationWarning', code: 'NOBITEX_LOGIN_DEPRECATED' },
  );
}

/** Options for {@link AuthResource.login}. */
export interface LoginOptions extends TotpRequestOptions {
  /** Use the returned token for subsequent requests of this client (default `true`). */
  useToken?: boolean | undefined;
}

/** Token lifecycle and WebSocket authentication. */
export class AuthResource extends Resource {
  readonly #setToken: (token: string | undefined) => void;

  /** @internal */
  constructor(http: HttpClient, setToken: (token: string | undefined) => void) {
    super(http);
    this.#setToken = setToken;
  }

  /**
   * Obtains a token with username/password (`POST /auth/login/`). Rate limit: 30 per 10 min.
   *
   * Automated login requires an Iranian IP, 2FA enabled on the account (pass the current code as
   * `options.totp`) and `captcha: 'api'` (the default). The token lifetime is returned in
   * `expiresIn`.
   *
   * @deprecated Nobitex announced on 2026-11-08 that the captcha-less bot login (username,
   *   password and 2FA code) is being disabled; requests authenticated with tokens obtained this
   *   way will be rejected. Use API-key authentication instead:
   *   `new NobitexClient({ apiKey: { key, privateKey } })`. A one-time `DeprecationWarning` is
   *   emitted when this method is called.
   *
   * @example
   * const { key, device } = await client.auth.login(
   *   { username: 'me@example.com', password: process.env.NOBITEX_PASSWORD!, remember: true },
   *   { totp: '123456' },
   * );
   */
  async login(params: LoginParams, options: LoginOptions = {}): Promise<LoginResponse> {
    assertNonEmptyString(params.username, 'username');
    assertNonEmptyString(params.password, 'password');
    warnLoginDeprecated();
    const { useToken = true, ...requestOptions } = options;
    const response = await this.request<LoginResponse>(
      {
        method: 'POST',
        path: '/auth/login/',
        auth: 'none',
        body: {
          username: params.username,
          password: params.password,
          captcha: params.captcha ?? 'api',
          ...(params.remember && { remember: 'yes' }),
          ...(params.device !== undefined && { device: params.device }),
        },
      },
      requestOptions,
    );
    if (useToken) this.#setToken(response.key);
    return response;
  }

  /** Revokes the current token (`POST /auth/logout/`) and clears it from the client. */
  async logout(options?: RequestOptions): Promise<LogoutResponse> {
    const response = await this.request<LogoutResponse>(
      { method: 'POST', path: '/auth/logout/' },
      options,
    );
    this.#setToken(undefined);
    return response;
  }

  /**
   * JWT for private WebSocket channels (`GET /auth/ws/token/`), valid for 1200 seconds. API keys
   * need the `READ` permission.
   */
  getWebSocketToken(options?: RequestOptions): Promise<WebSocketTokenResponse> {
    return this.request({ method: 'GET', path: '/auth/ws/token/' }, options);
  }
}
