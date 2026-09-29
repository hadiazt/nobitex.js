<h1 align="center">
<img src="https://avatars.githubusercontent.com/u/36210353?s=200&v=4" width="160" alt="Nobitex" /><br/>
nobitex.js
</h1>

<p align="center">
A fully typed, zero-dependency TypeScript SDK for the <a href="https://nobitex.ir">Nobitex</a> cryptocurrency exchange API.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/nobitex.js"><img alt="npm" src="https://img.shields.io/npm/v/nobitex.js"></a>
  <img alt="types" src="https://img.shields.io/npm/types/nobitex.js">
  <img alt="node" src="https://img.shields.io/node/v/nobitex.js">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-brightgreen">
</p>

- **Complete**: covers every endpoint in the [official API docs](https://apidocs.nobitex.ir): market data, spot and margin trading, wallets, deposits, crypto and rial withdrawals, address book, security, referral, portfolio, API keys and WebSocket.
- **Type-safe**: every request, response and error is typed. Invalid parameter combinations fail at compile time (for example a limit order without a price).
- **Safe by default**:
  - Inputs are validated locally before anything is sent.
  - Money values are sent as decimal strings.
  - Orders and withdrawals are never retried automatically.
  - Credentials never appear in logs, errors or `JSON.stringify`.
- **Resilient**: honours Nobitex rate limits (`backOff`), retries idempotent requests with exponential back-off, and supports timeouts and `AbortSignal`.
- **Modern**: it uses native `fetch` and Web Crypto (Ed25519 API-key signing) and has no runtime dependencies. It ships ESM and CommonJS builds and runs on Node.js ≥ 22, Bun, Deno and edge runtimes.

> [!IMPORTANT]
> Nobitex only accepts API requests from **Iranian IP addresses** (use `baseUrl` or a custom `fetch` to go through a proxy), and requires compliance with the [Nobitex API terms](https://apidocs.nobitex.ir/terms/).

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Authentication](#authentication)
- [Usage](#usage)
- [Error handling](#error-handling)
- [Rate limits, retries and timeouts](#rate-limits-retries-and-timeouts)
- [WebSocket](#websocket)
- [Configuration reference](#configuration-reference)
- [API reference](#api-reference)
- [Migrating from 0.x](#migrating-from-0x)
- [Development](#development)

## Installation

```bash
npm install nobitex.js
# optional, only for real-time data via `nobitex.js/websocket`
npm install centrifuge
```

## Quick start

```ts
import { NobitexClient } from 'nobitex.js';

const client = new NobitexClient();

const { asks, bids, lastTradePrice } = await client.market.getOrderBook('BTCIRT');
console.log(`last: ${lastTradePrice} | best ask: ${asks[0]?.[0]} | best bid: ${bids[0]?.[0]}`);
```

CommonJS works too: `const { NobitexClient } = require('nobitex.js');`

## Authentication

Public endpoints (market data, system options) need no credentials. For everything else, use **either** a token **or** an API key.

### Environment variables (recommended)

Never hard-code credentials. Put them in `.env` (see [`.env.example`](.env.example)), keep that file out of git, and load it with `node --env-file=.env app.js`:

```bash
NOBITEX_TOKEN=your-token
# or
NOBITEX_API_KEY=your-public-key
NOBITEX_API_PRIVATE_KEY=your-private-key
# optional
NOBITEX_ENV=testnet
```

```ts
import { NobitexClient } from 'nobitex.js';

const client = NobitexClient.fromEnv(); // reads process.env
```

### Token

Copy a token from **Profile → Settings** in the [Nobitex panel](https://nobitex.ir/app/settings/). It is valid for 30 days when "remember me" was selected at login.

```ts
const client = new NobitexClient({ token: process.env.NOBITEX_TOKEN });
```

You can also log in programmatically. This requires an Iranian IP and 2FA enabled on the account; tokens last 4 hours, or 30 days with `remember: true`:

```ts
const client = new NobitexClient();
await client.auth.login(
  { username: 'me@example.com', password: process.env.NOBITEX_PASSWORD!, remember: true },
  { totp: '123456' }, // current 2FA code
);
// The client now uses the returned token. Revoke it with:
await client.auth.logout();
```

### API key (Ed25519)

API keys can be limited to `READ`, `TRADE` and/or `WITHDRAW`, restricted to IP addresses, and given an expiry date. Requests are signed automatically:
`Nobitex-Signature = base64(Ed25519(timestamp + method + path + body))`.

```ts
const client = new NobitexClient({
  apiKey: { key: process.env.NOBITEX_API_KEY!, privateKey: process.env.NOBITEX_API_PRIVATE_KEY! },
});
```

To keep the private key outside your process (KMS, HSM, vault), pass a signer instead:

```ts
const client = new NobitexClient({
  apiKey: { key: publicKey, sign: async (message: Uint8Array) => myKms.signEd25519(message) },
});
```

Create keys with `client.apiKeys.create(...)`; see [`examples/api-key.ts`](examples/api-key.ts).

### Testnet

```ts
const client = new NobitexClient({ environment: 'testnet', token: testnetToken }); // https://testnetapiv2.nobitex.ir
```

## Usage

All methods return a `Promise` of the documented response body. Money values are **strings**; keep them as strings or use a decimal library.

### Market data

```ts
const book = await client.market.getOrderBook('BTCIRT');
const books = await client.market.getAllOrderBooks(); // { BTCIRT: {...}, USDTIRT: {...}, ... }
const { trades } = await client.market.getTrades('USDTIRT');
const { stats } = await client.market.getStats({ srcCurrency: 'btc', dstCurrency: 'rls' });

import { toCandles } from 'nobitex.js';
const ohlc = await client.market.getOHLC({
  symbol: 'BTCIRT',
  resolution: '60',
  to: new Date(),
  countback: 24,
});
const candles = toCandles(ohlc); // [{ time, open, high, low, close, volume }, ...]

const options = await client.system.getOptions(); // currencies, networks, fees, min orders, precisions
```

### Account and wallets

```ts
const { profile, websocketAuthParam } = await client.account.getProfile();
const { limitations } = await client.account.getLimitations();

const { wallets } = await client.wallets.list();
const { wallets: summary } = await client.wallets.getSummaries({ currencies: ['rls', 'usdt'] });
const { balance } = await client.wallets.getBalance('usdt');
const { transactions, hasNext } = await client.wallets.getTransactionHistory({
  currency: 'usdt',
  tp: 'deposit',
});
const { address } = await client.wallets.generateAddress({ currency: 'usdt', network: 'TRX' });
```

### Spot trading

```ts
// Limit order. Prices in rial markets are in rials (not tomans).
const { order } = await client.orders.create({
  type: 'buy',
  srcCurrency: 'btc',
  dstCurrency: 'rls',
  amount: '0.001',
  price: '5000000000',
  clientOrderId: 'my-order-1',
});

// Market order. Always pass `price` as a slippage guard.
await client.orders.create({
  type: 'sell',
  srcCurrency: 'usdt',
  dstCurrency: 'rls',
  amount: '50',
  execution: 'market',
  price: '600000',
});

// Stop-limit and OCO orders
await client.orders.create({
  type: 'sell',
  srcCurrency: 'btc',
  dstCurrency: 'usdt',
  amount: '0.01',
  execution: 'stop_limit',
  stopPrice: '58000',
  price: '57900',
});
const { orders } = await client.orders.create({
  type: 'buy',
  srcCurrency: 'btc',
  dstCurrency: 'usdt',
  amount: '0.01',
  mode: 'oco',
  price: '42390',
  stopPrice: '42700',
  stopLimitPrice: '42715',
}); // OCO returns both linked orders

await client.orders.getStatus({ clientOrderId: 'my-order-1' });
await client.orders.list({ status: 'open', details: 2 });
await client.orders.cancel(order.id);
await client.orders.cancelBulk({ srcCurrency: 'btc', dstCurrency: 'rls', hours: 1 });
await client.orders.listTrades({ srcCurrency: 'btc', dstCurrency: 'rls' });
```

### Margin trading

```ts
await client.wallets.transfer({ currency: 'usdt', amount: '100', src: 'spot', dst: 'margin' });
const { limits } = await client.margin.getDelegationLimit('BTCUSDT');
const { order } = await client.margin.createOrder({
  srcCurrency: 'btc',
  dstCurrency: 'usdt',
  type: 'buy',
  leverage: 2,
  amount: '0.001',
  price: '60000',
});
const { positions } = await client.margin.listPositions({ status: 'active' });
await client.margin.closePosition(positions[0]!.id, {
  amount: positions[0]!.liability!,
  price: '65000',
});
```

### Withdrawals

```ts
// Crypto: addresses outside the address book need 2FA plus an OTP confirmation
const { withdraw } = await client.withdrawals.create(
  { wallet: 3456, network: 'TRX', address: 'T...', amount: '25' },
  { totp: '123456' },
);
await client.withdrawals.confirm({ withdraw: withdraw.id, otp: '654321' });

// Rial: to a confirmed bank account from `profile.bankAccounts`
const { result } = await client.rialWithdrawals.create({
  destinationBankAccountId: 13568,
  amount: '25000000',
});
await client.rialWithdrawals.cancel(result.id); // possible within 3 minutes
```

Every other endpoint (address book, security, referral, portfolio, API keys) is listed in the [API reference](#api-reference). For an endpoint that isn't wrapped yet, use the typed escape hatch, which shares authentication, errors and retries:

```ts
const res = await client.request<{ status: 'ok'; count: number }>({
  method: 'GET',
  path: '/market/orders/open-count',
  query: { tradeType: 'spot' },
});
```

## Error handling

Every error thrown by the SDK extends `NobitexError`:

| Class                          | When                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `NobitexValidationError`       | Invalid input, detected locally. **Nothing was sent.** `error.param` names the field.                                                |
| `NobitexCredentialsError`      | A protected endpoint was called without a token or API key.                                                                          |
| `NobitexApiError`              | Nobitex rejected the request: a non-2xx status, or HTTP 200 with `status: "failed"`. Has `code`, `httpStatus`, `body` and `request`. |
| ↳ `NobitexAuthenticationError` | HTTP 401: invalid or expired token or signature.                                                                                     |
| ↳ `NobitexPermissionError`     | HTTP 403.                                                                                                                            |
| ↳ `NobitexNotFoundError`       | HTTP 404.                                                                                                                            |
| ↳ `NobitexRateLimitError`      | HTTP 429 / `TooManyRequests`. Has `backOff` (seconds) and `limit`.                                                                   |
| ↳ `NobitexServerError`         | HTTP 5xx.                                                                                                                            |
| `NobitexTimeoutError`          | No response within `timeout`.                                                                                                        |
| `NobitexNetworkError`          | DNS, TLS or connection failure (`error.cause` holds the original error).                                                             |

```ts
import { NobitexApiError, NobitexValidationError, isNobitexApiError } from 'nobitex.js';

try {
  await client.orders.create({
    type: 'buy',
    srcCurrency: 'btc',
    dstCurrency: 'rls',
    amount: '0.0001',
    price: '100',
  });
} catch (error) {
  if (isNobitexApiError(error, 'SmallOrder')) {
    // `code` autocompletes all documented Nobitex error codes
  } else if (error instanceof NobitexApiError) {
    console.error(error.code, error.httpStatus, error.body);
  } else if (error instanceof NobitexValidationError) {
    console.error(error.param, error.message);
  } else {
    throw error;
  }
}
```

## Rate limits, retries and timeouts

- **Rate limits.** On HTTP 429, the client waits for the server's `backOff` and retries, up to `maxRetries`. If the wait would exceed `maxRateLimitWaitMs` (30 s by default), it throws `NobitexRateLimitError` instead. This matters because Nobitex blocks a token for 2 minutes if rate limits are ignored repeatedly.
- **Retries.** Network errors, timeouts and 5xx responses are retried with exponential back-off and jitter, but **only for idempotent requests**: GETs and read-style POSTs such as order status. Order placement and withdrawals are **never** retried automatically, so you can't accidentally place a duplicate order. Use `clientOrderId` to make your own retries safe.
- **Fail fast.** Protected endpoints throw locally when no credentials are set. This avoids the IP ban Nobitex applies after 100 failed authentications in 30 minutes.
- **Timeouts and cancellation.** Every method accepts `{ timeout, signal }` as its last argument.

```ts
const client = new NobitexClient({
  timeout: 10_000,
  retry: { maxRetries: 3, maxRateLimitWaitMs: 60_000 }, // or `retry: false`
});

const controller = new AbortController();
await client.market.getOrderBook('BTCIRT', { signal: controller.signal, timeout: 2_000 });
```

## WebSocket

Real-time order books, candles, trades, market stats and private order/trade events are delivered over Nobitex's Centrifugo server. Install the optional peer dependency `centrifuge`, then:

```ts
import { NobitexClient } from 'nobitex.js';
import { NobitexWebSocket, channels } from 'nobitex.js/websocket';

const client = NobitexClient.fromEnv();
const ws = await NobitexWebSocket.create({ client }); // `client` provides tokens for private channels

// Payload types are inferred from the channel name
const unsubscribe = ws.subscribe(channels.orderBook('BTCIRT'), (book) => console.log(book.bids[0]));
ws.subscribe(channels.candle('BTCIRT', '5'), (candle) => console.log(candle.c));
ws.subscribe(channels.marketStats('USDTIRT'), (stats) => console.log(stats.latest));

const { websocketAuthParam } = await client.account.getProfile();
ws.subscribe(channels.privateOrders(websocketAuthParam), (event) => console.log(event.status));

ws.connect();
```

Channels: `orderBook(symbol)`, `candle(symbol, resolution)`, `trades(symbol)`, `marketStats(symbol)`, `allMarketStats()`, `privateOrders(authParam)`, `privateTrades(authParam)`. Fossil delta compression is on by default and cuts bandwidth by about 60%. `ws.raw` exposes the underlying `Centrifuge` instance.

## Configuration reference

| Option        | Default                                                                                                    | Description                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `token`       | —                                                                                                          | API token. Mutually exclusive with `apiKey`.                                        |
| `apiKey`      | —                                                                                                          | `{ key, privateKey }` or `{ key, sign }`.                                           |
| `environment` | `'production'`                                                                                             | `'production'` or `'testnet'`.                                                      |
| `baseUrl`     | per environment                                                                                            | Custom REST URL, e.g. a reverse proxy. Must be `https`.                             |
| `timeout`     | `30000`                                                                                                    | Per-request timeout in ms.                                                          |
| `userAgent`   | `TraderBot/nobitex.js-<version>`                                                                           | Nobitex asks bots to use the `TraderBot/<name>` form.                               |
| `retry`       | `{ maxRetries: 2, retryOnRateLimit: true, maxRateLimitWaitMs: 30000, baseDelayMs: 500, maxDelayMs: 8000 }` | Set to `false` to disable retries.                                                  |
| `fetch`       | `globalThis.fetch`                                                                                         | Inject undici with a proxy agent, a mock, etc.                                      |
| `hooks`       | —                                                                                                          | `onRequest` / `onResponse` for logging and metrics. Credentials are never included. |

## API reference

Every method takes an optional last argument `{ signal?, timeout?, headers? }`. Methods marked 🔐 require credentials, and 🔑 methods may need `{ totp }`.

<details open>
<summary><b>Market data & system</b>: <code>client.market</code>, <code>client.system</code></summary>

| Method                                                                 | Endpoint                     |
| ---------------------------------------------------------------------- | ---------------------------- |
| `market.getOrderBook(symbol)`                                          | `GET /v3/orderbook/{symbol}` |
| `market.getAllOrderBooks()`                                            | `GET /v3/orderbook/all`      |
| `market.getDepth(symbol)`                                              | `GET /v2/depth/{symbol}`     |
| `market.getTrades(symbol)`                                             | `GET /v2/trades/{symbol}`    |
| `market.getStats({ srcCurrency?, dstCurrency? })`                      | `GET /market/stats`          |
| `market.getOHLC({ symbol, resolution, to, from?, countback?, page? })` | `GET /market/udf/history`    |
| `system.getOptions()`                                                  | `GET /v2/options`            |

</details>

<details>
<summary><b>Account</b>: <code>client.account</code> 🔐</summary>

| Method                                    | Endpoint                         |
| ----------------------------------------- | -------------------------------- |
| `getProfile()`                            | `GET /users/profile`             |
| `getLimitations()`                        | `GET /users/limitations`         |
| `addCard({ number, bank })`               | `POST /users/cards-add`          |
| `addBankAccount({ number, shaba, bank })` | `POST /users/accounts-add`       |
| `getFavoriteMarkets()`                    | `GET /users/markets/favorite`    |
| `addFavoriteMarkets(markets)`             | `POST /users/markets/favorite`   |
| `removeFavoriteMarket(market \| 'All')`   | `DELETE /users/markets/favorite` |

</details>

<details>
<summary><b>Wallets</b>: <code>client.wallets</code> 🔐</summary>

| Method                                                           | Endpoint                               |
| ---------------------------------------------------------------- | -------------------------------------- |
| `list({ type? })`                                                | `GET /users/wallets/list`              |
| `getSummaries({ currencies?, type? })`                           | `GET /v2/wallets`                      |
| `getBalance(currency)`                                           | `POST /users/wallets/balance`          |
| `getTransactions({ wallet, page?, pageSize? })`                  | `GET /users/wallets/transactions/list` |
| `getTransactionHistory({ currency?, tp?, from?, to?, fromId? })` | `GET /users/transactions-history`      |
| `getDeposits({ wallet?, from?, to? })`                           | `GET /users/wallets/deposits/list`     |
| `generateAddress({ currency, network? })`                        | `POST /users/wallets/generate-address` |
| `transfer({ currency, amount, src, dst })`                       | `POST /wallets/transfer`               |

</details>

<details>
<summary><b>Spot orders</b>: <code>client.orders</code> 🔐</summary>

| Method                                                                                                    | Endpoint                            |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `create(params)` (limit, market, stop_limit, stop_market, OCO)                                            | `POST /market/orders/add`           |
| `getStatus({ id } \| { clientOrderId })`                                                                  | `POST /market/orders/status`        |
| `list({ status?, type?, execution?, tradeType?, srcCurrency?, dstCurrency?, details?, fromId?, order? })` | `GET /market/orders/list`           |
| `updateStatus({ order \| clientOrderId, status })`                                                        | `POST /market/orders/update-status` |
| `cancel(id \| { clientOrderId })`                                                                         | `POST /market/orders/update-status` |
| `cancelBulk({ hours?, execution?, tradeType?, srcCurrency?, dstCurrency? })`                              | `POST /market/orders/cancel-old`    |
| `listTrades({ srcCurrency?, dstCurrency?, fromId? })`                                                     | `GET /market/trades/list`           |
| `batchCreate(orders, { pro? })` _(experimental)_                                                          | `POST /market/orders/batch-add`     |
| `batchCancel(orderIds)` _(experimental)_                                                                  | `POST /market/orders/cancel-batch`  |
| `getOpenCount({ tradeType? })` _(experimental)_                                                           | `GET /market/orders/open-count`     |

</details>

<details>
<summary><b>Margin</b>: <code>client.margin</code> 🔐</summary>

| Method                                                   | Endpoint                               |
| -------------------------------------------------------- | -------------------------------------- |
| `getMarkets()` (credentials optional)                    | `GET /margin/markets/list`             |
| `getLiquidityPools()`                                    | `GET /liquidity-pools/list`            |
| `getDelegationLimit(market)`                             | `GET /margin/v2/delegation-limit`      |
| `createOrder(params)` (incl. OCO)                        | `POST /margin/orders/add`              |
| `listPositions({ srcCurrency?, dstCurrency?, status? })` | `GET /positions/list`                  |
| `getPosition(id)`                                        | `GET /positions/{id}/status`           |
| `closePosition(id, params)` (incl. OCO)                  | `POST /positions/{id}/close`           |
| `editCollateral(id, collateral)`                         | `POST /positions/{id}/edit-collateral` |

</details>

<details>
<summary><b>Withdrawals</b>: <code>client.withdrawals</code>, <code>client.rialWithdrawals</code> 🔐</summary>

| Method                                                         | Endpoint                               |
| -------------------------------------------------------------- | -------------------------------------- |
| `withdrawals.create(params, { totp })` 🔑                      | `POST /users/wallets/withdraw`         |
| `withdrawals.confirm({ withdraw, otp? })`                      | `POST /users/wallets/withdraw-confirm` |
| `withdrawals.get(id)`                                          | `GET /withdraws/{id}`                  |
| `withdrawals.list({ wallet?, from?, to? })`                    | `GET /users/wallets/withdraws/list`    |
| `rialWithdrawals.create({ destinationBankAccountId, amount })` | `POST /cobank/withdraw`                |
| `rialWithdrawals.cancel(id)`                                   | `POST /cobank/withdraw/{id}/cancel`    |
| `rialWithdrawals.get(id)`                                      | `GET /cobank/withdraw/{id}`            |

</details>

<details>
<summary><b>Address book, security, referral, portfolio</b> 🔐</summary>

| Method                                                                 | Endpoint                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `addressBook.list({ network? })`                                       | `GET /address_book`                                  |
| `addressBook.add({ title, network, address, tag?, otpCode, tfaCode })` | `POST /address_book`                                 |
| `addressBook.delete(id)`                                               | `DELETE /address_book/{id}/delete`                   |
| `addressBook.activateWhitelist()`                                      | `POST /address_book/whitelist/activate`              |
| `addressBook.deactivateWhitelist({ otpCode, tfaCode })`                | `POST /address_book/whitelist/deactivate`            |
| `security.getLoginAttempts()`                                          | `GET /users/login-attempts`                          |
| `security.activateEmergencyCancel()`                                   | `GET /security/emergency-cancel/activate`            |
| `security.setAntiPhishingCode({ code, otpCode })`                      | `POST /security/anti-phishing`                       |
| `security.getAntiPhishingCode()`                                       | `GET /security/anti-phishing`                        |
| `security.requestOtp({ type, usage })`                                 | `POST /v2/otp/request`                               |
| `referral.listLinks()`                                                 | `GET /users/referral/links-list`                     |
| `referral.createLink({ friendShare? })`                                | `POST /users/referral/links-add`                     |
| `referral.getStatus()`                                                 | `GET /users/referral/referral-status`                |
| `referral.setReferrer(code)`                                           | `POST /users/referral/set-referrer`                  |
| `portfolio.getDailyProfit({ monthly? })`                               | `POST /users/portfolio/last-week-daily-profit`       |
| `portfolio.getDailyTotalProfit()`                                      | `POST /users/portfolio/last-week-daily-total-profit` |
| `portfolio.getMonthlyTotalProfit()`                                    | `POST /users/portfolio/last-month-total-profit`      |

</details>

<details>
<summary><b>Auth & API keys</b>: <code>client.auth</code>, <code>client.apiKeys</code></summary>

| Method                                                                                       | Endpoint                     |
| -------------------------------------------------------------------------------------------- | ---------------------------- |
| `auth.login({ username, password, remember?, device? }, { totp })` 🔑                        | `POST /auth/login/`          |
| `auth.logout()` 🔐                                                                           | `POST /auth/logout/`         |
| `auth.getWebSocketToken()` 🔐                                                                | `GET /auth/ws/token/`        |
| `apiKeys.create({ name, permissions, ipAddressesWhitelist?, expirationDate? }, { totp })` 🔑 | `POST /apikeys/create`       |
| `apiKeys.list()` 🔐                                                                          | `GET /apikeys/list`          |
| `apiKeys.update(publicKey, { name?, description?, ipAddressesWhitelist? })` 🔐               | `POST /apikeys/update/{key}` |
| `apiKeys.delete(publicKey)` 🔐                                                               | `POST /apikeys/delete/{key}` |

</details>

Full request and response types are exported from the package root (for example `import type { Order, Position, ProfileResponse } from 'nobitex.js'`), and every method has TSDoc with rate limits and examples.

## Migrating from 0.x

Version 1.0 is a complete rewrite. The old functions swallowed errors (they logged to the console and left the promise pending), used deprecated endpoints and reshaped responses. Now every method either returns the documented response or throws a typed error.

| 0.x                                            | 1.x                                                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `nobitex.Price({ type })`                      | `client.market.getOrderBook(symbol)` (`asks` = sell side, `bids` = buy side)                  |
| `nobitex.Trades({ type })`                     | `client.market.getTrades(symbol)` (`time` is Unix ms, no longer a locale string)              |
| `nobitex.Market({ from, to })`                 | `client.market.getStats({ srcCurrency, dstCurrency })` (returns an object, not a JSON string) |
| `nobitex.Global()`                             | Removed. Nobitex deprecated the Binance `global` stats.                                       |
| `nobitex.Account({ token })`                   | `client.account.getProfile()` (original field names)                                          |
| `nobitex.CreateWallet({ token, type })`        | `client.wallets.generateAddress({ currency, network? })`                                      |
| `nobitex.AddCard(...)` / `AddBankAccount(...)` | `client.account.addCard(...)` / `addBankAccount(...)`                                         |
| `nobitex.AccountLimitations({ token })`        | `client.account.getLimitations()`                                                             |
| `nobitex.AccountWallets({ token })`            | `client.wallets.list()` (no longer filtered to wallets with a deposit address)                |
| `nobitex.AccountBalance({ token, type })`      | `client.wallets.getBalance(currency)`                                                         |
| `nobitex.LoginLog({ token })`                  | `client.security.getLoginAttempts()`                                                          |
| `nobitex.EmergencyCancel({ token })`           | `client.security.activateEmergencyCancel()`                                                   |

The token is now passed once, to the client constructor (or through `NOBITEX_TOKEN`), instead of to every call. The base URL moved to `https://apiv2.nobitex.ir`, as required by Nobitex since mid-2025.

## Development

```bash
npm install
npm run check            # typecheck + lint + format check + tests + build + export validation
npm test                 # unit and mock-server integration tests
npm run test:coverage
npm run test:integration # live read-only smoke tests (needs an Iranian IP)
npm run build            # dist/ (ESM + CJS + .d.ts) via tsdown
```

Project layout:

```text
src/
  client.ts          NobitexClient: wires resources together, fromEnv(), escape hatch
  core/              HTTP transport (retries, rate limits, timeouts), auth (token / Ed25519), options
  resources/         one class per API area (market, orders, margin, wallets, ...)
  types/             request/response types per domain
  errors/            error hierarchy and known error codes
  utils/             validation, money/date formatting, query building
  websocket/         channel builders, payload types, Centrifuge wrapper (nobitex.js/websocket)
tests/
  unit/              endpoint mapping for every method, HTTP core, auth, validation, websocket
  integration/       local mock-server end-to-end tests; opt-in live API tests
  types/             compile-time API tests
  fixtures/          response samples from the official docs, type-checked against the SDK
examples/            runnable, type-checked examples
```

Contributions are welcome; please open an issue or pull request on [GitHub](https://github.com/hadiazt/nobitex.js). Report security issues privately, as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © [hadi-az](https://github.com/hadiazt). This is an unofficial SDK and is not affiliated with Nobitex. By using it you agree to the [Nobitex API terms of use](https://apidocs.nobitex.ir/terms/).
