import type {
  DateRangeParams,
  HasNext,
  ISODateString,
  LiteralUnion,
  Monetary,
  MonetaryInput,
  Network,
  OkResponse,
  PaginationParams,
} from './common.js';

/** Crypto withdrawal status. */
export type WithdrawStatus = LiteralUnion<
  'New' | 'Verified' | 'Processing' | 'Done' | 'Canceled' | 'Rejected'
>;

/** Withdrawal request (crypto or rial). */
export interface Withdraw {
  id: number;
  createdAt: ISODateString;
  status: WithdrawStatus;
  amount: Monetary;
  currency: string;
  network?: string;
  invoice?: string | null;
  address: string;
  tag: string | null;
  wallet_id: number;
  blockchain_url: string;
  is_cancelable: boolean;
}

/** Common fields of a crypto withdrawal request. */
interface CreateWithdrawBase {
  /** Id of the source wallet. */
  wallet: number;
  /** Transfer network, e.g. `TRX`, `BSC`, `BTCLN`. */
  network?: Network;
  /** Free-text note. */
  explanations?: string;
}

/** Withdrawal to an address. */
export interface AddressWithdrawParams extends CreateWithdrawBase {
  address: string;
  amount: MonetaryInput;
  /** Memo/tag — required on tag networks (BNB, EOS, PMN, XLM, XRP) unless `noTag` is true. */
  tag?: string;
  /** Explicitly withdraw without a tag on a tag network. */
  noTag?: boolean;
  invoice?: never;
}

/** Lightning withdrawal (amount and address are read from the invoice). */
export interface InvoiceWithdrawParams extends CreateWithdrawBase {
  invoice: string;
  address?: never;
  amount?: never;
}

/** Parameters for `POST /users/wallets/withdraw`. */
export type CreateWithdrawParams = AddressWithdrawParams | InvoiceWithdrawParams;

/** Parameters for `POST /users/wallets/withdraw-confirm`. */
export interface ConfirmWithdrawParams {
  /** Withdrawal id returned by `create`. */
  withdraw: number;
  /** One-time code sent by SMS/e-mail (not needed for address-book destinations). */
  otp?: string | number;
}

/** Crypto withdrawal endpoints. */
export interface WithdrawResponse extends OkResponse {
  withdraw: Withdraw;
}

/** Parameters for `GET /users/wallets/withdraws/list`. */
export interface ListWithdrawsParams extends PaginationParams, DateRangeParams {
  /** Wallet id; omit for all wallets. */
  wallet?: number;
}

/** `GET /users/wallets/withdraws/list` */
export interface ListWithdrawsResponse extends OkResponse, HasNext {
  withdraws: Withdraw[];
}

/** Status of a rial withdrawal. */
export type RialWithdrawStatus = LiteralUnion<
  | 'New'
  | 'Sent'
  | 'Bank processing'
  | 'Partially Done'
  | 'Done'
  | 'Failed'
  | 'Rejected'
  | 'Canceled'
>;

/** A bank transfer that is part of a rial withdrawal. */
export interface RialWithdrawRecord {
  amount: Monetary;
  bankReferenceNumber: string | null;
  status: LiteralUnion<'Pending' | 'Failed' | 'Transferred'>;
  estimatedSettleAt: ISODateString | null;
  providerUpdatedAt: ISODateString | null;
  transferType: LiteralUnion<'normal' | 'paya' | 'satna'>;
}

/** Rial (bank) withdrawal request. */
export interface RialWithdraw {
  /** String id starting with `CW` or `WJ`, e.g. `CW430542`. */
  id: string;
  createdAt: ISODateString;
  status: RialWithdrawStatus;
  amount: Monetary;
  fee: Monetary;
  fulfilledAmount: Monetary;
  bankAccountId: number;
  bankAccountInfo: string;
  isCancelable: boolean;
  records: RialWithdrawRecord[];
}

/** Parameters for `POST /cobank/withdraw`. */
export interface CreateRialWithdrawParams {
  /** Id of a confirmed bank account (see `profile.bankAccounts`). */
  destinationBankAccountId: number;
  /** Amount in rials. */
  amount: MonetaryInput;
}

/** Rial withdrawal endpoints. */
export interface RialWithdrawResponse extends OkResponse {
  result: RialWithdraw;
}
