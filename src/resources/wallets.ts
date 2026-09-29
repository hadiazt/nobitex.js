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
  WalletTransactionsParams,
  WalletType,
  WalletsResponse,
} from '../types/index.js';
import {
  toCommaList,
  toDateOnly,
  toIsoDateTime,
  toPositiveMonetaryString,
} from '../utils/format.js';
import {
  assertNonEmptyString,
  assertOneOf,
  assertPagination,
  assertPositiveInteger,
  ensure,
} from '../utils/validation.js';

const WALLET_TYPES = ['spot', 'margin'] as const;

/** Wallets, balances, transactions, deposits and spot ⇄ margin transfers. */
export class WalletsResource extends Resource {
  /**
   * Full wallet list with balances and deposit addresses (`GET /users/wallets/list`).
   * Rate limit: 20 per 2 min — prefer {@link WalletsResource.getSummaries} for polling.
   */
  list(params: { type?: WalletType } = {}, options?: RequestOptions): Promise<WalletsResponse> {
    if (params.type !== undefined) assertOneOf(params.type, 'type', WALLET_TYPES);
    return this.request(
      { method: 'GET', path: '/users/wallets/list', query: { type: params.type } },
      options,
    );
  }

  /**
   * Compact balances keyed by upper-case currency (`GET /v2/wallets`). Rate limit: 15/min.
   *
   * @example
   * const { wallets } = await client.wallets.getSummaries({ currencies: ['rls', 'btc'] });
   * wallets.BTC?.balance;
   */
  getSummaries(
    params: WalletSummariesParams = {},
    options?: RequestOptions,
  ): Promise<WalletSummariesResponse> {
    if (params.type !== undefined) assertOneOf(params.type, 'type', WALLET_TYPES);
    return this.request(
      {
        method: 'GET',
        path: '/v2/wallets',
        query: {
          currencies: params.currencies && toCommaList(params.currencies),
          type: params.type,
        },
      },
      options,
    );
  }

  /** Balance of one currency (`POST /users/wallets/balance`). Rate limit: 60 per 2 min. */
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

  /** Transactions of one wallet (`GET /users/wallets/transactions/list`), 50 per page by default. */
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
   * Filterable transaction history across wallets (`GET /users/transactions-history`).
   * The `from`–`to` range may span at most 90 days. Rate limit: 60/hour.
   */
  getTransactionHistory(
    params: TransactionHistoryParams = {},
    options?: RequestOptions,
  ): Promise<TransactionsResponse> {
    assertPagination(params);
    const from = params.from === undefined ? undefined : toIsoDateTime(params.from, 'from');
    const to = params.to === undefined ? undefined : toIsoDateTime(params.to, 'to');
    if (from !== undefined && to !== undefined) {
      ensure(new Date(from) <= new Date(to), 'from', 'must be earlier than "to"');
    }
    if (params.fromId !== undefined) assertPositiveInteger(params.fromId, 'fromId');
    return this.request(
      {
        method: 'GET',
        path: '/users/transactions-history',
        query: {
          currency: params.currency,
          tp: params.tp,
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

  /** Crypto deposits of the last 3 months (`GET /users/wallets/deposits/list`). */
  getDeposits(params: DepositsParams = {}, options?: RequestOptions): Promise<DepositsResponse> {
    if (params.wallet !== undefined) assertPositiveInteger(params.wallet, 'wallet');
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
   * Generates a deposit address (`POST /users/wallets/generate-address`). Rate limit: 30/hour.
   *
   * @example
   * const { address } = await client.wallets.generateAddress({ currency: 'usdt', network: 'TRX' });
   */
  generateAddress(
    params: GenerateAddressParams,
    options?: RequestOptions,
  ): Promise<GenerateAddressResponse> {
    let body: Record<string, unknown>;
    if ('currency' in params) {
      assertNonEmptyString(params.currency, 'currency');
      body = { currency: params.currency.toLowerCase() };
    } else {
      assertPositiveInteger(params.wallet, 'wallet');
      body = { wallet: params.wallet };
    }
    if (params.network !== undefined) body.network = params.network;
    return this.request({ method: 'POST', path: '/users/wallets/generate-address', body }, options);
  }

  /**
   * Moves funds between the spot and margin wallets (`POST /wallets/transfer`). Rate limit: 10/min.
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
