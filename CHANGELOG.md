# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-11-09

Synchronised with the updated official documentation (OpenAPI files at
[apidocs.nobitex.ir](https://apidocs.nobitex.ir), up to the Mehr 1405 changes) and with the
2026-11-08 announcement that Nobitex is disabling bot login.

### Fixed

- **API-key signatures are now sent as URL-safe base64** (`-`/`_`), as the API-key guide
  requires. Previously, standard base64 (`+`/`/`) was sent, which made most signed requests fail
  verification. String signatures returned by custom signers are normalised too.
- HTTP methods now match the documentation (POST): `account.getLimitations`, `wallets.list`,
  `wallets.getSummaries`, `security.getLoginAttempts`, `security.activateEmergencyCancel`,
  `referral.listLinks` and `referral.getStatus`.
- `wallets.getTransactionHistory` sends `from`/`to` as Unix seconds (Dates, ISO strings and
  numbers are accepted).
- `orders.create` sends `pro: true` (boolean) instead of `"yes"`.
- Margin OCO orders include the required `execution: "limit"`. Margin orders always send `type`
  (default `sell`), and margin market/stop-market orders reject `price`.
- `auth.login` omits `remember` unless it is `true` (the API only accepts `"yes"`).
- `market.getLiquidityPools` no longer requires credentials (public endpoint).
- `cancelBulk` docs: `hours` cancels orders **older** than the given number of hours.
- A per-request `User-Agent` header now overrides the client default.
- Django-style errors (`{ message, error: "NotFound" }`) keep their code instead of `HTTP_ERROR`.

### Added

- Address book two-step flow: `addressBook.createItem`, `addressBook.confirmItem`, and
  `addressBook.validateAddress` (`/security/validate-address-network`).
- `withdrawals.cancel` (`/users/wallets/withdraw-cancel`), `rialWithdrawals.getBanks`
  (`/cobank/withdraw-banks`) and `security.getEmergencyCancelCode`.
- `account.deleteCard` and `account.deleteBankAccount`.
- `clientOrderId` on margin orders and position-close orders. `tradeType`, `tradeOrder` and
  `pageSize` up to 500 for `orders.listTrades`. `agenda` for `referral.createLink`. `monthly` for
  `portfolio.getDailyTotalProfit`. `addressType` and `wallet` + `currency` for
  `wallets.generateAddress`. `wallet: 'all'` for withdrawal and deposit lists. `credit`/`debit`
  wallet types for the wallet lists. `mode: 'default'` for orders.
- API-key permissions `DEPOSIT`, `ADDRESS_BOOK`, `OTP` and `VIP_CREDIT`.
- `1D` OHLC/candle resolution, `OHLC_MINUTE_CANDLE_RETENTION_DAYS` (minute candles cover the last
  7 days), testnet WebSocket URL (`WEBSOCKET_URLS`, `NobitexWebSocket.create({ environment })`).
- `optional-token` auth mode: token-only public endpoints are called anonymously by API-key
  clients instead of sending a signature they do not support.
- New documented fields in the response types: margin market fee rates and delegation caps,
  liquidity pool details, login-attempt device info, `isClosedReason`, `expiresIn`,
  `isBusinessAccount`, `depositLimits`, `ListOrdersResponse.hasNext`, the private trade `time`
  and `isMaker`, the private order failure event, and more. Error codes for the new withdrawal,
  rial-withdrawal, address-book and margin errors.
- Rate limits and required API-key permissions in the TSDoc of every method.

### Changed

- `auth.login` is **deprecated** and emits a one-time `DeprecationWarning`: Nobitex is disabling
  the captcha-less bot login. Use API-key authentication.
- `addressBook.add` (one-step `POST /address_book`) is deprecated by Nobitex; use
  `createItem` + `confirmItem`.
- `apiKeys.create`, `apiKeys.update` and `apiKeys.delete` require `{ totp }` (2FA), validated
  locally.
- `orders.updateStatus` only accepts `status: 'canceled'`, the only status the API supports.
- `account.addBankAccount` sends `{ shaba, number? }`. `bank` is no longer part of the API and is
  ignored. `account.addCard`'s `bank` is optional.
- Types now follow the documented nullability: `MarketStats` price/volume fields,
  `OrderBookSnapshot.lastUpdate`, `Position` open-position fields, `positionFeeRate`,
  `Withdraw.blockchain_url`, `RialWithdraw.bankAccountInfo`, `UserTrade.orderId` and
  `Order.pairId`. `RialWithdrawStatus` uses `'Partially done'`. `PrivateTradeEvent.type` is
  `'Buy' | 'Sell'`. `orders.list()` returns `ListedOrder` (no `id` unless `details: 2`).
- `margin.listPositions` accepts any positive `pageSize` (default 50). `withdrawals.list`
  accepts pages up to 100.

## [1.0.0] - 2026-09-29

Complete rewrite in TypeScript. See the [migration guide](README.md#migrating-from-0x).

### Added

- `NobitexClient` covering every endpoint of the official API documentation: market data,
  system options, account, wallets, spot orders (limit/market/stop/OCO, batch), margin trading and
  positions, crypto and rial withdrawals, address book, security, referral, portfolio, login/logout
  and API-key management.
- Ed25519 API-key authentication (`Nobitex-Key` / `Nobitex-Signature` / `Nobitex-Timestamp`),
  including support for external signers (KMS/HSM).
- `NobitexClient.fromEnv()` for credentials from environment variables; testnet support.
- Typed error hierarchy (`NobitexApiError`, `NobitexRateLimitError`, …) with all documented error
  codes.
- Automatic handling of rate limits (`backOff`), safe retries for idempotent requests, timeouts
  and `AbortSignal` support.
- Local input validation (money values, symbols, ids, order parameter combinations).
- `nobitex.js/websocket`: typed Centrifugo channels (order book, candles, trades, market stats,
  private orders/trades).
- Dual ESM/CommonJS build with type declarations, Vitest test suite, ESLint and Prettier.

### Changed

- Base URL is now `https://apiv2.nobitex.ir`; the order book uses `/v3/orderbook`.
- Responses are returned as documented by Nobitex instead of being reshaped.
- Requires Node.js 22 or newer. No runtime dependencies (axios removed).

### Removed

- The 0.x function exports (`Price`, `Trades`, `Market`, `Global`, `Account`, …).
- `Global()` — Nobitex deprecated the Binance `global` statistics.

## [0.0.9] - 2022-04-18

- Last JavaScript release (see git history for earlier versions).
