import { Resource, type RequestOptions, type TotpRequestOptions } from '../core/http-client.js';
import type {
  ConfirmWithdrawParams,
  CreateRialWithdrawParams,
  CreateWithdrawParams,
  ListWithdrawsParams,
  ListWithdrawsResponse,
  RialWithdrawResponse,
  WithdrawResponse,
} from '../types/index.js';
import { toDateOnly, toPositiveMonetaryString } from '../utils/format.js';
import {
  assertNonEmptyString,
  assertPagination,
  assertPathSegment,
  assertPositiveInteger,
  ensure,
} from '../utils/validation.js';

/** Crypto withdrawals and the unified (crypto + rial) withdrawal history. */
export class WithdrawalsResource extends Resource {
  /**
   * Requests a crypto withdrawal (`POST /users/wallets/withdraw`). Rate limit: 10 per 3 min.
   *
   * Destinations that are not in the address book require `options.totp` (2FA). The request must
   * then be confirmed with {@link WithdrawalsResource.confirm}.
   *
   * @example
   * const { withdraw } = await client.withdrawals.create(
   *   { wallet: 3456, network: 'TRX', address: 'T…', amount: '25' },
   *   { totp: '123456' },
   * );
   */
  create(params: CreateWithdrawParams, options?: TotpRequestOptions): Promise<WithdrawResponse> {
    assertPositiveInteger(params.wallet, 'wallet');
    const body: Record<string, unknown> = { wallet: params.wallet };
    if (params.network !== undefined) body.network = params.network;
    if (params.explanations !== undefined) body.explanations = params.explanations;

    if (params.invoice !== undefined) {
      assertNonEmptyString(params.invoice, 'invoice');
      body.invoice = params.invoice;
    } else {
      assertNonEmptyString(params.address, 'address');
      ensure(
        !(params.noTag === true && params.tag !== undefined),
        'tag',
        'cannot be combined with noTag',
      );
      body.address = params.address;
      body.amount = toPositiveMonetaryString(params.amount, 'amount');
      if (params.tag !== undefined) body.tag = params.tag;
      if (params.noTag !== undefined) body.noTag = params.noTag;
    }
    return this.request({ method: 'POST', path: '/users/wallets/withdraw', body }, options);
  }

  /**
   * Confirms a withdrawal with the one-time code sent by SMS/e-mail
   * (`POST /users/wallets/withdraw-confirm`). Rate limit: 30/hour.
   */
  confirm(params: ConfirmWithdrawParams, options?: RequestOptions): Promise<WithdrawResponse> {
    assertPositiveInteger(params.withdraw, 'withdraw');
    const body: Record<string, unknown> = { withdraw: params.withdraw };
    if (params.otp !== undefined) {
      const otp = String(params.otp).trim();
      ensure(/^\d+$/.test(otp), 'otp', 'must be numeric');
      // Sent as a string so codes with leading zeros survive.
      body.otp = otp;
    }
    return this.request({ method: 'POST', path: '/users/wallets/withdraw-confirm', body }, options);
  }

  /** Details of one crypto withdrawal (`GET /withdraws/{id}`). Rate limit: 60 per 2 min. */
  get(withdrawId: number, options?: RequestOptions): Promise<WithdrawResponse> {
    assertPositiveInteger(withdrawId, 'withdrawId');
    return this.request({ method: 'GET', path: `/withdraws/${withdrawId}` }, options);
  }

  /** Recent crypto and rial withdrawals (`GET /users/wallets/withdraws/list`), 20 per page. */
  list(params: ListWithdrawsParams = {}, options?: RequestOptions): Promise<ListWithdrawsResponse> {
    if (params.wallet !== undefined) assertPositiveInteger(params.wallet, 'wallet');
    assertPagination(params);
    return this.request(
      {
        method: 'GET',
        path: '/users/wallets/withdraws/list',
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
}

/** Rial (bank) withdrawals. */
export class RialWithdrawalsResource extends Resource {
  /**
   * Requests a rial withdrawal to a confirmed bank account (`POST /cobank/withdraw`).
   * Rate limit: 10 per 3 min.
   *
   * @example
   * const { result } = await client.rialWithdrawals.create({ destinationBankAccountId: 13568, amount: '25000000' });
   */
  create(
    params: CreateRialWithdrawParams,
    options?: RequestOptions,
  ): Promise<RialWithdrawResponse> {
    assertPositiveInteger(params.destinationBankAccountId, 'destinationBankAccountId');
    return this.request(
      {
        method: 'POST',
        path: '/cobank/withdraw',
        body: {
          destinationBankAccountId: params.destinationBankAccountId,
          amount: toPositiveMonetaryString(params.amount, 'amount'),
        },
      },
      options,
    );
  }

  /**
   * Cancels a rial withdrawal (`POST /cobank/withdraw/{id}/cancel`). Only possible while the
   * request is `New` and less than 3 minutes old.
   */
  cancel(withdrawId: string, options?: RequestOptions): Promise<RialWithdrawResponse> {
    assertPathSegment(withdrawId, 'withdrawId');
    return this.request(
      { method: 'POST', path: `/cobank/withdraw/${withdrawId}/cancel`, idempotent: true },
      options,
    );
  }

  /** Details of a rial withdrawal (`GET /cobank/withdraw/{id}`). Rate limit: 60 per 2 min. */
  get(withdrawId: string, options?: RequestOptions): Promise<RialWithdrawResponse> {
    assertPathSegment(withdrawId, 'withdrawId');
    return this.request({ method: 'GET', path: `/cobank/withdraw/${withdrawId}` }, options);
  }
}
