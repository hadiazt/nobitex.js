import { BATCH_CANCEL_MAX_ORDERS } from '../constants.js';
import { Resource, type RequestOptions } from '../core/http-client.js';
import type {
  BatchCancelOrdersResponse,
  BatchCreateOrdersResponse,
  CancelOrdersParams,
  CreateOrderParams,
  ListOrdersParams,
  ListOrdersResponse,
  ListUserTradesParams,
  ListUserTradesResponse,
  OcoOrderParams,
  OcoOrderResponse,
  OkResponse,
  OpenOrdersCountResponse,
  OrderLookup,
  OrderResponse,
  SingleOrderParams,
  TradeTypeParam,
  UpdateOrderStatusParams,
  UpdateOrderStatusResponse,
} from '../types/index.js';
import { toPositiveMonetaryString } from '../utils/format.js';
import {
  assertNonEmptyString,
  assertOneOf,
  assertPagination,
  assertPositiveInteger,
  ensure,
} from '../utils/validation.js';
import {
  ORDER_EXECUTIONS,
  ORDER_SIDES,
  TRADE_TYPES,
  assertClientOrderId,
  buildPriceFields,
  marketPair,
} from './order-helpers.js';

const LIST_STATUSES = ['all', 'open', 'done', 'close'] as const;
const SORT_KEYS = ['id', '-id', 'created_at', '-created_at', 'price', '-price'] as const;

function buildSpotOrderBody(params: CreateOrderParams): Record<string, unknown> {
  assertOneOf(params.type, 'type', ORDER_SIDES);
  assertClientOrderId(params.clientOrderId);
  return {
    type: params.type,
    ...marketPair(params.srcCurrency, params.dstCurrency),
    amount: toPositiveMonetaryString(params.amount, 'amount'),
    ...buildPriceFields(params),
    ...(params.clientOrderId !== undefined && { clientOrderId: params.clientOrderId }),
    ...(params.pro && { pro: 'yes' }),
  };
}

/** Length of `value` when it is an array, otherwise -1 (guards plain-JavaScript callers). */
function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : -1;
}

function lookupBody(lookup: OrderLookup): Record<string, unknown> {
  if ('id' in lookup) {
    assertPositiveInteger(lookup.id, 'id');
    return { id: lookup.id };
  }
  assertNonEmptyString(lookup.clientOrderId, 'clientOrderId');
  return { clientOrderId: lookup.clientOrderId };
}

/** Spot trading: placing, inspecting and cancelling orders, and the user's trade history. */
export class OrdersResource extends Resource {
  /**
   * Places a spot order (`POST /market/orders/add`). Rate limit: 300 per 10 min, shared with
   * margin orders.
   *
   * Placing an order does not mean it is executed — track it with {@link OrdersResource.getStatus}
   * or the private WebSocket orders channel. Prices in rial markets are in **rials** (not tomans).
   * Orders are never retried automatically.
   *
   * @example Limit order
   * await client.orders.create({ type: 'buy', srcCurrency: 'btc', dstCurrency: 'rls', amount: '0.01', price: '5200000000' });
   * @example Market order with a slippage guard
   * await client.orders.create({ type: 'sell', srcCurrency: 'usdt', dstCurrency: 'rls', amount: '50', execution: 'market', price: '600000' });
   * @example OCO order
   * await client.orders.create({ type: 'buy', srcCurrency: 'btc', dstCurrency: 'usdt', amount: '0.01', mode: 'oco', price: '42390', stopPrice: '42700', stopLimitPrice: '42715' });
   */
  create(params: OcoOrderParams, options?: RequestOptions): Promise<OcoOrderResponse>;
  create(params: SingleOrderParams, options?: RequestOptions): Promise<OrderResponse>;
  create(
    params: CreateOrderParams,
    options?: RequestOptions,
  ): Promise<OrderResponse | OcoOrderResponse>;
  create(
    params: CreateOrderParams,
    options?: RequestOptions,
  ): Promise<OrderResponse | OcoOrderResponse> {
    return this.request(
      { method: 'POST', path: '/market/orders/add', body: buildSpotOrderBody(params) },
      options,
    );
  }

  /** Status of one order by `id` or `clientOrderId` (`POST /market/orders/status`). Rate limit: 300/min. */
  getStatus(lookup: OrderLookup, options?: RequestOptions): Promise<OrderResponse> {
    return this.request(
      {
        method: 'POST',
        path: '/market/orders/status',
        body: lookupBody(lookup),
        idempotent: true,
      },
      options,
    );
  }

  /**
   * Lists the user's orders (`GET /market/orders/list`), 100 by default, up to 1000.
   * Rate limit: 30/min.
   *
   * @example
   * const { orders } = await client.orders.list({ status: 'open', srcCurrency: 'btc', dstCurrency: 'usdt', details: 2 });
   */
  list(params: ListOrdersParams = {}, options?: RequestOptions): Promise<ListOrdersResponse> {
    if (params.status !== undefined) assertOneOf(params.status, 'status', LIST_STATUSES);
    if (params.type !== undefined) assertOneOf(params.type, 'type', ORDER_SIDES);
    if (params.execution !== undefined) {
      assertOneOf(params.execution, 'execution', ORDER_EXECUTIONS);
    }
    if (params.tradeType !== undefined) assertOneOf(params.tradeType, 'tradeType', TRADE_TYPES);
    if (params.order !== undefined) assertOneOf(params.order, 'order', SORT_KEYS);
    if (params.details !== undefined) {
      ensure(([1, 2] as unknown[]).includes(params.details), 'details', 'must be 1 or 2');
    }
    if (params.fromId !== undefined) {
      assertPositiveInteger(params.fromId, 'fromId');
      ensure(params.page === undefined, 'page', 'cannot be combined with "fromId"');
    }
    if (params.page !== undefined) {
      ensure(
        Number.isInteger(params.page) && params.page >= 1,
        'page',
        'must be a positive integer',
      );
    }
    if (params.pageSize !== undefined) {
      ensure(
        Number.isInteger(params.pageSize) && params.pageSize >= 1 && params.pageSize <= 1000,
        'pageSize',
        'must be an integer between 1 and 1000',
      );
    }
    return this.request(
      {
        method: 'GET',
        path: '/market/orders/list',
        query: {
          status: params.status,
          type: params.type,
          execution: params.execution,
          tradeType: params.tradeType,
          srcCurrency: params.srcCurrency?.toLowerCase(),
          dstCurrency: params.dstCurrency?.toLowerCase(),
          details: params.details,
          fromId: params.fromId,
          order: params.order,
          page: params.page,
          pageSize: params.pageSize,
        },
      },
      options,
    );
  }

  /**
   * Cancels (`status: 'canceled'`) or activates (`status: 'active'`) an order
   * (`POST /market/orders/update-status`). Cancelling one leg of an OCO cancels both.
   * Rate limit: 90/min.
   */
  updateStatus(
    params: UpdateOrderStatusParams,
    options?: RequestOptions,
  ): Promise<UpdateOrderStatusResponse> {
    assertOneOf(params.status, 'status', ['canceled', 'active'] as const);
    let body: Record<string, unknown>;
    if ('order' in params) {
      assertPositiveInteger(params.order, 'order');
      body = { order: params.order, status: params.status };
    } else {
      assertNonEmptyString(params.clientOrderId, 'clientOrderId');
      body = { clientOrderId: params.clientOrderId, status: params.status };
    }
    return this.request(
      { method: 'POST', path: '/market/orders/update-status', body, idempotent: true },
      options,
    );
  }

  /**
   * Cancels a single order by id or `clientOrderId` — shorthand for
   * `updateStatus({ order, status: 'canceled' })`.
   */
  cancel(
    order: number | { clientOrderId: string },
    options?: RequestOptions,
  ): Promise<UpdateOrderStatusResponse> {
    return this.updateStatus(
      typeof order === 'number'
        ? { order, status: 'canceled' }
        : { clientOrderId: order.clientOrderId, status: 'canceled' },
      options,
    );
  }

  /**
   * Bulk-cancels active orders matching the filters (`POST /market/orders/cancel-old`).
   * With no filters **every** active order is cancelled. Inactive non-OCO stop orders are kept.
   * Rate limit: 30/min.
   *
   * @example Cancel BTC/RLS limit orders placed in the last two hours
   * await client.orders.cancelBulk({ hours: 2, execution: 'limit', srcCurrency: 'btc', dstCurrency: 'rls' });
   */
  cancelBulk(params: CancelOrdersParams = {}, options?: RequestOptions): Promise<OkResponse> {
    if (params.hours !== undefined) {
      ensure(
        Number.isFinite(params.hours) && params.hours > 0,
        'hours',
        'must be a positive number',
      );
    }
    if (params.execution !== undefined) {
      assertOneOf(params.execution, 'execution', ORDER_EXECUTIONS);
    }
    if (params.tradeType !== undefined) assertOneOf(params.tradeType, 'tradeType', TRADE_TYPES);
    const body: Record<string, unknown> = {};
    if (params.hours !== undefined) body.hours = params.hours;
    if (params.execution !== undefined) body.execution = params.execution;
    if (params.tradeType !== undefined) body.tradeType = params.tradeType;
    if (params.srcCurrency !== undefined) body.srcCurrency = params.srcCurrency.toLowerCase();
    if (params.dstCurrency !== undefined) body.dstCurrency = params.dstCurrency.toLowerCase();
    return this.request(
      { method: 'POST', path: '/market/orders/cancel-old', body, idempotent: true },
      options,
    );
  }

  /** The user's trades of the last 3 days (`GET /market/trades/list`). Rate limit: 30/min. */
  listTrades(
    params: ListUserTradesParams = {},
    options?: RequestOptions,
  ): Promise<ListUserTradesResponse> {
    ensure(
      (params.srcCurrency === undefined) === (params.dstCurrency === undefined),
      'srcCurrency',
      'srcCurrency and dstCurrency must be provided together',
    );
    if (params.fromId !== undefined) assertPositiveInteger(params.fromId, 'fromId');
    assertPagination(params);
    return this.request(
      {
        method: 'GET',
        path: '/market/trades/list',
        query: {
          srcCurrency: params.srcCurrency?.toLowerCase(),
          dstCurrency: params.dstCurrency?.toLowerCase(),
          fromId: params.fromId,
          page: params.page,
          pageSize: params.pageSize,
        },
      },
      options,
    );
  }

  /**
   * Places several orders in one request (`POST /market/orders/batch-add`). Each order is
   * validated independently; check every entry of `results`. Counts toward the shared
   * 300-orders-per-10-minutes limit.
   *
   * @experimental Beta endpoint — may change or be withdrawn by Nobitex.
   */
  batchCreate(
    orders: readonly CreateOrderParams[],
    params: { pro?: boolean } = {},
    options?: RequestOptions,
  ): Promise<BatchCreateOrdersResponse> {
    ensure(arrayLength(orders) > 0, 'orders', 'must be a non-empty array');
    const data = orders.map((order) => {
      const body = buildSpotOrderBody(order);
      delete body.pro; // Pro mode applies to the whole batch, not to single orders.
      return body;
    });
    return this.request(
      {
        method: 'POST',
        path: '/market/orders/batch-add',
        body: { data, ...(params.pro && { pro: 'yes' }) },
      },
      options,
    );
  }

  /**
   * Cancels up to 20 orders by id (`POST /market/orders/cancel-batch`). Rate limit: 10/min.
   *
   * @experimental Beta endpoint — may change or be withdrawn by Nobitex.
   */
  batchCancel(
    orderIds: readonly number[],
    options?: RequestOptions,
  ): Promise<BatchCancelOrdersResponse> {
    const count = arrayLength(orderIds);
    ensure(
      count > 0 && count <= BATCH_CANCEL_MAX_ORDERS,
      'orderIds',
      `must contain between 1 and ${BATCH_CANCEL_MAX_ORDERS} ids`,
    );
    orderIds.forEach((id, i) => {
      assertPositiveInteger(id, `orderIds[${i}]`);
    });
    return this.request(
      {
        method: 'POST',
        path: '/market/orders/cancel-batch',
        body: { orderIds },
        idempotent: true,
      },
      options,
    );
  }

  /**
   * Number of open orders (`GET /market/orders/open-count`). Rate limit: 15/min.
   *
   * @experimental Documented as an internal endpoint by Nobitex.
   */
  getOpenCount(
    params: { tradeType?: TradeTypeParam } = {},
    options?: RequestOptions,
  ): Promise<OpenOrdersCountResponse> {
    if (params.tradeType !== undefined) assertOneOf(params.tradeType, 'tradeType', TRADE_TYPES);
    return this.request(
      { method: 'GET', path: '/market/orders/open-count', query: { tradeType: params.tradeType } },
      options,
    );
  }
}
