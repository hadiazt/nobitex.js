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
   * Nobitex recommends copying a token from the panel instead. Automated login requires an
   * Iranian IP, 2FA enabled on the account (pass the current code as `options.totp`) and
   * `captcha: 'api'` (the default). Tokens expire after 4 hours, or 30 days with `remember: true`.
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
          remember: params.remember ? 'yes' : 'no',
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

  /** JWT for private WebSocket channels (`GET /auth/ws/token/`). */
  getWebSocketToken(options?: RequestOptions): Promise<WebSocketTokenResponse> {
    return this.request({ method: 'GET', path: '/auth/ws/token/' }, options);
  }
}
