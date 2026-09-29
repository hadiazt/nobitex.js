import { Resource, type RequestOptions } from '../core/http-client.js';
import type {
  CreateReferralLinkResponse,
  OkResponse,
  ReferralLinksResponse,
  ReferralStatusResponse,
} from '../types/index.js';
import { assertNonEmptyString, ensure } from '../utils/validation.js';

/**
 * Referral program. Build a sign-up link from a code with
 * `https://nobitex.ir/signup/?refcode=CODE`.
 */
export class ReferralResource extends Resource {
  /** Referral codes with registration/trade/profit stats (`GET /users/referral/links-list`). */
  listLinks(options?: RequestOptions): Promise<ReferralLinksResponse> {
    return this.request({ method: 'GET', path: '/users/referral/links-list' }, options);
  }

  /**
   * Creates a referral code (`POST /users/referral/links-add`). Max 30 codes per user.
   * Rate limit: 5/min.
   *
   * @param params.friendShare - Share of the fee given back to the invited friend (default `0`).
   */
  createLink(
    params: { friendShare?: number } = {},
    options?: RequestOptions,
  ): Promise<CreateReferralLinkResponse> {
    if (params.friendShare !== undefined) {
      ensure(
        Number.isInteger(params.friendShare) && params.friendShare >= 0,
        'friendShare',
        'must be a non-negative integer',
      );
    }
    return this.request(
      {
        method: 'POST',
        path: '/users/referral/links-add',
        body: { friendShare: params.friendShare ?? 0 },
      },
      options,
    );
  }

  /** Whether the current user was referred by someone (`GET /users/referral/referral-status`). */
  getStatus(options?: RequestOptions): Promise<ReferralStatusResponse> {
    return this.request({ method: 'GET', path: '/users/referral/referral-status' }, options);
  }

  /**
   * Sets the referrer of the current user — only within 24 hours of sign-up
   * (`POST /users/referral/set-referrer`).
   */
  setReferrer(referrerCode: string, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyString(referrerCode, 'referrerCode');
    return this.request(
      { method: 'POST', path: '/users/referral/set-referrer', body: { referrerCode } },
      options,
    );
  }
}
