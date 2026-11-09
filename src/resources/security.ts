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
  /**
   * Recent login attempts with IP, country, user agent and device (`POST /users/login-attempts`).
   * Token only — API keys are not supported by this endpoint.
   */
  getLoginAttempts(options?: RequestOptions): Promise<LoginAttemptsResponse> {
    return this.request(
      { method: 'POST', path: '/users/login-attempts', idempotent: true },
      options,
    );
  }

  /**
   * Enables emergency cancel: withdrawal notifications will contain a link that cancels the
   * withdrawal without logging in (`POST /security/emergency-cancel/activate`). Using the link
   * blocks new withdrawals for 72 hours. Returns the existing code when already active.
   * Rate limit: 12/hour. API keys need the `WITHDRAW` permission.
   */
  activateEmergencyCancel(options?: RequestOptions): Promise<EmergencyCancelResponse> {
    return this.request(
      { method: 'POST', path: '/security/emergency-cancel/activate', idempotent: true },
      options,
    );
  }

  /**
   * The current emergency-cancel code (`POST /security/emergency-cancel/get-code`);
   * `cancelCode.code` is `null` when the feature was never activated. Rate limit: 25 per 5 min.
   * API keys need the `WITHDRAW` permission.
   */
  getEmergencyCancelCode(options?: RequestOptions): Promise<EmergencyCancelResponse> {
    return this.request(
      { method: 'POST', path: '/security/emergency-cancel/get-code', idempotent: true },
      options,
    );
  }

  /**
   * Sets the anti-phishing code included in every Nobitex e-mail (`POST /security/anti-phishing`).
   * Requires a verified e-mail and an OTP from
   * `requestOtp({ type: 'email', usage: 'anti_phishing_code' })`. Rate limit: 10/min. Token only.
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

  /**
   * The masked anti-phishing code (`GET /security/anti-phishing`); throws
   * {@link NobitexNotFoundError} when none is set. Rate limit: 10/min. Token only.
   */
  getAntiPhishingCode(options?: RequestOptions): Promise<AntiPhishingResponse> {
    return this.request({ method: 'GET', path: '/security/anti-phishing' }, options);
  }

  /**
   * Sends a one-time code by e-mail (`POST /v2/otp/request`), used by the address-book
   * (`address_book`, `deactivate_whitelist`) and anti-phishing (`anti_phishing_code`) endpoints.
   * API keys need the `OTP` permission.
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
