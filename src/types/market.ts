import type { Monetary, OhlcResolution, OkResponse, OrderSide } from './common.js';

/** One order-book level: `[price, amount]`. */
export type OrderBookLevel = readonly [price: Monetary, amount: Monetary];

/** Order book of a single market. `asks` are sell orders, `bids` are buy orders. */
export interface OrderBookSnapshot {
  /** Unix time in milliseconds. */
  lastUpdate: number;
  /** Price of the most recent trade (not included in the `all` response). */
  lastTradePrice?: Monetary;
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
}

/** `GET /v3/orderbook/{symbol}` */
export interface OrderBookResponse extends OkResponse, OrderBookSnapshot {
  lastTradePrice: Monetary;
}

/** `GET /v3/orderbook/all` (keyed by market symbol, `status` stripped by the SDK). */
export type AllOrderBooks = Record<string, OrderBookSnapshot>;

/** `GET /v2/depth/{symbol}` — aggregated depth chart (experimental). */
export interface DepthResponse extends OkResponse {
  /** Unix time in milliseconds (returned as a string by this endpoint). */
  lastUpdate: string | number;
  lastTradePrice: Monetary;
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
}

/** Public trade. */
export interface PublicTrade {
  /** Unix time in milliseconds. */
  time: number;
  price: Monetary;
  volume: Monetary;
  type: OrderSide;
}

/** `GET /v2/trades/{symbol}` */
export interface PublicTradesResponse extends OkResponse {
  trades: PublicTrade[];
}

/** 24h statistics of a market. */
export interface MarketStats {
  isClosed: boolean;
  bestSell: Monetary;
  bestBuy: Monetary;
  volumeSrc: Monetary;
  volumeDst: Monetary;
  latest: Monetary;
  mark?: Monetary;
  dayLow: Monetary;
  dayHigh: Monetary;
  dayOpen: Monetary;
  dayClose: Monetary;
  /** Percentage change over 24h. */
  dayChange: Monetary;
}

/** `GET /market/stats` */
export interface MarketStatsResponse extends OkResponse {
  /** Keyed by `"{src}-{dst}"`, e.g. `"btc-rls"`. */
  stats: Record<string, MarketStats>;
  /** @deprecated Legacy Binance statistics — will be removed by Nobitex. */
  global?: unknown;
}

/** Parameters for `GET /market/stats`. Omit both to receive every market. */
export interface MarketStatsParams {
  /** Source currencies, e.g. `'btc'` or `['btc', 'usdt']`. */
  srcCurrency?: string | readonly string[];
  /** Destination currencies, e.g. `'rls'`. */
  dstCurrency?: string | readonly string[];
}

/** Parameters for `GET /market/udf/history`. */
export interface OhlcParams {
  /** Market symbol, e.g. `BTCIRT`. */
  symbol: string;
  resolution: OhlcResolution;
  /** End of the range (Unix seconds or `Date`). */
  to: number | Date;
  /** Start of the range (Unix seconds or `Date`). */
  from?: number | Date;
  /** Number of candles before `to` (takes precedence over `from`). */
  countback?: number;
  /** Page number — at most 500 candles are returned per page. */
  page?: number;
}

/** OHLC candles in TradingView UDF column format. */
export interface OhlcData {
  s: 'ok';
  /** Candle open times (Unix seconds). */
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
}

/** Returned when no candle exists in the requested range. */
export interface OhlcNoData {
  s: 'no_data';
  nextTime?: number;
}

/** `GET /market/udf/history` */
export type OhlcResponse = OhlcData | OhlcNoData;

/** A single OHLC candle (see {@link toCandles}). */
export interface Candle {
  /** Open time (Unix seconds). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
