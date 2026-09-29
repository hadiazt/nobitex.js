import type { Monetary, OkResponse } from './common.js';

/** Bank card registered on the account. */
export interface BankCard {
  number: string;
  bank: string;
  owner: string;
  confirmed: boolean;
  status: string;
}

/** Bank account registered on the account. `id` is used for rial withdrawals. */
export interface BankAccount {
  id: number;
  number: string;
  shaba: string;
  bank: string;
  owner: string;
  confirmed: boolean;
  status: string;
}

/** KYC verification flags. */
export interface Verifications {
  email: boolean;
  phone: boolean;
  mobile: boolean;
  identity: boolean;
  selfie: boolean;
  bankAccount: boolean;
  bankCard: boolean;
  address?: boolean;
  city?: boolean;
  nationalSerialNumber?: boolean;
  [key: string]: boolean | undefined;
}

/** User profile. */
export interface Profile {
  firstName: string;
  lastName: string;
  nationalCode: string;
  email: string;
  username: string;
  phone: string | null;
  mobile: string | null;
  city: string | null;
  bankCards: BankCard[];
  bankAccounts: BankAccount[];
  verifications: Verifications;
  pendingVerifications: Partial<Verifications>;
  options: {
    fee: Monetary;
    feeUsdt: Monetary;
    isManualFee: boolean;
    tfa: boolean;
    socialLoginEnabled: boolean;
  };
  withdrawEligible: boolean;
}

/** `GET /users/profile` */
export interface ProfileResponse extends OkResponse {
  profile: Profile;
  tradeStats: {
    monthTradesTotal: Monetary;
    monthTradesCount: number;
  };
  /** Per-user constant used to build private WebSocket channel names. */
  websocketAuthParam: string;
}

/** A used/limit pair (amounts in rials). */
export interface UsageLimit {
  used: Monetary;
  limit: Monetary;
}

/** `GET /users/limitations` */
export interface LimitationsResponse extends OkResponse {
  limitations: {
    userLevel: string;
    features: {
      crypto_trade: boolean;
      rial_trade: boolean;
      coin_deposit: boolean;
      rial_deposit: boolean;
      coin_withdrawal: boolean;
      rial_withdrawal: boolean;
    };
    limits: {
      withdrawRialDaily: UsageLimit;
      withdrawCoinDaily: UsageLimit;
      withdrawTotalDaily: UsageLimit;
      withdrawTotalMonthly: UsageLimit;
    };
  };
}

/** Parameters for `POST /users/cards-add`. */
export interface AddCardParams {
  /** 16-digit card number. */
  number: string;
  /** Bank name. */
  bank: string;
}

/** Parameters for `POST /users/accounts-add`. */
export interface AddBankAccountParams {
  /** Account number. */
  number: string;
  /** IBAN (Sheba), e.g. `IR…`. */
  shaba: string;
  /** Bank name. */
  bank: string;
}

/** Favorite-markets endpoints. */
export interface FavoriteMarketsResponse extends OkResponse {
  favoriteMarkets: string[];
}
