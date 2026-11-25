import { Resource, type RequestOptions } from '../core/http-client.js';
import type {
  DepositAddressResponse,
  DepositAddressesResponse,
  GenerateDepositAddressParams,
  ListDepositAddressesParams,
  UpdateDepositAddressTitleParams,
} from '../types/index.js';
import {
  assertNonEmptyString,
  assertOneOf,
  assertPositiveInteger,
  ensure,
} from '../utils/validation.js';

/** Maximum length of a deposit-address title (after trimming). */
const TITLE_MAX_LENGTH = 256;

/** Validates an optional title; blank titles are kept as-is (the server stores them as `null`). */
function assertTitle(title: unknown): void {
  if (title === undefined || title === null) return;
  ensure(typeof title === 'string', 'title', 'must be a string or null');
  ensure(
    title.trim().length <= TITLE_MAX_LENGTH,
    'title',
    `must be at most ${TITLE_MAX_LENGTH} characters`,
  );
}

/**
 * Multiple deposit addresses per coin and network: list them, generate additional ones and name
 * them. All endpoints accept a token or an API key with the `DEPOSIT` permission and are only
 * available when the feature is enabled for the user (`FeatureUnavailable` otherwise).
 *
 * Tag/memo networks (XRP, TON) are not supported (`NetworkNotSupported`). For the single,
 * stable address of a wallet use `client.wallets.generateAddress()`.
 */
export class DepositAddressesResource extends Resource {
  /**
   * The user's deposit addresses for a coin and network
   * (`GET /users/wallets/deposit/address/list`), newest first, 50 per page by default.
   * Addresses created before 2025-06-18 are not listed; users without access to the pair get an
   * empty list. Rate limit: 10/min.
   *
   * @example
   * const { addresses } = await client.depositAddresses.list({ coin: 'eth', network: 'ETH', isDisabled: false });
   */
  list(
    params: ListDepositAddressesParams,
    options?: RequestOptions,
  ): Promise<DepositAddressesResponse> {
    assertNonEmptyString(params.coin, 'coin');
    assertNonEmptyString(params.network, 'network');
    if (params.ordering !== undefined) {
      assertOneOf(params.ordering, 'ordering', ['created_at', '-created_at'] as const);
    }
    if (params.isDisabled !== undefined) {
      ensure(typeof params.isDisabled === 'boolean', 'isDisabled', 'must be a boolean');
    }
    if (params.page !== undefined) assertPositiveInteger(params.page, 'page');
    if (params.pageSize !== undefined) assertPositiveInteger(params.pageSize, 'pageSize');
    return this.request(
      {
        method: 'GET',
        path: '/users/wallets/deposit/address/list',
        query: {
          network: params.network,
          coin: params.coin,
          ordering: params.ordering,
          is_disabled: params.isDisabled,
          search: params.search,
          page: params.page,
          pageSize: params.pageSize,
        },
      },
      options,
    );
  }

  /**
   * Generates a **new** deposit address (`POST /users/wallets/deposit/address/generate`). Unlike
   * `wallets.generateAddress()`, every successful call creates another address; earlier ones stay
   * active. Requires user level 1. Rate limit: 5/min.
   *
   * Creation stops with `NoConfirmedWalletDepositLimitation` while you already hold the maximum
   * number of active addresses without a detected deposit on that network. Never retried
   * automatically, because a retry could create an extra address.
   *
   * @example
   * const { address } = await client.depositAddresses.generate({ coin: 'usdt', network: 'TRX', title: 'customer 42' });
   */
  generate(
    params: GenerateDepositAddressParams,
    options?: RequestOptions,
  ): Promise<DepositAddressResponse> {
    assertNonEmptyString(params.coin, 'coin');
    assertNonEmptyString(params.network, 'network');
    assertTitle(params.title);
    return this.request(
      {
        method: 'POST',
        path: '/users/wallets/deposit/address/generate',
        body: {
          coin: params.coin,
          network: params.network,
          ...(params.title !== undefined && { title: params.title }),
        },
      },
      options,
    );
  }

  /**
   * Renames a deposit address (`POST /users/wallets/deposit/address/update`); the address and
   * network do not change. Omit, pass `null` or a blank title to clear it. The response contains
   * the stored source network (Harmony addresses come back as `ETH` / `0x…`). Rate limit: 1/min.
   */
  updateTitle(
    params: UpdateDepositAddressTitleParams,
    options?: RequestOptions,
  ): Promise<DepositAddressResponse> {
    assertPositiveInteger(params.addressId, 'addressId');
    assertTitle(params.title);
    return this.request(
      {
        method: 'POST',
        path: '/users/wallets/deposit/address/update',
        body: {
          address_id: params.addressId,
          ...(params.title !== undefined && { title: params.title }),
        },
        idempotent: true,
      },
      options,
    );
  }
}
