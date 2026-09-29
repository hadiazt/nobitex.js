import { OHLC_RESOLUTIONS } from '../constants.js';
import { Resource, type RequestOptions } from '../core/http-client.js';
import type {
  AllOrderBooks,
  Candle,
  DepthResponse,
  MarketStatsParams,
  MarketStatsResponse,
  OhlcData,
  OhlcParams,
  OhlcResponse,
  OrderBookResponse,
  OrderBookSnapshot,
  PublicTradesResponse,
} from '../types/index.js';
import { toCommaList, toUnixSeconds } from '../utils/format.js';
import { assertOneOf, assertPathSegment, ensure } from '../utils/validation.js';

/** Public market data. No credentials required. */
export class MarketResource extends Resource {
  /**
   * Order book of one market (`GET /v3/orderbook/{symbol}`). Rate limit: 300/min.
   *
   * For a live book subscribe to the WebSocket orderbook channel; if polling, wait at least one
   * second between calls (responses are cached).
   *
   * @param symbol - Market symbol, e.g. `BTCIRT` or `ETHUSDT`.
   * @example
   * const { asks, bids, lastTradePrice } = await client.market.getOrderBook('BTCIRT');
   */
  getOrderBook(symbol: string, options?: RequestOptions): Promise<OrderBookResponse> {
    assertPathSegment(symbol, 'symbol');
    ensure(symbol.toLowerCase() !== 'all', 'symbol', 'use getAllOrderBooks() for "all"');
    return this.request(
      { method: 'GET', path: `/v3/orderbook/${symbol.toUpperCase()}`, auth: 'none' },
      options,
    );
  }

  /**
   * Order books of every market in one call (`GET /v3/orderbook/all`), keyed by symbol.
   * Prefer this over polling many markets individually.
   */
  async getAllOrderBooks(options?: RequestOptions): Promise<AllOrderBooks> {
    const response = await this.request<Record<string, unknown>>(
      { method: 'GET', path: '/v3/orderbook/all', auth: 'none' },
      options,
    );
    const books: AllOrderBooks = {};
    for (const [symbol, book] of Object.entries(response)) {
      if (symbol !== 'status' && typeof book === 'object' && book !== null) {
        books[symbol] = book as OrderBookSnapshot;
      }
    }
    return books;
  }

  /** Aggregated depth-chart data (`GET /v2/depth/{symbol}`, experimental). Rate limit: 300/min. */
  getDepth(symbol: string, options?: RequestOptions): Promise<DepthResponse> {
    assertPathSegment(symbol, 'symbol');
    return this.request(
      { method: 'GET', path: `/v2/depth/${symbol.toUpperCase()}`, auth: 'none' },
      options,
    );
  }

  /** Recent public trades of a market (`GET /v2/trades/{symbol}`). Rate limit: 60/min. */
  getTrades(symbol: string, options?: RequestOptions): Promise<PublicTradesResponse> {
    assertPathSegment(symbol, 'symbol');
    return this.request(
      { method: 'GET', path: `/v2/trades/${symbol.toUpperCase()}`, auth: 'none' },
      options,
    );
  }

  /**
   * 24h market statistics (`GET /market/stats`). Rate limit: 20/min.
   *
   * @example
   * const { stats } = await client.market.getStats({ srcCurrency: ['btc', 'eth'], dstCurrency: 'rls' });
   * stats['btc-rls']?.latest;
   */
  getStats(params: MarketStatsParams = {}, options?: RequestOptions): Promise<MarketStatsResponse> {
    return this.request(
      {
        method: 'GET',
        path: '/market/stats',
        auth: 'none',
        query: {
          srcCurrency: params.srcCurrency && toCommaList(params.srcCurrency),
          dstCurrency: params.dstCurrency && toCommaList(params.dstCurrency),
        },
      },
      options,
    );
  }

  /**
   * OHLC candles in UDF column format (`GET /market/udf/history`), max 500 per page.
   * Returns `{ s: 'no_data' }` when the range is empty. Use {@link toCandles} to convert
   * columns into candle objects.
   */
  getOHLC(params: OhlcParams, options?: RequestOptions): Promise<OhlcResponse> {
    assertPathSegment(params.symbol, 'symbol');
    assertOneOf(params.resolution, 'resolution', OHLC_RESOLUTIONS);
    if (params.countback !== undefined) {
      ensure(
        Number.isInteger(params.countback) && params.countback > 0,
        'countback',
        'must be a positive integer',
      );
    }
    if (params.page !== undefined) {
      ensure(
        Number.isInteger(params.page) && params.page > 0,
        'page',
        'must be a positive integer',
      );
    }
    return this.request(
      {
        method: 'GET',
        path: '/market/udf/history',
        auth: 'none',
        envelope: 'udf',
        query: {
          symbol: params.symbol.toUpperCase(),
          resolution: params.resolution,
          from: params.from === undefined ? undefined : toUnixSeconds(params.from, 'from'),
          to: toUnixSeconds(params.to, 'to'),
          countback: params.countback,
          page: params.page,
        },
      },
      options,
    );
  }
}

/** Converts UDF column data into an array of {@link Candle} objects. */
export function toCandles(data: OhlcResponse): Candle[] {
  if (data.s !== 'ok') return [];
  const columns: OhlcData = data;
  return columns.t.map((time, i) => ({
    time,
    open: columns.o[i] ?? Number.NaN,
    high: columns.h[i] ?? Number.NaN,
    low: columns.l[i] ?? Number.NaN,
    close: columns.c[i] ?? Number.NaN,
    volume: columns.v[i] ?? Number.NaN,
  }));
}
