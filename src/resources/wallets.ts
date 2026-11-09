import { Resource, type RequestOptions } from '../core/http-client.js';
import type {
  BalanceResponse,
  DepositsParams,
  DepositsResponse,
  GenerateAddressParams,
  GenerateAddressResponse,
  TransactionHistoryParams,
  TransactionsResponse,
  TransferParams,
  TransferResponse,
  WalletSummariesParams,
  WalletSummariesResponse,
  WalletListType,
  WalletTransactionsParams,
  WalletsResponse,
} from '../types/index.js';
import {
  toCommaList,
  toDateOnly,
  toIsoDateTime,
  toPositiveMonetaryString,
  toUnixSeconds,
} from '../utils/format.js';
import {
  assertNonEmptyString,
  assertOneOf,
  assertPagination,
  assertPositiveInteger,
  ensure,
} from '../utils/validation.js';

const WALLET_TYPES = ['spot', 'margin'] as const;
const WALLET_LIST_TYPES = ['spot', 'margin', 'credit', 'debit'] as const;
const ADDRESS_TYPES = ['default', 'legacy'] as const;

/** Unix seconds from a number, `Date` or ISO date-time string. */
function toTimestamp(value: number | Date | string, param: string): number {
  if (typeof value === 'string') return toUnixSeconds(new Date(toIsoDateTime(value, param)), param);
  return toUnixSeconds(value, param);
}

/** Wallets, balances, transactions, deposits and spot ⇄ margin transfers. */
export class WalletsResource extends Resource {
  /**
   * Full wallet list with balances (`POST /users/wallets/list`). `type` defaults to `spot`.
   * Rate limit: 20/min — prefer {@link WalletsResource.getSummaries} for polling. API keys need
   * the `READ` permission.
   */
  list(params: { type?: WalletListType } = {}, options?: RequestOptions): Promise<WalletsResponse> {
    if (params.type !== undefined) assertOneOf(params.type, 'type', WALLET_LIST_TYPES);
    return this.request(
      {
        method: 'POST',
        path: '/users/wallets/list',
        ...(params.type !== undefined && { body: { type: params.type } }),
        idempotent: true,
      },
      options,
    );
  }

  /**
   * Compact balances keyed by upper-case currency (`POST /v2/wallets`). Rate limit: 15/min.
   * API keys need the `READ` permission.
   *
   * @example
   * const { wallets } = await client.wallets.getSummaries({ currencies: ['rls', 'btc'] });
   * wallets.BTC?.balance;
   */
  getSummaries(
    params: WalletSummariesParams = {},
    options?: RequestOptions,
  ): Promise<WalletSummariesResponse> {
    if (params.type !== undefined) assertOneOf(params.type, 'type', WALLET_LIST_TYPES);
    const body: Record<string, unknown> = {};
    if (params.currencies !== undefined) body.currencies = toCommaList(params.currencies);
    if (params.type !== undefined) body.type = params.type;
    return this.request(
      {
        method: 'POST',
        path: '/v2/wallets',
        ...(Object.keys(body).length > 0 && { body }),
        idempotent: true,
      },
      options,
    );
  }

  /**
   * Balance of one currency (`POST /users/wallets/balance`). Rate limit: 60 per 2 min. API keys
   * need the `READ` permission.
   */
  getBalance(currency: string, options?: RequestOptions): Promise<BalanceResponse> {
    assertNonEmptyString(currency, 'currency');
    return this.request(
      {
        method: 'POST',
        path: '/users/wallets/balance',
        body: { currency: currency.toLowerCase() },
        idempotent: true,
      },
      options,
    );
  }

  /**
   * Transactions of one wallet (`GET /users/wallets/transactions/list`). Rate limit: 60 per
   * 2 min. API keys need the `READ` permission.
   */
  getTransactions(
    params: WalletTransactionsParams,
    options?: RequestOptions,
  ): Promise<TransactionsResponse> {
    assertPositiveInteger(params.wallet, 'wallet');
    assertPagination(params);
    return this.request(
      {
        method: 'GET',
        path: '/users/wallets/transactions/list',
        query: { wallet: params.wallet, page: params.page, pageSize: params.pageSize },
      },
      options,
    );
  }

  /**
   * Filterable transaction history across wallets (`GET /users/transactions-history`), 50 per
   * page by default. `from`/`to` are sent as Unix seconds; ranges longer than the server limit
   * are rejected with HTTP 422. Rate limit: 60/hour. API keys need the `READ` permission.
   */
  getTransactionHistory(
    params: TransactionHistoryParams = {},
    options?: RequestOptions,
  ): Promise<TransactionsResponse> {
    assertPagination(params);
    const from = params.from === undefined ? undefined : toTimestamp(params.from, 'from');
    const to = params.to === undefined ? undefined : toTimestamp(params.to, 'to');
    if (from !== undefined && to !== undefined) {
      ensure(from <= to, 'from', 'must be earlier than "to"');
    }
    if (params.fromId !== undefined) assertPositiveInteger(params.fromId, 'fromId');
    return this.request(
      {
        method: 'GET',
        path: '/users/transactions-history',
        query: {
          currency: params.currency,
          tp: params.tp === undefined ? undefined : toCommaList(params.tp),
          from,
          to,
          from_id: params.fromId,
          page: params.page,
          pageSize: params.pageSize,
        },
      },
      options,
    );
  }

  /**
   * Deposits (`GET /users/wallets/deposits/list`) of one wallet or all of them (default). API
   * keys need the `READ` permission. `from`/`to` are not part of the current API reference and
   * may be ignored by the server.
   */
  getDeposits(params: DepositsParams = {}, options?: RequestOptions): Promise<DepositsResponse> {
    if (params.wallet !== undefined && params.wallet !== 'all') {
      assertPositiveInteger(params.wallet, 'wallet');
    }
    assertPagination(params);
    return this.request(
      {
        method: 'GET',
        path: '/users/wallets/deposits/list',
        query: {
          wallet: params.wallet,
          page: params.page,
          pageSize: params.pageSize,
          from: params.from === undefined ? undefined : toDateOnly(params.from, 'from'),
          to: params.to === undefined ? undefined : toDateOnly(params.to, 'to'),
        },
      },
      options,
    );
  }

  /**
   * Generates a deposit address for the spot wallet (`POST /users/wallets/generate-address`).
   * Identify the wallet by `currency` or `wallet` id (the id wins when both are sent).
   * Rate limit: 30/hour. API keys need the `DEPOSIT` permission.
   *
   * @example
   * const { address } = await client.wallets.generateAddress({ currency: 'usdt', network: 'TRX' });
   */
  generateAddress(
    params: GenerateAddressParams,
    options?: RequestOptions,
  ): Promise<GenerateAddressResponse> {
    const body: Record<string, unknown> = {};
    ensure(
      params.currency !== undefined || params.wallet !== undefined,
      'currency',
      'either "currency" or "wallet" is required',
    );
    if (params.currency !== undefined) {
      assertNonEmptyString(params.currency, 'currency');
      body.currency = params.currency.toLowerCase();
    }
    if (params.wallet !== undefined) {
      assertPositiveInteger(params.wallet, 'wallet');
      body.wallet = params.wallet;
    }
    if (params.network !== undefined) body.network = params.network;
    if (params.addressType !== undefined) {
      assertOneOf(params.addressType, 'addressType', ADDRESS_TYPES);
      body.addressType = params.addressType;
    }
    return this.request({ method: 'POST', path: '/users/wallets/generate-address', body }, options);
  }

  /**
   * Moves funds between the spot and margin wallets (`POST /wallets/transfer`). Rate limit: 10/min.
   * Token only — the API reference does not list API-key support for this endpoint.
   *
   * @example
   * await client.wallets.transfer({ currency: 'usdt', amount: '100', src: 'spot', dst: 'margin' });
   */
  transfer(params: TransferParams, options?: RequestOptions): Promise<TransferResponse> {
    assertNonEmptyString(params.currency, 'currency');
    assertOneOf(params.src, 'src', WALLET_TYPES);
    assertOneOf(params.dst, 'dst', WALLET_TYPES);
    ensure(params.src !== params.dst, 'dst', 'must differ from "src"');
    return this.request(
      {
        method: 'POST',
        path: '/wallets/transfer',
        body: {
          currency: params.currency.toLowerCase(),
          amount: toPositiveMonetaryString(params.amount, 'amount'),
          src: params.src,
          dst: params.dst,
        },
      },
      options,
    );
  }
}
