import { VERSION } from './version.js';

/** REST API base URLs for each Nobitex environment. */
export const BASE_URLS = {
  production: 'https://apiv2.nobitex.ir',
  testnet: 'https://testnetapiv2.nobitex.ir',
} as const;

/** Nobitex environment name. */
export type NobitexEnvironment = keyof typeof BASE_URLS;

/** Centrifugo WebSocket endpoint. */
export const WEBSOCKET_URL = 'wss://ws.nobitex.ir/connection/websocket';

/**
 * Default `User-Agent`. Nobitex strongly recommends the `TraderBot/<name>` pattern so bot traffic
 * can be identified and supported.
 */
export const DEFAULT_USER_AGENT: string = `TraderBot/nobitex.js-${VERSION}`;

/** Default per-request timeout in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Candle resolutions accepted by the OHLC (UDF) endpoint and the candle WebSocket channels. */
export const OHLC_RESOLUTIONS = [
  '1',
  '5',
  '15',
  '30',
  '60',
  '180',
  '240',
  '360',
  '720',
  'D',
  '2D',
  '3D',
] as const;

/** Networks that require a memo/tag for withdrawals and address-book entries. */
export const TAG_REQUIRED_NETWORKS = ['BNB', 'EOS', 'PMN', 'XLM', 'XRP'] as const;

/** Permissions that can be granted to an API key. */
export const API_KEY_PERMISSIONS = ['READ', 'TRADE', 'WITHDRAW'] as const;

/** Maximum number of candles returned per OHLC page. */
export const OHLC_MAX_CANDLES_PER_PAGE = 500;

/** Maximum number of order ids accepted by the batch-cancel endpoint. */
export const BATCH_CANCEL_MAX_ORDERS = 20;

/** Maximum length of a `clientOrderId`. */
export const CLIENT_ORDER_ID_MAX_LENGTH = 32;
