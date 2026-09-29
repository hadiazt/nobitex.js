import type { Monetary, OkResponse } from './common.js';

/** Settings of one network of a coin. */
export interface NetworkOptions {
  network: string;
  name: string;
  coin?: string;
  isDefault: boolean;
  beta?: boolean;
  addressRegex: string;
  memoRequired?: boolean;
  memoRegex?: string;
  depositEnable: boolean;
  minConfirm: number;
  depositInfo?: Record<string, { depositMin?: Monetary; depositMax?: Monetary }>;
  withdrawEnable: boolean;
  withdrawIntegerMultiple: Monetary;
  withdrawFee: Monetary;
  withdrawMin: Monetary;
  withdrawMax: Monetary;
}

/** Settings of one coin. */
export interface CoinOptions {
  coin: string;
  name: string;
  defaultNetwork: string;
  displayPrecision: Monetary;
  networkList: Record<string, NetworkOptions>;
  stdName?: string;
}

/** Daily/monthly withdraw limits of a user level. */
export interface WithdrawLimit {
  dailyCoin: Monetary;
  dailyRial: Monetary;
  dailySummation: Monetary;
  monthlySummation: Monetary;
}

/** `GET /v2/options` — system-wide configuration. */
export interface SystemOptionsResponse extends OkResponse {
  features: {
    fcmEnabled: boolean;
    chat?: string;
    walletsToNet?: boolean;
    autoKYC: boolean;
    enabledFeatures: string[];
    betaFeatures: string[];
  };
  coins: CoinOptions[];
  nobitex: {
    allCurrencies: string[];
    activeCurrencies: string[];
    xchangeCurrencies: string[];
    topCurrencies: string[];
    testingCurrencies: string[];
    withdrawLimits: Record<string, WithdrawLimit>;
    /** Minimum order value per quote currency (`rls`, `usdt`, …). */
    minOrders: Record<string, Monetary>;
    /** Amount step per market symbol. */
    amountPrecisions: Record<string, Monetary>;
    /** Price step per market symbol. */
    pricePrecisions: Record<string, Monetary>;
    giftCard?: { physicalFee: Monetary };
  };
}
