import { Resource, type RequestOptions, type TotpRequestOptions } from '../core/http-client.js';
import type {
  CancelWithdrawParams,
  ConfirmWithdrawParams,
  CreateRialWithdrawParams,
  CreateWithdrawParams,
  ListWithdrawsParams,
  ListWithdrawsResponse,
  RialWithdrawBanksResponse,
  RialWithdrawResponse,
  WithdrawResponse,
} from '../types/index.js';
import { toDateOnly, toPositiveMonetaryString } from '../utils/format.js';
import {
  assertIntegerInRange,
  assertNonEmptyString,
  assertPagination,
  assertPositiveInteger,
  ensure,
} from '../utils/validation.js';

/** Rial withdrawal ids: `CW…`, `WJ…` or legacy `W…` followed by digits. */
const RIAL_WITHDRAW_ID_PATTERN = /^([Cc][Ww]|[Ww][Jj]|[Ww])[0-9]+$/;

function assertRialWithdrawId(value: unknown): asserts value is string {
  assertNonEmptyString(value, 'withdrawId');
  ensure(
    RIAL_WITHDRAW_ID_PATTERN.test(value),
    'withdrawId',
    'must look like "CW123", "WJ123" or "W123"',
  );
}

/** Crypto withdrawals and the unified (crypto + rial) withdrawal history. */
export class WithdrawalsResource extends Resource {
  /**
   * Requests a crypto withdrawal from a **spot** wallet (`POST /users/wallets/withdraw`).
   * Rate limit: 10 per 3 min. API keys need the `WITHDRAW` permission.
   *
   * Destinations that are not in the address book require `options.totp` when 2FA is enabled.
   * `network` is required for currencies available on several networks (e.g. USDT). The request
   * must then be confirmed with {@link WithdrawalsResource.confirm}. For rial withdrawals use
   * `client.rialWithdrawals.create()`.
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
   * Confirms a withdrawal with the one-time code sent by SMS
   * (`POST /users/wallets/withdraw-confirm`). Rate limit: 30/hour. API keys need the `WITHDRAW`
   * permission.
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

  /**
   * Cancels a withdrawal (`POST /users/wallets/withdraw-cancel`). Only possible within one hour
   * of creation while `is_cancelable` is true and the withdrawal has not been sent.
   * Rate limit: 10/min and 60/hour. API keys need the `WITHDRAW` permission.
   */
  cancel(params: CancelWithdrawParams, options?: RequestOptions): Promise<WithdrawResponse> {
    assertPositiveInteger(params.withdraw, 'withdraw');
    return this.request(
      {
        method: 'POST',
        path: '/users/wallets/withdraw-cancel',
        body: { withdraw: params.withdraw },
        idempotent: true,
      },
      options,
    );
  }

  /**
   * Details of one withdrawal (`GET /withdraws/{id}`). Rate limit: 60 per 2 min. API keys need
   * the `READ` permission. Use `client.rialWithdrawals.get()` for rial withdrawals.
   */
  get(withdrawId: number, options?: RequestOptions): Promise<WithdrawResponse> {
    assertPositiveInteger(withdrawId, 'withdrawId');
    return this.request({ method: 'GET', path: `/withdraws/${withdrawId}` }, options);
  }

  /**
   * Recent crypto and rial withdrawals (`GET /users/wallets/withdraws/list`), 20 per page
   * (up to 100 pages). Rate limit: 60 per 2 min. API keys need the `READ` permission.
   */
  list(params: ListWithdrawsParams = {}, options?: RequestOptions): Promise<ListWithdrawsResponse> {
    if (params.wallet !== undefined && params.wallet !== 'all') {
      assertPositiveInteger(params.wallet, 'wallet');
    }
    if (params.page !== undefined) assertIntegerInRange(params.page, 'page', 1, 100);
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
   * Requests a rial withdrawal to a confirmed bank account (`POST /cobank/withdraw`); no
   * separate confirmation step is needed. `amount` includes the fee. Banks listed by
   * {@link RialWithdrawalsResource.getBanks} settle within ~30 minutes, others via Paya.
   * Rate limit: 10 per 3 min. API keys need the `WITHDRAW` permission.
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
   * Cancels a rial withdrawal (`POST /cobank/withdraw/{id}/cancel`). `CW` withdrawals can only be
   * cancelled while `New` and less than 3 minutes old; `WJ` ones while `isCancelable` is true.
   * Rate limit: 10/min and 60/hour. API keys need the `WITHDRAW` permission.
   */
  cancel(withdrawId: string, options?: RequestOptions): Promise<RialWithdrawResponse> {
    assertRialWithdrawId(withdrawId);
    return this.request(
      { method: 'POST', path: `/cobank/withdraw/${withdrawId}/cancel`, idempotent: true },
      options,
    );
  }

  /**
   * Details of a rial withdrawal (`GET /cobank/withdraw/{id}`). Rate limit: 60 per 2 min. API
   * keys need the `READ` permission.
   */
  get(withdrawId: string, options?: RequestOptions): Promise<RialWithdrawResponse> {
    assertRialWithdrawId(withdrawId);
    return this.request({ method: 'GET', path: `/cobank/withdraw/${withdrawId}` }, options);
  }

  /**
   * Bank ids (e.g. `"062"`) supported for fast settlement (`GET /cobank/withdraw-banks`).
   * Rate limit: 10/min. API keys need the `READ` permission.
   */
  getBanks(options?: RequestOptions): Promise<RialWithdrawBanksResponse> {
    return this.request({ method: 'GET', path: '/cobank/withdraw-banks' }, options);
  }
}
