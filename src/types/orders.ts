import type {
  Currency,
  HasNext,
  ISODateString,
  LiteralUnion,
  Monetary,
  MonetaryInput,
  OkResponse,
  OrderSide,
  PaginationParams,
  QuoteCurrency,
} from './common.js';

/** Execution types accepted in requests. */
export type OrderExecutionParam = 'limit' | 'market' | 'stop_limit' | 'stop_market';

/** Execution types as returned in responses. */
export type OrderExecution = 'Limit' | 'Market' | 'StopLimit' | 'StopMarket';

/** Order lifecycle status. */
export type OrderStatus = 'New' | 'Active' | 'Inactive' | 'Done' | 'Canceled';

/** Trade type filter accepted in requests. */
export type TradeTypeParam = 'spot' | 'margin';

/** Trade type as returned in responses. */
export type TradeType = 'Spot' | 'Margin' | 'Credit' | 'Debit';

/**
 * Price parameters for each execution type:
 * - `limit` (default): `price` is required.
 * - `market`: `price` is optional but **strongly recommended** for spot orders — it bounds
 *   slippage. Margin endpoints do not accept it.
 * - `stop_limit`: `stopPrice` triggers a limit order at `price`.
 * - `stop_market`: `stopPrice` triggers a market order.
 *
 * `mode: 'default'` may be passed explicitly; it is the same as omitting `mode`.
 */
export type OrderExecutionParams = { mode?: 'default' } & (
  | { execution?: 'limit'; price: MonetaryInput; stopPrice?: never }
  | { execution: 'market'; price?: MonetaryInput; stopPrice?: never }
  | { execution: 'stop_limit'; price: MonetaryInput; stopPrice: MonetaryInput }
  | { execution: 'stop_market'; stopPrice: MonetaryInput; price?: MonetaryInput }
);

/**
 * OCO ("one cancels the other") parameters: a limit order at `price` paired with a stop-limit
 * order (`stopPrice` / `stopLimitPrice`). When one fills, the other is cancelled.
 *
 * Price condition — buy: `price < market < stopPrice, stopLimitPrice`;
 * sell: `price > market > stopPrice, stopLimitPrice`.
 */
export interface OcoParams {
  mode: 'oco';
  price: MonetaryInput;
  stopPrice: MonetaryInput;
  stopLimitPrice: MonetaryInput;
}

/** Fields shared by every spot order. */
export interface SpotOrderBase {
  type: OrderSide;
  /** Base currency, e.g. `btc`. */
  srcCurrency: Currency;
  /** Quote currency: `rls` or `usdt`. */
  dstCurrency: QuoteCurrency | Currency;
  /** Amount in `srcCurrency`. */
  amount: MonetaryInput;
  /**
   * Client-side id (≤ 32 characters: letters, digits and `-`), unique among the user's open
   * orders.
   */
  clientOrderId?: string;
  /**
   * Pro mode: disables the 10-second duplicate-order protection. Use together with
   * `clientOrderId`.
   */
  pro?: boolean;
}

/** A regular (non-OCO) spot order. */
export type SingleOrderParams = SpotOrderBase & OrderExecutionParams;

/** An OCO spot order. */
export type OcoOrderParams = SpotOrderBase & OcoParams;

/** Parameters for `POST /market/orders/add`. */
export type CreateOrderParams = SingleOrderParams | OcoOrderParams;

/** Order object. Some fields are only present for specific endpoints or `details=2`. */
export interface Order {
  /** Always present, except in `orders.list()` with the default `details: 1` (see {@link ListedOrder}). */
  id: number;
  type: OrderSide;
  execution?: OrderExecution;
  tradeType?: TradeType;
  /** Market in `SRC-DST` form, e.g. `BTC-USDT`. */
  market?: string;
  /** Currency display name (`Bitcoin`) for spot, code (`btc`) for margin orders. */
  srcCurrency: string;
  dstCurrency: string;
  /** Limit price, or `"market"` for market orders. */
  price: Monetary;
  amount: Monetary;
  /** Stop price of stop orders. */
  param1?: Monetary | null;
  totalPrice?: Monetary;
  totalOrderPrice?: Monetary;
  matchedAmount: Monetary | number;
  unmatchedAmount?: Monetary;
  averagePrice?: Monetary;
  status?: OrderStatus;
  partial?: boolean;
  fee?: Monetary | number;
  created_at?: ISODateString;
  clientOrderId?: string | null;
  /** Id of the other order of an OCO pair. */
  pairId?: number | null;
  isMyOrder?: boolean;
  /** Margin orders only. */
  leverage?: Monetary;
  /** Margin orders only: opening or closing a position. */
  side?: 'open' | 'close';
}

/** Response of single-order creation. */
export interface OrderResponse extends OkResponse {
  order: Order;
}

/** Response of OCO creation (two linked orders). */
export interface OcoOrderResponse extends OkResponse {
  orders: Order[];
}

/** Identifies an order by server id or by `clientOrderId`. */
export type OrderLookup = { id: number } | { clientOrderId: string };

/** Sort keys for `GET /market/orders/list` (prefix with `-` for descending). */
export type OrderSortKey = 'id' | '-id' | 'created_at' | '-created_at' | 'price' | '-price';

/** Parameters for `GET /market/orders/list`. */
export interface ListOrdersParams extends PaginationParams {
  /** `open` (default), `all`, `done` (partially or fully filled) or `close` (done/cancelled). */
  status?: 'all' | 'open' | 'done' | 'close';
  type?: OrderSide;
  execution?: OrderExecutionParam;
  tradeType?: TradeTypeParam;
  srcCurrency?: Currency;
  dstCurrency?: Currency;
  /** `2` adds `id`, `status`, `fee`, `created_at` and `averagePrice` to each order. */
  details?: 1 | 2;
  /**
   * Only orders with an id greater than or equal to this (cannot be combined with `page`; a
   * single page is returned).
   */
  fromId?: number;
  order?: OrderSortKey;
}

/** An order as returned by `GET /market/orders/list`: `id` is only included with `details: 2`. */
export type ListedOrder = Omit<Order, 'id'> & { id?: number };

/** `GET /market/orders/list` */
export interface ListOrdersResponse extends OkResponse, HasNext {
  orders: ListedOrder[];
}

/** Parameters for `POST /market/orders/update-status`. */
export type UpdateOrderStatusParams = ({ order: number } | { clientOrderId: string }) & {
  /** Target status. `canceled` is the only status supported by the API (from New/Active/Inactive). */
  status: 'canceled';
};

/** `POST /market/orders/update-status` */
export interface UpdateOrderStatusResponse extends OkResponse {
  updatedStatus: OrderStatus;
  order: Order;
}

/** Filters for `POST /market/orders/cancel-old` (bulk cancel). */
export interface CancelOrdersParams {
  /**
   * Only cancel orders **older** than `hours` hours (e.g. `2` keeps orders placed in the last two
   * hours). Omit to cancel every matching active order.
   */
  hours?: number;
  execution?: OrderExecutionParam;
  tradeType?: TradeTypeParam;
  srcCurrency?: Currency;
  dstCurrency?: Currency;
}

/** A trade of the authenticated user. */
export interface UserTrade {
  id: number;
  orderId: number | null;
  srcCurrency: string;
  dstCurrency: string;
  market: string;
  timestamp: ISODateString;
  type: OrderSide;
  price: Monetary;
  amount: Monetary;
  total: Monetary;
  fee: Monetary;
}

/** Parameters for `GET /market/trades/list` (last 180 days). */
export interface ListUserTradesParams {
  /** Must be combined with `dstCurrency`. */
  srcCurrency?: Currency;
  dstCurrency?: Currency;
  /** Only trades with an id ≥ this value. */
  fromId?: number;
  /** Only the user's `buy` or `sell` trades. */
  tradeType?: OrderSide;
  /** Chronological order (default `desc`). */
  tradeOrder?: 'asc' | 'desc';
  /** Page number, 1–100 (default 1). */
  page?: number;
  /** Trades per page, 1–500 (default 30). */
  pageSize?: number;
}

/** `GET /market/trades/list` */
export interface ListUserTradesResponse extends OkResponse, HasNext {
  trades: UserTrade[];
}

/** One element of the batch-create `results` array. */
export type BatchOrderResult =
  | { status: 'ok'; order: Order }
  | { status: 'ok'; orders: Order[] }
  | {
      status: 'failed';
      code: LiteralUnion<'ParseError' | 'InvalidOrderPrice' | 'DuplicateOrder'>;
      message?: string;
      clientOrderId?: string | null;
    };

/** `POST /market/orders/batch-add` */
export interface BatchCreateOrdersResponse extends OkResponse {
  results: BatchOrderResult[];
}

/** `POST /market/orders/cancel-batch` */
export interface BatchCancelOrdersResponse extends OkResponse {
  message: string;
  /** Result per order id. */
  orders: Record<string, { status: 'ok' } | { status: 'failed'; message: string }>;
}

/** `GET /market/orders/open-count` */
export interface OpenOrdersCountResponse extends OkResponse {
  count: number;
}
