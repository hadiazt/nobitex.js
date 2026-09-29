import { Resource, type RequestOptions } from '../core/http-client.js';
import type {
  ClosePositionOcoParams,
  ClosePositionParams,
  DelegationLimitResponse,
  LiquidityPoolsResponse,
  ListPositionsParams,
  ListPositionsResponse,
  MarginMarketsResponse,
  MarginOcoOrderParams,
  MarginOcoOrderResponse,
  MarginOrderParams,
  MarginOrderResponse,
  MonetaryInput,
  PositionResponse,
} from '../types/index.js';
import { toPositiveMonetaryString } from '../utils/format.js';
import {
  assertOneOf,
  assertPagination,
  assertPathSegment,
  assertPositiveInteger,
  ensure,
} from '../utils/validation.js';
import { ORDER_SIDES, buildPriceFields, marketPair } from './order-helpers.js';

function leverageString(value: MonetaryInput): string {
  const text = toPositiveMonetaryString(value, 'leverage');
  const numeric = Number(text);
  ensure(
    numeric >= 1 && Number.isInteger(numeric * 2),
    'leverage',
    'must be at least 1, in steps of 0.5',
  );
  return text;
}

/** Margin (leveraged) trading: markets, pools, delegation limits, orders and positions. */
export class MarginResource extends Resource {
  /**
   * Margin-enabled markets with fee rate and maximum leverage (`GET /margin/markets/list`).
   * Credentials are optional; when present the leverage reflects the user's level.
   */
  getMarkets(options?: RequestOptions): Promise<MarginMarketsResponse> {
    return this.request({ method: 'GET', path: '/margin/markets/list', auth: 'optional' }, options);
  }

  /** Capacity of the active liquidity pools (`GET /liquidity-pools/list`). Rate limit: 12/min. */
  getLiquidityPools(options?: RequestOptions): Promise<LiquidityPoolsResponse> {
    return this.request({ method: 'GET', path: '/liquidity-pools/list' }, options);
  }

  /**
   * Remaining delegation limit per side and leverage for a market
   * (`GET /margin/v2/delegation-limit`). Rate limit: 12/min.
   *
   * @param market - Margin market symbol, e.g. `BTCUSDT`.
   */
  getDelegationLimit(market: string, options?: RequestOptions): Promise<DelegationLimitResponse> {
    assertPathSegment(market, 'market');
    return this.request(
      {
        method: 'GET',
        path: '/margin/v2/delegation-limit',
        query: { market: market.toUpperCase() },
      },
      options,
    );
  }

  /**
   * Places a margin order that opens a position once filled (`POST /margin/orders/add`).
   * Direction defaults to `sell`. Rate limit: 300 per 10 min, shared with spot orders.
   *
   * @example
   * await client.margin.createOrder({ srcCurrency: 'btc', dstCurrency: 'usdt', type: 'buy', leverage: 2, amount: '0.01', price: '60000' });
   */
  createOrder(
    params: MarginOcoOrderParams,
    options?: RequestOptions,
  ): Promise<MarginOcoOrderResponse>;
  createOrder(params: MarginOrderParams, options?: RequestOptions): Promise<MarginOrderResponse>;
  createOrder(
    params: MarginOrderParams | MarginOcoOrderParams,
    options?: RequestOptions,
  ): Promise<MarginOrderResponse | MarginOcoOrderResponse>;
  createOrder(
    params: MarginOrderParams | MarginOcoOrderParams,
    options?: RequestOptions,
  ): Promise<MarginOrderResponse | MarginOcoOrderResponse> {
    if (params.type !== undefined) assertOneOf(params.type, 'type', ORDER_SIDES);
    const body: Record<string, unknown> = {
      ...marketPair(params.srcCurrency, params.dstCurrency),
      ...(params.type !== undefined && { type: params.type }),
      ...(params.leverage !== undefined && { leverage: leverageString(params.leverage) }),
      amount: toPositiveMonetaryString(params.amount, 'amount'),
      ...buildPriceFields(params),
    };
    return this.request({ method: 'POST', path: '/margin/orders/add', body }, options);
  }

  /** Open (`status: 'active'`, default) or past positions (`GET /positions/list`). Rate limit: 30/min. */
  listPositions(
    params: ListPositionsParams = {},
    options?: RequestOptions,
  ): Promise<ListPositionsResponse> {
    if (params.status !== undefined) {
      assertOneOf(params.status, 'status', ['active', 'past'] as const);
    }
    assertPagination(params);
    return this.request(
      {
        method: 'GET',
        path: '/positions/list',
        query: {
          srcCurrency: params.srcCurrency?.toLowerCase(),
          dstCurrency: params.dstCurrency?.toLowerCase(),
          status: params.status,
          page: params.page,
          pageSize: params.pageSize,
        },
      },
      options,
    );
  }

  /** One position (`GET /positions/{id}/status`). */
  getPosition(positionId: number, options?: RequestOptions): Promise<PositionResponse> {
    assertPositiveInteger(positionId, 'positionId');
    return this.request({ method: 'GET', path: `/positions/${positionId}/status` }, options);
  }

  /**
   * Places an opposite order to settle (part of) a position (`POST /positions/{id}/close`).
   * The final close must cover the full remaining `liability` (up to 10 decimals).
   */
  closePosition(
    positionId: number,
    params: ClosePositionOcoParams,
    options?: RequestOptions,
  ): Promise<MarginOcoOrderResponse>;
  closePosition(
    positionId: number,
    params: ClosePositionParams,
    options?: RequestOptions,
  ): Promise<MarginOrderResponse>;
  closePosition(
    positionId: number,
    params: ClosePositionParams | ClosePositionOcoParams,
    options?: RequestOptions,
  ): Promise<MarginOrderResponse | MarginOcoOrderResponse>;
  closePosition(
    positionId: number,
    params: ClosePositionParams | ClosePositionOcoParams,
    options?: RequestOptions,
  ): Promise<MarginOrderResponse | MarginOcoOrderResponse> {
    assertPositiveInteger(positionId, 'positionId');
    return this.request(
      {
        method: 'POST',
        path: `/positions/${positionId}/close`,
        body: {
          amount: toPositiveMonetaryString(params.amount, 'amount'),
          ...buildPriceFields(params),
        },
      },
      options,
    );
  }

  /**
   * Sets a new collateral for an open position (`POST /positions/{id}/edit-collateral`).
   * Rate limit: 60/min.
   */
  editCollateral(
    positionId: number,
    collateral: MonetaryInput,
    options?: RequestOptions,
  ): Promise<PositionResponse> {
    assertPositiveInteger(positionId, 'positionId');
    return this.request(
      {
        method: 'POST',
        path: `/positions/${positionId}/edit-collateral`,
        body: { collateral: toPositiveMonetaryString(collateral, 'collateral') },
        idempotent: true,
      },
      options,
    );
  }
}
