import type {
  Currency,
  HasNext,
  ISODateString,
  Monetary,
  MonetaryInput,
  OkResponse,
  OrderSide,
  PaginationParams,
  QuoteCurrency,
} from './common.js';
import type { OcoParams, Order, OrderExecutionParams } from './orders.js';

/** Margin settings of one market. */
export interface MarginMarket {
  srcCurrency: string;
  dstCurrency: string;
  /** Daily extension fee rate. */
  positionFeeRate: Monetary;
  /** Maximum leverage (depends on the user level when authenticated). */
  maxLeverage: Monetary;
  sellEnabled: boolean;
  buyEnabled: boolean;
}

/** `GET /margin/markets/list` */
export interface MarginMarketsResponse extends OkResponse {
  /** Keyed by market symbol, e.g. `BTCUSDT`. */
  markets: Record<string, MarginMarket>;
}

/** Capacity of one liquidity pool. */
export interface LiquidityPool {
  capacity: Monetary;
  filledCapacity: Monetary;
}

/** `GET /liquidity-pools/list` */
export interface LiquidityPoolsResponse extends OkResponse {
  /** Keyed by currency, e.g. `btc`. */
  pools: Record<string, LiquidityPool>;
}

/** Remaining delegation for one leverage step. */
export interface DelegationLimitItem {
  leverage: Monetary;
  /** Sell side: in base currency. Buy side: in quote currency. */
  limit: Monetary;
}

/** `GET /margin/v2/delegation-limit` */
export interface DelegationLimitResponse extends OkResponse {
  limits: {
    buy: DelegationLimitItem[];
    sell: DelegationLimitItem[];
  };
}

/** Fields shared by margin orders. */
export interface MarginOrderBase {
  srcCurrency: Currency;
  dstCurrency: QuoteCurrency | Currency;
  /** Direction (default `sell`). */
  type?: OrderSide;
  /** Leverage from 1 up to the market maximum, in steps of 0.5 (default `1`). */
  leverage?: MonetaryInput;
  amount: MonetaryInput;
}

/** Parameters for `POST /margin/orders/add` (regular order). */
export type MarginOrderParams = MarginOrderBase & OrderExecutionParams;

/** Parameters for `POST /margin/orders/add` (OCO order). */
export type MarginOcoOrderParams = MarginOrderBase & OcoParams;

/** Status of a position. */
export type PositionStatus = 'Open' | 'Closed' | 'Liquidated' | 'Expired';

/** Margin position. Open-only and closed-only fields are optional. */
export interface Position {
  id: number;
  createdAt: ISODateString;
  srcCurrency: string;
  dstCurrency: string;
  side: OrderSide;
  status: PositionStatus;
  marginType: 'Isolated Margin' | 'Cross Margin';
  collateral: Monetary;
  leverage: Monetary;
  openedAt: ISODateString | null;
  closedAt: ISODateString | null;
  liquidationPrice: Monetary;
  entryPrice: Monetary | null;
  exitPrice: Monetary | null;
  // Open positions
  delegatedAmount?: Monetary;
  liability?: Monetary;
  totalAsset?: Monetary;
  marginRatio?: Monetary;
  liabilityInOrder?: Monetary;
  assetInOrder?: Monetary;
  unrealizedPNL?: Monetary;
  unrealizedPNLPercent?: Monetary;
  expirationDate?: string;
  extensionFee?: Monetary;
  markPrice?: Monetary;
  // Closed positions
  PNL?: Monetary | null;
  PNLPercent?: Monetary | null;
}

/** Parameters for `GET /positions/list`. */
export interface ListPositionsParams extends PaginationParams {
  srcCurrency?: Currency;
  dstCurrency?: Currency;
  /** `active` (default) or `past` (closed, liquidated or expired). */
  status?: 'active' | 'past';
}

/** `GET /positions/list` */
export interface ListPositionsResponse extends OkResponse, HasNext {
  positions: Position[];
}

/** `GET /positions/{id}/status`, `POST /positions/{id}/edit-collateral` */
export interface PositionResponse extends OkResponse {
  position: Position;
}

/** Parameters for `POST /positions/{id}/close` (regular order). */
export type ClosePositionParams = { amount: MonetaryInput } & OrderExecutionParams;

/** Parameters for `POST /positions/{id}/close` (OCO order). */
export type ClosePositionOcoParams = { amount: MonetaryInput } & OcoParams;

/** Response with the created margin order. */
export interface MarginOrderResponse extends OkResponse {
  order: Order;
}

/** Response with the created margin OCO orders. */
export interface MarginOcoOrderResponse extends OkResponse {
  orders: Order[];
}
