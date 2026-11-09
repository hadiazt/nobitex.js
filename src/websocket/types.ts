import type { Monetary, OrderSide } from '../types/common.js';
import type { MarketStats, OrderBookLevel } from '../types/market.js';
import type { OrderStatus, TradeType } from '../types/orders.js';

/** `public:orderbook-{SYMBOL}` message. */
export interface OrderBookEvent {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  lastTradePrice: Monetary;
  /** Unix time in milliseconds. */
  lastUpdate: number;
}

/** `public:candle-{SYMBOL}-{RESOLUTION}` message (published roughly every 10 seconds). */
export interface CandleEvent {
  /** Candle open time (Unix seconds). */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

/** `public:trades-{SYMBOL}` message. */
export interface PublicTradeEvent {
  price: Monetary;
  /** Unix time in milliseconds. */
  time: number;
  type: OrderSide;
  volume: Monetary;
}

/** `public:market-stats-{SYMBOL}` message. */
export type MarketStatsEvent = MarketStats;

/** `public:market-stats-all` message, keyed by `"{src}-{dst}"` (e.g. `btc-rls`, `usdt-rls`). */
export type AllMarketStatsEvent = Record<string, MarketStats>;

/** `private:orders#{websocketAuthParam}` message. */
export interface PrivateOrderEvent {
  amount: Monetary;
  avgFilledPrice: Monetary | null;
  clientOrderId: string | null;
  dstCurrency: string;
  /** Unix time in milliseconds. */
  eventTime: number;
  fee: Monetary;
  filledAmount: Monetary;
  lastFillTime: number | null;
  marketType: TradeType;
  orderId: number;
  orderType: 'Limit' | 'Market' | 'StopLimit' | 'StopMarket';
  param1: Monetary | null;
  price: Monetary | null;
  side: 'Buy' | 'Sell';
  srcCurrency: string;
  status: OrderStatus;
  tradeAmount: Monetary | null;
  tradeId: number | null;
  tradePrice: Monetary | null;
}

/**
 * Published on `private:orders#…` when an order is rejected after submission (e.g.
 * `OverValueOrder`).
 */
export interface PrivateOrderFailedEvent {
  status: 'Failed';
  code: string | null;
  message: string | null;
  clientOrderId: string | null;
}

/** `private:trades#{websocketAuthParam}` message. */
export interface PrivateTradeEvent {
  id: number;
  orderId: number;
  srcCurrency: string;
  dstCurrency: string;
  /** Unix time in milliseconds. */
  time: number;
  /** @deprecated ISO-8601 time; use `time`. */
  timestamp?: string;
  type: 'Buy' | 'Sell';
  /** Whether the user's order was the maker. */
  isMaker: boolean;
  price: Monetary;
  amount: Monetary;
  total: Monetary;
  fee: Monetary;
}

/** Maps a channel name to the payload type published on it. */
export type ChannelPayload<C extends string> = C extends `public:orderbook-${string}`
  ? OrderBookEvent
  : C extends `public:candle-${string}`
    ? CandleEvent
    : C extends `public:trades-${string}`
      ? PublicTradeEvent
      : C extends 'public:market-stats-all'
        ? AllMarketStatsEvent
        : C extends `public:market-stats-${string}`
          ? MarketStatsEvent
          : C extends `private:orders#${string}`
            ? PrivateOrderEvent | PrivateOrderFailedEvent
            : C extends `private:trades#${string}`
              ? PrivateTradeEvent
              : unknown;
