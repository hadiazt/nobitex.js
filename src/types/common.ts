import type { API_KEY_PERMISSIONS, OHLC_RESOLUTIONS, TAG_REQUIRED_NETWORKS } from '../constants.js';

/**
 * A decimal amount as returned by the API. Nobitex serialises money as strings to avoid
 * floating-point precision loss — keep it as a string or use a decimal library.
 */
export type Monetary = string;

/**
 * A decimal amount accepted as input. Strings are recommended; numbers are converted to a
 * non-exponential decimal string before being sent.
 */
export type MonetaryInput = string | number;

/** ISO-8601 date-time string, e.g. `2022-10-20T11:36:13.604420+00:00`. */
export type ISODateString = string;

/** Calendar date string in `YYYY-MM-DD` format. */
export type DateOnlyString = string;

/** Keeps IDE autocompletion for known literals while still accepting any string. */
export type LiteralUnion<T extends string> = T | (string & {});

/** Currencies documented by Nobitex (lowercase). New listings are still accepted as strings. */
export type KnownCurrency =
  | 'rls'
  | 'usdt'
  | 'btc'
  | 'eth'
  | 'ltc'
  | 'xrp'
  | 'bch'
  | 'bnb'
  | 'eos'
  | 'xlm'
  | 'etc'
  | 'trx'
  | 'pmn'
  | 'doge'
  | 'uni'
  | 'dai'
  | 'link'
  | 'dot'
  | 'aave'
  | 'ada'
  | 'shib'
  | 'ftm'
  | 'matic'
  | 'axs'
  | 'mana'
  | 'sand'
  | 'avax'
  | 'mkr'
  | 'gmt'
  | 'atom'
  | 'sol'
  | 'ton'
  | 'usdc'
  | 'near'
  | 'arb'
  | 'apt'
  | 'fil'
  | 'algo'
  | 'xmr'
  | 'hbar'
  | 'wbtc'
  | 'not'
  | 'w'
  | 't';

/** A currency code, e.g. `btc`, `usdt` or `rls` (Iranian rial). */
export type Currency = LiteralUnion<KnownCurrency>;

/** Quote (destination) currency of a market. */
export type QuoteCurrency = 'rls' | 'usdt';

/**
 * Market symbol in Nobitex format: base currency + `IRT` or `USDT`, e.g. `BTCIRT`, `ETHUSDT`,
 * `1M_BTTIRT`. Note that rial markets use `IRT` in symbols but `rls` as a currency code.
 */
export type MarketSymbol = `${string}IRT` | `${string}USDT`;

/** Blockchain networks documented by Nobitex. */
export type KnownNetwork =
  | 'FIAT_MONEY'
  | 'ETH'
  | 'BSC'
  | 'ADA'
  | 'ALGO'
  | 'APT'
  | 'ARB'
  | 'BCH'
  | 'BNB'
  | 'BTC'
  | 'BTCLN'
  | 'DOGE'
  | 'DOT'
  | 'EOS'
  | 'ETC'
  | 'LTC'
  | 'PMN'
  | 'TRX'
  | 'OMNI'
  | 'ZTRX'
  | 'XLM'
  | 'XMR'
  | 'XRP'
  | 'ATOM'
  | 'EGLD'
  | 'FIL'
  | 'FLR'
  | 'FLOW'
  | 'FTM'
  | 'MATIC'
  | 'AVAX'
  | 'HBAR'
  | 'NEAR'
  | 'TON'
  | 'SOL'
  | 'XTZ'
  | 'ONE';

/** A blockchain network identifier, e.g. `BSC`, `TRX`, `BTCLN`. */
export type Network = LiteralUnion<KnownNetwork>;

/** Networks that require a memo/tag. */
export type TagRequiredNetwork = (typeof TAG_REQUIRED_NETWORKS)[number];

/** OHLC candle resolution. */
export type OhlcResolution = (typeof OHLC_RESOLUTIONS)[number];

/** API key permission. */
export type ApiKeyPermission = (typeof API_KEY_PERMISSIONS)[number];

/** Order side. */
export type OrderSide = 'buy' | 'sell';

/** Wallet kind. */
export type WalletType = 'spot' | 'margin';

/** Standard success envelope. */
export interface OkResponse {
  status: 'ok';
}

/** Standard failure envelope (the SDK converts these into {@link NobitexApiError}). */
export interface FailedResponse {
  status: 'failed';
  code: string;
  message?: string;
  [key: string]: unknown;
}

/** Page-based pagination parameters (both accept values between 1 and 100). */
export interface PaginationParams {
  /** 1-based page number. */
  page?: number;
  /** Items per page (1–100). */
  pageSize?: number;
}

/** Date-range filter used by list endpoints (`YYYY-MM-DD` or a `Date`). */
export interface DateRangeParams {
  from?: DateOnlyString | Date;
  to?: DateOnlyString | Date;
}

/** Response of paginated list endpoints. */
export interface HasNext {
  hasNext: boolean;
}
