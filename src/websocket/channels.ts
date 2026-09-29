import { OHLC_RESOLUTIONS } from '../constants.js';
import type { OhlcResolution } from '../types/common.js';
import { assertNonEmptyString, assertOneOf, assertPathSegment } from '../utils/validation.js';

/**
 * Builders for Nobitex WebSocket channel names. Market symbols are upper-cased automatically.
 *
 * @example
 * channels.orderBook('btcirt'); // 'public:orderbook-BTCIRT'
 * channels.privateTrades(profile.websocketAuthParam); // 'private:trades#…'
 */
export const channels = {
  /** Order-book updates (sent only when the book changes). */
  orderBook(symbol: string): `public:orderbook-${string}` {
    assertPathSegment(symbol, 'symbol');
    return `public:orderbook-${symbol.toUpperCase()}`;
  },
  /** OHLC candle updates (about every 10 seconds). */
  candle(symbol: string, resolution: OhlcResolution): `public:candle-${string}` {
    assertPathSegment(symbol, 'symbol');
    assertOneOf(resolution, 'resolution', OHLC_RESOLUTIONS);
    return `public:candle-${symbol.toUpperCase()}-${resolution}`;
  },
  /** Every public trade of a market. */
  trades(symbol: string): `public:trades-${string}` {
    assertPathSegment(symbol, 'symbol');
    return `public:trades-${symbol.toUpperCase()}`;
  },
  /** 24h statistics of one market. */
  marketStats(symbol: string): `public:market-stats-${string}` {
    assertPathSegment(symbol, 'symbol');
    return `public:market-stats-${symbol.toUpperCase()}`;
  },
  /** 24h statistics of every market. */
  allMarketStats(): 'public:market-stats-all' {
    return 'public:market-stats-all';
  },
  /** The user's order events. Requires a connection token. */
  privateOrders(websocketAuthParam: string): `private:orders#${string}` {
    assertNonEmptyString(websocketAuthParam, 'websocketAuthParam');
    return `private:orders#${websocketAuthParam}`;
  },
  /** The user's trades. Requires a connection token. */
  privateTrades(websocketAuthParam: string): `private:trades#${string}` {
    assertNonEmptyString(websocketAuthParam, 'websocketAuthParam');
    return `private:trades#${websocketAuthParam}`;
  },
} as const;
