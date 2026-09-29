import { Resource, type RequestOptions } from '../core/http-client.js';
import type {
  AddBankAccountParams,
  AddCardParams,
  FavoriteMarketsResponse,
  LimitationsResponse,
  OkResponse,
  ProfileResponse,
} from '../types/index.js';
import { toCommaList } from '../utils/format.js';
import { assertNonEmptyString, ensure } from '../utils/validation.js';

/** Profile, KYC limits, bank details and favorite markets of the authenticated user. */
export class AccountResource extends Resource {
  /**
   * Profile, bank cards/accounts, verification flags, fee options, monthly trade stats and the
   * `websocketAuthParam` needed for private WebSocket channels (`GET /users/profile`).
   */
  getProfile(options?: RequestOptions): Promise<ProfileResponse> {
    return this.request({ method: 'GET', path: '/users/profile' }, options);
  }

  /** Account level, enabled features and withdrawal limits in rials (`GET /users/limitations`). */
  getLimitations(options?: RequestOptions): Promise<LimitationsResponse> {
    return this.request({ method: 'GET', path: '/users/limitations' }, options);
  }

  /** Registers a bank card (`POST /users/cards-add`). Rate limit: 30 per 30 min. */
  addCard(params: AddCardParams, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyString(params.number, 'number');
    assertNonEmptyString(params.bank, 'bank');
    return this.request(
      {
        method: 'POST',
        path: '/users/cards-add',
        body: { number: params.number, bank: params.bank },
      },
      options,
    );
  }

  /** Registers a bank account (`POST /users/accounts-add`). Rate limit: 30 per 30 min. */
  addBankAccount(params: AddBankAccountParams, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyString(params.number, 'number');
    assertNonEmptyString(params.shaba, 'shaba');
    assertNonEmptyString(params.bank, 'bank');
    return this.request(
      {
        method: 'POST',
        path: '/users/accounts-add',
        body: { number: params.number, shaba: params.shaba, bank: params.bank },
      },
      options,
    );
  }

  /** Lists favorite markets (`GET /users/markets/favorite`). Rate limit: 6/min. */
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
