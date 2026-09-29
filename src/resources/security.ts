import { Resource, type RequestOptions } from '../core/http-client.js';
import type {
  AntiPhishingResponse,
  EmergencyCancelResponse,
  LoginAttemptsResponse,
  OkResponse,
  RequestOtpParams,
  SetAntiPhishingParams,
} from '../types/index.js';
import { assertNonEmptyString, ensure } from '../utils/validation.js';

/** Login history, emergency withdrawal cancel, anti-phishing code and OTP requests. */
export class SecurityResource extends Resource {
  /** Recent login attempts (`GET /users/login-attempts`). */
  getLoginAttempts(options?: RequestOptions): Promise<LoginAttemptsResponse> {
    return this.request({ method: 'GET', path: '/users/login-attempts' }, options);
  }

  /**
   * Enables emergency cancel: withdrawal notifications will contain a link that cancels the
   * withdrawal without logging in (`GET /security/emergency-cancel/activate`). Using the link
   * blocks new withdrawals for 72 hours.
   */
  activateEmergencyCancel(options?: RequestOptions): Promise<EmergencyCancelResponse> {
    return this.request({ method: 'GET', path: '/security/emergency-cancel/activate' }, options);
  }

  /**
   * Sets the anti-phishing code included in every Nobitex e-mail (`POST /security/anti-phishing`).
   * Requires an OTP from `requestOtp({ type: 'email', usage: 'anti_phishing_code' })`.
   * Rate limit: 10/min.
   */
  setAntiPhishingCode(
    params: SetAntiPhishingParams,
    options?: RequestOptions,
  ): Promise<OkResponse> {
    assertNonEmptyString(params.code, 'code');
    ensure(
      params.code.length >= 4 && params.code.length <= 15,
      'code',
      'must be between 4 and 15 characters',
    );
    assertNonEmptyString(params.otpCode, 'otpCode');
    return this.request(
      {
        method: 'POST',
        path: '/security/anti-phishing',
        body: { code: params.code, otpCode: params.otpCode },
      },
      options,
    );
  }

  /** The masked anti-phishing code (`GET /security/anti-phishing`). Rate limit: 10/min. */
  getAntiPhishingCode(options?: RequestOptions): Promise<AntiPhishingResponse> {
    return this.request({ method: 'GET', path: '/security/anti-phishing' }, options);
  }

  /**
   * Sends a one-time code by e-mail (`POST /v2/otp/request`), used by the address-book and
   * anti-phishing endpoints.
   *
   * @example
   * await client.security.requestOtp({ type: 'email', usage: 'address_book' });
   */
  requestOtp(params: RequestOtpParams, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyString(params.type, 'type');
    assertNonEmptyString(params.usage, 'usage');
    return this.request(
      {
        method: 'POST',
        path: '/v2/otp/request',
        body: { type: params.type, usage: params.usage },
      },
      options,
    );
  }
}
