import { Resource, type RequestOptions } from '../core/http-client.js';
import type {
  AddBankAccountParams,
  DeleteBankItemParams,
  AddCardParams,
  FavoriteMarketsResponse,
  LimitationsResponse,
  OkResponse,
  ProfileResponse,
} from '../types/index.js';
import { toCommaList } from '../utils/format.js';
import { assertNonEmptyString, assertPositiveInteger, ensure } from '../utils/validation.js';

/** Profile, KYC limits, bank details and favorite markets of the authenticated user. */
export class AccountResource extends Resource {
  /**
   * Profile, bank cards/accounts, verification flags, fee options, monthly trade stats and the
   * `websocketAuthParam` needed for private WebSocket channels (`GET /users/profile`). API keys
   * need the `READ` permission.
   */
  getProfile(options?: RequestOptions): Promise<ProfileResponse> {
    return this.request({ method: 'GET', path: '/users/profile' }, options);
  }

  /**
   * Account level, enabled features, withdrawal and deposit limits in rials
   * (`POST /users/limitations`). API keys need the `READ` permission.
   */
  getLimitations(options?: RequestOptions): Promise<LimitationsResponse> {
    return this.request({ method: 'POST', path: '/users/limitations', idempotent: true }, options);
  }

  /**
   * Registers a bank card (`POST /users/cards-add`); the matching bank account is created too.
   * Requires KYC level 1. Rate limit: 30 per 30 min. Token only.
   */
  addCard(params: AddCardParams, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyString(params.number, 'number');
    if (params.bank !== undefined) assertNonEmptyString(params.bank, 'bank');
    return this.request(
      {
        method: 'POST',
        path: '/users/cards-add',
        body: { number: params.number, ...(params.bank !== undefined && { bank: params.bank }) },
      },
      options,
    );
  }

  /**
   * Registers a bank account by IBAN (`POST /users/accounts-add`). Requires KYC level 1.
   * Rate limit: 30 per 30 min. Token only.
   */
  addBankAccount(params: AddBankAccountParams, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyString(params.shaba, 'shaba');
    if (params.number !== undefined) assertNonEmptyString(params.number, 'number');
    return this.request(
      {
        method: 'POST',
        path: '/users/accounts-add',
        body: {
          shaba: params.shaba,
          ...(params.number !== undefined && { number: params.number }),
        },
      },
      options,
    );
  }

  /**
   * Deletes a bank card (`POST /users/cards-delete`). The related bank account is kept.
   * Rate limit: 30 per 30 min. Token only.
   */
  deleteCard(params: DeleteBankItemParams, options?: RequestOptions): Promise<OkResponse> {
    assertPositiveInteger(params.id, 'id');
    return this.request(
      { method: 'POST', path: '/users/cards-delete', body: { id: params.id }, idempotent: true },
      options,
    );
  }

  /** Deletes a bank account (`POST /users/accounts-delete`). Rate limit: 30 per 30 min. Token only. */
  deleteBankAccount(params: DeleteBankItemParams, options?: RequestOptions): Promise<OkResponse> {
    assertPositiveInteger(params.id, 'id');
    return this.request(
      { method: 'POST', path: '/users/accounts-delete', body: { id: params.id }, idempotent: true },
      options,
    );
  }

  /**
   * Lists favorite markets (`GET /users/markets/favorite`). Rate limit: 6/min.
   *
   * Not part of the current OpenAPI reference.
   */
  getFavoriteMarkets(options?: RequestOptions): Promise<FavoriteMarketsResponse> {
    return this.request({ method: 'GET', path: '/users/markets/favorite' }, options);
  }

  /**
   * Adds one or more favorite markets (`POST /users/markets/favorite`). Rate limit: 12/min.
   *
   * @param markets - A symbol or list of symbols, e.g. `['BTCIRT', 'DOGEUSDT']`.
   */
  addFavoriteMarkets(
    markets: string | readonly string[],
    options?: RequestOptions,
  ): Promise<FavoriteMarketsResponse> {
    const market = toCommaList(markets);
    ensure(market.length > 0, 'markets', 'must contain at least one market symbol');
    return this.request(
      { method: 'POST', path: '/users/markets/favorite', body: { market } },
      options,
    );
  }

  /**
   * Removes a favorite market, or all of them with `'All'`
   * (`DELETE /users/markets/favorite`). Rate limit: 12/min.
   */
  removeFavoriteMarket(market: string, options?: RequestOptions): Promise<FavoriteMarketsResponse> {
    assertNonEmptyString(market, 'market');
    return this.request(
      { method: 'DELETE', path: '/users/markets/favorite', query: { market }, idempotent: true },
      options,
    );
  }
}
