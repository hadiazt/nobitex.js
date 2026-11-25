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

/** Wallet kinds accepted by the wallet-list endpoints. */
export type WalletListType = WalletType | 'credit' | 'debit';

/** Deposit address of a wallet on one network. */
export interface DepositAddress {
  address: string | null;
  tag: string | null;
}

/** Wallet as returned by `POST /users/wallets/list` and `POST /wallets/transfer`. */
export interface Wallet {
  id: number;
  currency: string;
  /** Wallet kind (returned by `POST /wallets/transfer`). */
  type?: WalletType;
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

/** `POST /users/wallets/list` */
export interface WalletsResponse extends OkResponse {
  wallets: Wallet[];
}

/** Compact wallet as returned by `POST /v2/wallets`. */
export interface WalletSummary {
  id: number;
  balance: Monetary;
  blocked: Monetary;
}

/** `POST /v2/wallets` — keyed by upper-case currency (`RLS`, `BTC`, …). */
export interface WalletSummariesResponse extends OkResponse {
  wallets: Record<string, WalletSummary>;
}

/** Parameters for `POST /v2/wallets`. */
export interface WalletSummariesParams {
  /** Currencies to include, e.g. `['rls', 'btc']`. Omit for all. */
  currencies?: string | readonly string[];
  /** Wallet kind (default `spot`). */
  type?: WalletListType;
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
export interface TransactionsResponse extends OkResponse, Partial<HasNext> {
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

/**
 * Parameters for `GET /users/transactions-history`. The range length is limited by Nobitex; too
 * long or invalid ranges are rejected with HTTP 422.
 */
export interface TransactionHistoryParams extends PaginationParams {
  currency?: Currency;
  /** One or more transaction types. */
  tp?: TransactionType | readonly TransactionType[];
  /** Range start: Unix seconds, `Date` or ISO date-time (sent as Unix seconds). */
  from?: number | Date | ISODateString;
  /** Range end: Unix seconds, `Date` or ISO date-time (sent as Unix seconds). */
  to?: number | Date | ISODateString;
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
  /** Withdrawals returned alongside the deposits. */
  withdraws?: unknown[];
}

/** Parameters for `GET /users/wallets/deposits/list`. */
export interface DepositsParams extends PaginationParams, DateRangeParams {
  /** Wallet id, or `'all'` (default). */
  wallet?: number | 'all';
}

/** Deposit address flavour. */
export type DepositAddressType = 'default' | 'legacy';

/** Parameters for `POST /users/wallets/generate-address` (spot wallet). */
export type GenerateAddressParams = {
  /** Network; the coin's default network when omitted. */
  network?: Network;
  /** `default` (default) or `legacy` address format. */
  addressType?: DepositAddressType;
} & (
  | { currency: Currency; wallet?: number }
  /** Wallet id (takes precedence over `currency` when both are sent). */
  | { wallet: number; currency?: Currency }
);

/** `POST /users/wallets/generate-address` */
export interface GenerateAddressResponse extends OkResponse {
  address: string | null;
  /** Memo/tag for tag-based coins (XRP, XLM, TON, …). */
  tag?: string | null;
}

/** Parameters for `POST /wallets/transfer` (spot ⇄ margin). */
export interface TransferParams {
  /** Currency code, e.g. `usdt`, `rls` or `btc`. */
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

/** One of the user's deposit addresses (multiple-deposit-address APIs). */
export interface DepositAddressRecord {
  /** Id used by `depositAddresses.updateTitle()`. */
  id: number;
  title: string | null;
  /**
   * Requested network (`ONE` for Harmony) in `list`/`generate`; the stored source network
   * (`ETH` for Harmony) in `updateTitle`.
   */
  network: string | null;
  /**
   * The address. Harmony (`ONE`) addresses are returned in bech32 (`one1…`) form by `list` and
   * `generate`, or `null` when the conversion fails.
   */
  address: string | null;
  createdAt: ISODateString;
  /** `true` when the address no longer accepts deposits. */
  isDisabled: boolean;
}

/** Parameters for `GET /users/wallets/deposit/address/list`. */
export interface ListDepositAddressesParams {
  /** Coin, e.g. `eth` (case-insensitive). */
  coin: Currency;
  /** Network, e.g. `ETH` (case-insensitive). Tag/memo networks (XRP, TON) are not supported. */
  network: Network;
  /** Order by creation time (default `-created_at`, newest first). */
  ordering?: 'created_at' | '-created_at';
  /** `true`: only disabled addresses, `false`: only active ones; omit for both. */
  isDisabled?: boolean;
  /** Case-insensitive substring of the title. */
  search?: string;
  /** Page number (default 1). */
  page?: number;
  /** Addresses per page (default 50). */
  pageSize?: number;
}

/** `GET /users/wallets/deposit/address/list` */
export interface DepositAddressesResponse extends OkResponse, HasNext {
  addresses: DepositAddressRecord[];
}

/** Parameters for `POST /users/wallets/deposit/address/generate`. */
export interface GenerateDepositAddressParams {
  /** Coin, e.g. `eth` (case-insensitive). */
  coin: Currency;
  /**
   * Network, e.g. `ETH` (case-insensitive). Tag/memo networks (XRP, TON) and Lightning (`BTCLN`)
   * are not supported.
   */
  network: Network;
  /** Optional title, at most 256 characters after trimming; blank titles are stored as `null`. */
  title?: string | null;
}

/** Parameters for `POST /users/wallets/deposit/address/update`. */
export interface UpdateDepositAddressTitleParams {
  /** `id` of the address (from `list` or `generate`). */
  addressId: number;
  /** New title (≤ 256 characters after trimming); omit, `null` or blank to clear it. */
  title?: string | null;
}

/** `POST /users/wallets/deposit/address/generate` and `/update` */
export interface DepositAddressResponse extends OkResponse {
  address: DepositAddressRecord;
}
