import type {
  Currency,
  DateRangeParams,
  HasNext,
  ISODateString,
  Monetary,
  MonetaryInput,
  Network,
  OkResponse,
  PaginationParams,
  WalletType,
} from './common.js';

/** Deposit address of a wallet on one network. */
export interface DepositAddress {
  address: string | null;
  tag: string | null;
}

/** Wallet as returned by `GET /users/wallets/list` and `POST /wallets/transfer`. */
export interface Wallet {
  id: number;
  currency: string;
  balance: Monetary;
  blockedBalance: Monetary;
  activeBalance: Monetary;
  /** Rial value of the balance (may be a number or a string). */
  rialBalance: Monetary | number;
  rialBalanceSell: Monetary | number;
  depositAddress?: string | null;
  depositTag?: string | null;
  /** Deposit addresses keyed by network. */
  depositInfo?: Record<string, DepositAddress>;
}

/** `GET /users/wallets/list` */
export interface WalletsResponse extends OkResponse {
  wallets: Wallet[];
}

/** Compact wallet as returned by `GET /v2/wallets`. */
export interface WalletSummary {
  id: number;
  balance: Monetary;
  blocked: Monetary;
}

/** `GET /v2/wallets` — keyed by upper-case currency (`RLS`, `BTC`, …). */
export interface WalletSummariesResponse extends OkResponse {
  wallets: Record<string, WalletSummary>;
}

/** Parameters for `GET /v2/wallets`. */
export interface WalletSummariesParams {
  /** Currencies to include, e.g. `['rls', 'btc']`. Omit for all. */
  currencies?: string | readonly string[];
  type?: WalletType;
}

/** `POST /users/wallets/balance` */
export interface BalanceResponse extends OkResponse {
  balance: Monetary;
}

/** Wallet transaction. */
export interface WalletTransaction {
  id: number;
  currency: string;
  amount: Monetary;
  description: string;
  created_at: ISODateString;
  calculatedFee: Monetary | null;
  /** Balance after the transaction (transactions-history only). */
  balance?: Monetary;
  /** Machine-readable type (transactions-history only). */
  tp?: TransactionType;
  /** Localised (Persian) type label (transactions-history only). */
  type?: string;
}

/** `GET /users/wallets/transactions/list` and `GET /users/transactions-history` */
export interface TransactionsResponse extends OkResponse, HasNext {
  transactions: WalletTransaction[];
}

/** Parameters for `GET /users/wallets/transactions/list`. */
export interface WalletTransactionsParams extends PaginationParams {
  /** Wallet id. */
  wallet: number;
}

/** Transaction types accepted by the `tp` filter. */
export type TransactionType =
  | 'deposit'
  | 'withdraw'
  | 'buy'
  | 'sell'
  | 'manual'
  | 'referral'
  | 'transfer'
  | 'pnl'
  | 'delegate'
  | 'staking'
  | 'yield_farming'
  | 'discount';

/** Parameters for `GET /users/transactions-history` (range limited to 90 days). */
export interface TransactionHistoryParams extends PaginationParams {
  currency?: Currency;
  tp?: TransactionType;
  /** Range start (ISO date-time or `Date`). */
  from?: ISODateString | Date;
  /** Range end (ISO date-time or `Date`). */
  to?: ISODateString | Date;
  /** Only return transactions with an id greater than this. */
  fromId?: number;
}

/** Crypto deposit. */
export interface Deposit {
  txHash: string;
  address: string;
  confirmed: boolean;
  transaction: WalletTransaction;
  /** Coin display name, e.g. `Bitcoin`. */
  currency: string;
  blockchainUrl: string;
  confirmations: number;
  requiredConfirmations: number;
  amount: Monetary;
}

/** `GET /users/wallets/deposits/list` */
export interface DepositsResponse extends OkResponse, HasNext {
  deposits: Deposit[];
}

/**
 * Parameters for `GET /users/wallets/deposits/list` (last 3 months). Pagination and date filters
 * only apply when `wallet` is set.
 */
export interface DepositsParams extends PaginationParams, DateRangeParams {
  wallet?: number;
}

/** Parameters for `POST /users/wallets/generate-address`. */
export type GenerateAddressParams =
  | { currency: Currency; network?: Network }
  /** @deprecated Identify the wallet by `currency` instead. */
  | { wallet: number; network?: Network };

/** `POST /users/wallets/generate-address` */
export interface GenerateAddressResponse extends OkResponse {
  address: string;
  tag?: string | null;
}

/** Parameters for `POST /wallets/transfer` (spot ⇄ margin). */
export interface TransferParams {
  /** `rls` or `usdt`. */
  currency: Currency;
  amount: MonetaryInput;
  src: WalletType;
  dst: WalletType;
}

/** `POST /wallets/transfer` */
export interface TransferResponse extends OkResponse {
  srcWallet: Wallet;
  dstWallet: Wallet;
}
