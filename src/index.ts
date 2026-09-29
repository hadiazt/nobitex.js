/**
 * nobitex.js — typed SDK for the Nobitex exchange API.
 *
 * @packageDocumentation
 */

export { NobitexClient, type NobitexEnv } from './client.js';
export { VERSION } from './version.js';
export {
  API_KEY_PERMISSIONS,
  BASE_URLS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
  OHLC_RESOLUTIONS,
  TAG_REQUIRED_NETWORKS,
  WEBSOCKET_URL,
  type NobitexEnvironment,
} from './constants.js';

export {
  NobitexApiError,
  NobitexAuthenticationError,
  NobitexCredentialsError,
  NobitexError,
  NobitexNetworkError,
  NobitexNotFoundError,
  NobitexPermissionError,
  NobitexRateLimitError,
  NobitexServerError,
  NobitexTimeoutError,
  NobitexValidationError,
  isNobitexApiError,
  isNobitexError,
  type KnownErrorCode,
  type NobitexApiErrorOptions,
  type NobitexErrorCode,
  type NobitexRateLimitErrorOptions,
  type RequestInfo,
} from './errors/index.js';

export {
  ApiKeyAuthenticator,
  TokenAuthenticator,
  buildSignatureMessage,
  createWebCryptoSigner,
  type Authenticator,
  type Ed25519Signer,
  type SignaturePayload,
} from './core/auth.js';
export type { AuthMode, HttpMethod, RequestSpec } from './core/http-client.js';
export type {
  ApiKeyCredentials,
  ApiKeySignerCredentials,
  ClientHooks,
  FetchLike,
  NobitexClientOptions,
  RequestEvent,
  RequestOptions,
  ResponseEvent,
  RetryOptions,
  TotpRequestOptions,
} from './core/options.js';

export { toCandles, type MarketResource } from './resources/market.js';
export type { SystemResource } from './resources/system.js';
export type { AccountResource } from './resources/account.js';
export type { WalletsResource } from './resources/wallets.js';
export type { OrdersResource } from './resources/orders.js';
export type { MarginResource } from './resources/margin.js';
export type { RialWithdrawalsResource, WithdrawalsResource } from './resources/withdrawals.js';
export type { AddressBookResource } from './resources/address-book.js';
export type { SecurityResource } from './resources/security.js';
export type { ReferralResource } from './resources/referral.js';
export type { PortfolioResource } from './resources/portfolio.js';
export type { AuthResource, LoginOptions } from './resources/auth.js';
export type { ApiKeysResource } from './resources/api-keys.js';

export { channels } from './websocket/channels.js';
export type * from './websocket/types.js';
export type * from './types/index.js';
