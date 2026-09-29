import { BASE_URLS, type NobitexEnvironment } from './constants.js';
import {
  ApiKeyAuthenticator,
  TokenAuthenticator,
  createWebCryptoSigner,
  type Authenticator,
} from './core/auth.js';
import { HttpClient, type RequestSpec } from './core/http-client.js';
import type { NobitexClientOptions, TotpRequestOptions } from './core/options.js';
import { NobitexValidationError } from './errors/index.js';
import { AccountResource } from './resources/account.js';
import { AddressBookResource } from './resources/address-book.js';
import { ApiKeysResource } from './resources/api-keys.js';
import { AuthResource } from './resources/auth.js';
import { MarginResource } from './resources/margin.js';
import { MarketResource } from './resources/market.js';
import { OrdersResource } from './resources/orders.js';
import { PortfolioResource } from './resources/portfolio.js';
import { ReferralResource } from './resources/referral.js';
import { SecurityResource } from './resources/security.js';
import { SystemResource } from './resources/system.js';
import { WalletsResource } from './resources/wallets.js';
import { RialWithdrawalsResource, WithdrawalsResource } from './resources/withdrawals.js';

/** Environment variables read by {@link NobitexClient.fromEnv}. */
export interface NobitexEnv {
  NOBITEX_TOKEN?: string | undefined;
  NOBITEX_API_KEY?: string | undefined;
  NOBITEX_API_PRIVATE_KEY?: string | undefined;
  NOBITEX_ENV?: string | undefined;
  NOBITEX_BASE_URL?: string | undefined;
}

function createAuthenticator(options: NobitexClientOptions): Authenticator | undefined {
  const { token, apiKey } = options;
  if (token !== undefined && apiKey !== undefined) {
    throw new NobitexValidationError('token', 'cannot be combined with "apiKey"; choose one');
  }
  if (token !== undefined) return new TokenAuthenticator(token);
  if (apiKey !== undefined) {
    const signer = 'sign' in apiKey ? apiKey.sign : createWebCryptoSigner(apiKey.privateKey);
    return new ApiKeyAuthenticator(apiKey.key, signer);
  }
  return undefined;
}

function resolveBaseUrl(options: NobitexClientOptions): string {
  if (options.baseUrl !== undefined) {
    let url: URL;
    try {
      url = new URL(options.baseUrl);
    } catch {
      throw new NobitexValidationError('baseUrl', 'must be an absolute URL');
    }
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      throw new NobitexValidationError('baseUrl', 'must use https (credentials would leak)');
    }
    return options.baseUrl;
  }
  const environment = options.environment ?? 'production';
  if (!(environment in BASE_URLS)) {
    throw new NobitexValidationError('environment', 'must be "production" or "testnet"');
  }
  return BASE_URLS[environment];
}

/**
 * Client for the Nobitex REST API.
 *
 * @example Public data
 * const client = new NobitexClient();
 * const book = await client.market.getOrderBook('BTCIRT');
 *
 * @example Authenticated (token from the environment)
 * const client = NobitexClient.fromEnv();
 * const { wallets } = await client.wallets.list();
 *
 * Every endpoint method returns the documented response body and throws a subclass of
 * {@link NobitexError} on failure: {@link NobitexValidationError} for invalid input (nothing is
 * sent), {@link NobitexCredentialsError}, {@link NobitexApiError} (and its HTTP-specific
 * subclasses such as {@link NobitexRateLimitError}), {@link NobitexTimeoutError} or
 * {@link NobitexNetworkError}.
 */
export class NobitexClient {
  /** Public market data: order books, trades, stats, OHLC. */
  readonly market: MarketResource;
  /** System configuration: currencies, networks, fees, precisions. */
  readonly system: SystemResource;
  /** Profile, limits, bank cards/accounts, favorite markets. */
  readonly account: AccountResource;
  /** Wallets, balances, transactions, deposits, transfers. */
  readonly wallets: WalletsResource;
  /** Spot orders and trade history. */
  readonly orders: OrdersResource;
  /** Margin markets, orders and positions. */
  readonly margin: MarginResource;
  /** Crypto withdrawals and withdrawal history. */
  readonly withdrawals: WithdrawalsResource;
  /** Rial (bank) withdrawals. */
  readonly rialWithdrawals: RialWithdrawalsResource;
  /** Address book and whitelist mode. */
  readonly addressBook: AddressBookResource;
  /** Login history, emergency cancel, anti-phishing, OTP. */
  readonly security: SecurityResource;
  /** Referral program. */
  readonly referral: ReferralResource;
  /** Profit & loss reports. */
  readonly portfolio: PortfolioResource;
  /** Login, logout and WebSocket tokens. */
  readonly auth: AuthResource;
  /** API-key management. */
  readonly apiKeys: ApiKeysResource;

  readonly #http: HttpClient;

  constructor(options: NobitexClientOptions = {}) {
    if (options.timeout !== undefined && !(options.timeout > 0)) {
      throw new NobitexValidationError('timeout', 'must be a positive number of milliseconds');
    }
    this.#http = new HttpClient({
      baseUrl: resolveBaseUrl(options),
      authenticator: createAuthenticator(options),
      timeout: options.timeout,
      userAgent: options.userAgent,
      retry: options.retry,
      fetch: options.fetch,
      hooks: options.hooks,
    });

    this.market = new MarketResource(this.#http);
    this.system = new SystemResource(this.#http);
    this.account = new AccountResource(this.#http);
    this.wallets = new WalletsResource(this.#http);
    this.orders = new OrdersResource(this.#http);
    this.margin = new MarginResource(this.#http);
    this.withdrawals = new WithdrawalsResource(this.#http);
    this.rialWithdrawals = new RialWithdrawalsResource(this.#http);
    this.addressBook = new AddressBookResource(this.#http);
    this.security = new SecurityResource(this.#http);
    this.referral = new ReferralResource(this.#http);
    this.portfolio = new PortfolioResource(this.#http);
    this.auth = new AuthResource(this.#http, (token) => {
      this.setToken(token);
    });
    this.apiKeys = new ApiKeysResource(this.#http);
  }

  /**
   * Creates a client from environment variables: `NOBITEX_TOKEN` **or** `NOBITEX_API_KEY` +
   * `NOBITEX_API_PRIVATE_KEY`, plus optional `NOBITEX_ENV` (`production`/`testnet`) and
   * `NOBITEX_BASE_URL`. Explicit `options` take precedence.
   *
   * @param env - Defaults to `process.env`.
   */
  static fromEnv(
    env: NobitexEnv = (globalThis as { process?: { env: NobitexEnv } }).process?.env ?? {},
    options: NobitexClientOptions = {},
  ): NobitexClient {
    const clean = (value: string | undefined): string | undefined =>
      value !== undefined && value.trim() !== '' ? value.trim() : undefined;

    const token = clean(env.NOBITEX_TOKEN);
    const key = clean(env.NOBITEX_API_KEY);
    const privateKey = clean(env.NOBITEX_API_PRIVATE_KEY);
    if ((key === undefined) !== (privateKey === undefined)) {
      throw new NobitexValidationError(
        'NOBITEX_API_KEY',
        'NOBITEX_API_KEY and NOBITEX_API_PRIVATE_KEY must be set together',
      );
    }
    const environment = clean(env.NOBITEX_ENV) as NobitexEnvironment | undefined;
    const hasExplicitAuth = options.token !== undefined || options.apiKey !== undefined;

    return new NobitexClient({
      ...(!hasExplicitAuth && token !== undefined && { token }),
      ...(!hasExplicitAuth &&
        key !== undefined &&
        privateKey !== undefined && {
          apiKey: { key, privateKey },
        }),
      environment,
      baseUrl: clean(env.NOBITEX_BASE_URL),
      ...options,
    });
  }

  /** REST base URL in use. */
  get baseUrl(): string {
    return this.#http.baseUrl;
  }

  /** Whether credentials (token or API key) are configured. */
  get isAuthenticated(): boolean {
    return this.#http.hasCredentials;
  }

  /** Replaces the credentials with a token, or removes them with `undefined`. */
  setToken(token: string | undefined): void {
    this.#http.setAuthenticator(token === undefined ? undefined : new TokenAuthenticator(token));
  }

  /**
   * Calls an endpoint that has no dedicated method yet, with the same authentication, error
   * handling and retry logic as the built-in methods.
   *
   * @example
   * const res = await client.request<{ status: 'ok'; count: number }>({
   *   method: 'GET', path: '/market/orders/open-count', query: { tradeType: 'spot' },
   * });
   */
  request<T>(spec: RequestSpec, options?: TotpRequestOptions): Promise<T> {
    if (!spec.path.startsWith('/')) {
      throw new NobitexValidationError('path', 'must start with "/"');
    }
    return this.#http.request<T>(spec, options);
  }

  /**
   * Safe serialisation. Credentials are only ever stored in `#private` fields, so neither
   * `JSON.stringify` nor `console.log`/`util.inspect` can expose them.
   */
  toJSON(): { baseUrl: string; authenticated: boolean; auth: string | undefined } {
    return {
      baseUrl: this.baseUrl,
      authenticated: this.isAuthenticated,
      auth: this.#http.authKind,
    };
  }
}
