# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/).

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
