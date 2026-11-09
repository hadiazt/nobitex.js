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
  /** Daily extension fee rate. Prefer the side-specific rates below when present. */
  positionFeeRate: Monetary | null;
  /**
   * Maximum leverage. May differ per user (level, market depth, pool capacity and access) when
   * called with a token.
   */
  maxLeverage: Monetary;
  sellEnabled: boolean;
  buyEnabled: boolean;
  /** Daily extension fee rate of sell positions (personalised responses only). */
  sellPositionFeeRate?: Monetary | null;
  /** Daily extension fee rate of buy positions (personalised responses only). */
  buyPositionFeeRate?: Monetary | null;
  /** Maximum sell delegation, usually in `srcCurrency` (personalised responses only). */
  sellMaxDelegation?: Monetary | null;
  /** Maximum buy delegation, usually in `dstCurrency` (personalised responses only). */
  buyMaxDelegation?: Monetary | null;
  /** Maximum buy delegation expressed in `srcCurrency` (personalised responses only). */
  buyMaxDelegationInSrcCurrency?: Monetary | null;
}

/** `GET /margin/markets/list` */
export interface MarginMarketsResponse extends OkResponse {
  /** Keyed by market symbol, e.g. `BTCUSDT`. */
  markets: Record<string, MarginMarket>;
}

/** One active liquidity pool. */
export interface LiquidityPool {
  id?: number;
  capacity: Monetary;
  filledCapacity: Monetary;
  currentProfit?: number;
  /** Annual percentage rate. */
  APR?: Monetary | null;
  minDelegation?: Monetary | null;
  maxDelegation?: Monetary | null;
  /** `YYYY-MM-DD` */
  startDate?: string;
  /** `YYYY-MM-DD` */
  endDate?: string;
  /** Profit period in days. */
  profitPeriod?: number;
  /** `YYYY-MM-DD` */
  profitDate?: string;
  /** Whether the authenticated user has an active stake in the pool. */
  hasDelegate?: boolean;
  hasActiveAlert?: boolean;
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
  /** Direction (default `sell`; always sent explicitly by the SDK). */
  type?: OrderSide;
  /** Leverage from 1 up to the market maximum, in steps of 0.5 (default `1`). */
  leverage?: MonetaryInput;
  amount: MonetaryInput;
}

/** Parameters for `POST /margin/orders/add` (regular order). */
export type MarginOrderParams = MarginOrderBase &
  OrderExecutionParams & {
    /** Client-side id (≤ 32 characters: letters, digits and `-`). Not available for OCO orders. */
    clientOrderId?: string;
  };

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
  liquidationPrice: Monetary | null;
  entryPrice: Monetary | null;
  exitPrice: Monetary | null;
  // Open positions
  delegatedAmount?: Monetary | null;
  liability?: Monetary | null;
  totalAsset?: Monetary | null;
  marginRatio?: Monetary | null;
  liabilityInOrder?: Monetary | null;
  assetInOrder?: Monetary | null;
  unrealizedPNL?: Monetary | null;
  unrealizedPNLPercent?: Monetary | null;
  /** `YYYY-MM-DD` */
  expirationDate?: string | null;
  extensionFee?: Monetary | null;
  markPrice?: Monetary | null;
  // Closed positions
  PNL?: Monetary | null;
  PNLPercent?: Monetary | null;
}

/** Parameters for `GET /positions/list`. */
export interface ListPositionsParams extends PaginationParams {
  srcCurrency?: Currency;
  dstCurrency?: Currency;
  /**
   * `active` (default) or `past` (closed, liquidated or expired). Liquidated/expired positions
   * may briefly remain under `active` until settlement finishes.
   */
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
export type ClosePositionParams = {
  amount: MonetaryInput;
  /** Client-side id (≤ 32 characters: letters, digits and `-`). */
  clientOrderId?: string;
} & OrderExecutionParams;

/** Parameters for `POST /positions/{id}/close` (OCO order). */
export type ClosePositionOcoParams = {
  amount: MonetaryInput;
  /** Client-side id (≤ 32 characters: letters, digits and `-`). */
  clientOrderId?: string;
} & OcoParams;

/** Response with the created margin order. */
export interface MarginOrderResponse extends OkResponse {
  order: Order;
}

/** Response with the created margin OCO orders. */
export interface MarginOcoOrderResponse extends OkResponse {
  orders: Order[];
}
