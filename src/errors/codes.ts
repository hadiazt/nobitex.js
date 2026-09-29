import type { LiteralUnion } from '../types/common.js';

/**
 * Error codes documented by Nobitex (the `code` field of a `status: "failed"` response), plus a
 * few codes produced by the SDK itself (upper-case, e.g. `HTTP_ERROR`).
 */
export type KnownErrorCode =
  // Generic
  | 'ParseError'
  | 'NotFound'
  | 'TooManyRequests'
  | 'FeatureUnavailable'
  | 'TryAgainLater'
  // Authentication / 2FA
  | 'MissingCaptcha'
  | 'MissingOTP'
  | 'Invalid2FA'
  | 'InvalidOTP'
  | 'InvalidOTPCode'
  | 'Inactive2FA'
  // Spot orders
  | 'InvalidOrderPrice'
  | 'BadPrice'
  | 'PriceConditionFailed'
  | 'OverValueOrder'
  | 'SmallOrder'
  | 'DuplicateOrder'
  | 'DuplicateClientOrderId'
  | 'InvalidMarketPair'
  | 'MarketClosed'
  | 'TradingUnavailable'
  | 'TradeLimitation'
  | 'NullIdAndClientOrderId'
  // Margin
  | 'InvalidAmount'
  | 'SameDestination'
  | 'WalletNotFound'
  | 'InsufficientBalance'
  | 'InvalidSymbol'
  | 'InvalidMarket'
  | 'UnsupportedMarginSymbol'
  | 'UnsupportedMarginSrc'
  | 'MarginClosed'
  | 'AmountUnavailable'
  | 'ExceedDlegationLimit'
  | 'LeverageTooHigh'
  | 'LeverageUnavailable'
  | 'NoOpenPosition'
  | 'ExceedLiability'
  | 'ExceedTotalAsset'
  | 'LowMarginRatio'
  // Withdrawals
  | 'InvalidCurrency'
  | 'WithdrawUnavailable'
  | 'WithdrawCurrencyUnavailable'
  | 'InvalidAddressTag'
  | 'MissingAddressTag'
  | 'ExchangeRequiredTag'
  | 'RedundantTag'
  | 'WithdrawAmountLimitation'
  | 'WithdrawLimitReached'
  | 'AmountTooLow'
  | 'AmountTooHigh'
  | 'InvalidMobileNumber'
  | 'NotWhitelistedTargetAddress'
  | 'NotCancelable'
  | 'UnAcceptedDisclaimerError'
  | 'BankAccountNotFound'
  | 'InsufficientBalanceOrInactiveWallet'
  | 'ShabaWithdrawCannotProceed'
  | 'WithdrawRequestNotFound'
  | 'CancellationFailed'
  | 'NotCancellable'
  | 'CoinDepositLimitation'
  | 'CoinDepositDisabled'
  // Address book
  | 'InvalidAddress'
  | 'DuplicatedAddress'
  | 'InvalidTag'
  // Security
  | 'InvalidCodeLength'
  // Referral
  | 'InvalidGivebackShare'
  | 'TooManyReferralLinks'
  | 'ReferralCodeUnavailable'
  | 'ReferralCodeExists'
  | 'ReferrerChangeUnavailable'
  // Portfolio
  | 'PortfolioDisabled'
  | 'LastWeekDailyProfitFail'
  // SDK-generated
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE'
  | 'UDF_ERROR';

/** Any Nobitex error code; known codes are offered by autocompletion. */
export type NobitexErrorCode = LiteralUnion<KnownErrorCode>;
