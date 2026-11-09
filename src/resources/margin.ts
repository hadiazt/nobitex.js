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
  assertPathSegment,
  assertPositiveInteger,
  ensure,
} from '../utils/validation.js';
import {
  ORDER_SIDES,
  assertClientOrderId,
  buildPriceFields,
  marketPair,
  type PriceFieldOptions,
} from './order-helpers.js';

/** Margin endpoints require `execution` on OCO orders and reject `price` on market orders. */
const MARGIN_PRICE_OPTIONS: PriceFieldOptions = { ocoExecution: true, marketPriceForbidden: true };

function clientOrderIdOf(params: object): string | undefined {
  const value = (params as { clientOrderId?: unknown }).clientOrderId;
  assertClientOrderId(value);
  return value as string | undefined;
}

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
   * Margin-enabled markets with fee rates and maximum leverage (`GET /margin/markets/list`).
   * Rate limit: 30/min.
   *
   * Public endpoint. With a **token** the response is personalised (leverage, side-specific fee
   * rates, delegation caps); the endpoint does not support API keys, so API-key clients receive
   * the public response.
   */
  getMarkets(options?: RequestOptions): Promise<MarginMarketsResponse> {
    return this.request(
      { method: 'GET', path: '/margin/markets/list', auth: 'optional-token' },
      options,
    );
  }

  /**
   * Active liquidity pools (`GET /liquidity-pools/list`). Rate limit: 12/min.
   *
   * Public endpoint; with a **token**, `hasDelegate`/`hasActiveAlert` reflect the user. API keys
   * are not supported, so API-key clients receive the public response.
   */
  getLiquidityPools(options?: RequestOptions): Promise<LiquidityPoolsResponse> {
    return this.request(
      { method: 'GET', path: '/liquidity-pools/list', auth: 'optional-token' },
      options,
    );
  }

  /**
   * Remaining delegation limit per side and leverage for a market
   * (`GET /margin/v2/delegation-limit`). Rate limit: 12/min. API keys need the `READ` permission.
   *
   * The `sell` limits are in the base currency (order `amount` ≤ limit); the `buy` limits are in
   * the quote currency (`price × amount` ≤ limit).
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
   * Direction defaults to `sell`. Rate limit: 300 per 10 min, shared with spot orders. API keys
   * need the `TRADE` permission.
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
    const type = params.type ?? 'sell';
    assertOneOf(type, 'type', ORDER_SIDES);
    const clientOrderId = clientOrderIdOf(params);
    const body: Record<string, unknown> = {
      ...marketPair(params.srcCurrency, params.dstCurrency),
      type,
      ...(params.leverage !== undefined && { leverage: leverageString(params.leverage) }),
      amount: toPositiveMonetaryString(params.amount, 'amount'),
      ...buildPriceFields(params, MARGIN_PRICE_OPTIONS),
    };
    if (clientOrderId !== undefined) {
      ensure(body.mode !== 'oco', 'clientOrderId', 'is not supported for margin OCO orders');
      body.clientOrderId = clientOrderId;
    }
    return this.request({ method: 'POST', path: '/margin/orders/add', body }, options);
  }

  /**
   * Open (`status: 'active'`, default) or past positions (`GET /positions/list`), 50 per page by
   * default. Rate limit: 30 per 10 min. API keys need the `READ` permission.
   */
  listPositions(
    params: ListPositionsParams = {},
    options?: RequestOptions,
  ): Promise<ListPositionsResponse> {
    if (params.status !== undefined) {
      assertOneOf(params.status, 'status', ['active', 'past'] as const);
    }
    if (params.page !== undefined) assertPositiveInteger(params.page, 'page');
    if (params.pageSize !== undefined) assertPositiveInteger(params.pageSize, 'pageSize');
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

  /**
   * One position (`GET /positions/{id}/status`). Rate limit: 100 per 10 min. API keys need the
   * `READ` permission.
   */
  getPosition(positionId: number, options?: RequestOptions): Promise<PositionResponse> {
    assertPositiveInteger(positionId, 'positionId');
    return this.request({ method: 'GET', path: `/positions/${positionId}/status` }, options);
  }

  /**
   * Places an opposite order to settle (part of) a position (`POST /positions/{id}/close`).
   * The final close must cover the full remaining `liability` (up to 10 decimals); open close
   * orders may not exceed `liability - liabilityInOrder`. Rate limit: 300 per 10 min. API keys
   * need the `TRADE` permission.
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
    const clientOrderId = clientOrderIdOf(params);
    return this.request(
      {
        method: 'POST',
        path: `/positions/${positionId}/close`,
        body: {
          amount: toPositiveMonetaryString(params.amount, 'amount'),
          ...buildPriceFields(params, { marketPriceForbidden: true }),
          ...(clientOrderId !== undefined && { clientOrderId }),
        },
      },
      options,
    );
  }

  /**
   * Sets the new **total** collateral of an open position
   * (`POST /positions/{id}/edit-collateral`). A position in profit may release surplus collateral
   * down to its initial ratio. Rate limit: 60/min. API keys need the `TRADE` permission.
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
