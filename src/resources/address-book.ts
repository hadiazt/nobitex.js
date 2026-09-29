import { TAG_REQUIRED_NETWORKS } from '../constants.js';
import { Resource, type RequestOptions } from '../core/http-client.js';
import type {
  AddAddressParams,
  AddressBookEntryResponse,
  AddressBookResponse,
  DeactivateWhitelistParams,
  OkResponse,
} from '../types/index.js';
import { assertNonEmptyString, assertPositiveInteger, ensure } from '../utils/validation.js';

/**
 * Address book and whitelist ("safe withdrawal") mode. Withdrawals to saved addresses do not need
 * 2FA or a confirmation code.
 */
export class AddressBookResource extends Resource {
  /** Saved addresses, optionally filtered by network (`GET /address_book`). Rate limit: 20/min. */
  list(params: { network?: string } = {}, options?: RequestOptions): Promise<AddressBookResponse> {
    return this.request(
      { method: 'GET', path: '/address_book', query: { network: params.network } },
      options,
    );
  }

  /**
   * Saves an address (`POST /address_book`). Requires an e-mail OTP from
   * `client.security.requestOtp({ type: 'email', usage: 'address_book' })` and a 2FA code.
   * Rate limit: 6/min.
   */
  add(params: AddAddressParams, options?: RequestOptions): Promise<AddressBookEntryResponse> {
    assertNonEmptyString(params.title, 'title');
    assertNonEmptyString(params.network, 'network');
    assertNonEmptyString(params.address, 'address');
    assertNonEmptyString(params.otpCode, 'otpCode');
    assertNonEmptyString(params.tfaCode, 'tfaCode');
    const network = params.network.toUpperCase();
    ensure(
      params.tag !== undefined || !(TAG_REQUIRED_NETWORKS as readonly string[]).includes(network),
      'tag',
      `is required on the ${network} network`,
    );
    return this.request(
      {
        method: 'POST',
        path: '/address_book',
        body: {
          title: params.title,
          network,
          address: params.address,
          ...(params.tag !== undefined && { tag: params.tag }),
          otpCode: params.otpCode,
          tfaCode: params.tfaCode,
        },
      },
      options,
    );
  }

  /** Deletes a saved address (`DELETE /address_book/{id}/delete`). Rate limit: 6/min. */
  delete(addressId: number, options?: RequestOptions): Promise<OkResponse> {
    assertPositiveInteger(addressId, 'addressId');
    return this.request(
      { method: 'DELETE', path: `/address_book/${addressId}/delete`, idempotent: true },
      options,
    );
  }

  /**
   * Enables whitelist mode: crypto withdrawals (except Lightning) are restricted to saved
   * addresses (`POST /address_book/whitelist/activate`).
   */
  activateWhitelist(options?: RequestOptions): Promise<OkResponse> {
    return this.request(
      { method: 'POST', path: '/address_book/whitelist/activate', idempotent: true },
      options,
    );
  }

  /**
   * Disables whitelist mode (`POST /address_book/whitelist/deactivate`). For security,
   * withdrawals are then blocked for 24 hours.
   */
  deactivateWhitelist(
    params: DeactivateWhitelistParams,
    options?: RequestOptions,
  ): Promise<OkResponse> {
    assertNonEmptyString(params.otpCode, 'otpCode');
    assertNonEmptyString(params.tfaCode, 'tfaCode');
    return this.request(
      {
        method: 'POST',
        path: '/address_book/whitelist/deactivate',
        body: { otpCode: params.otpCode, tfaCode: params.tfaCode },
      },
      options,
    );
  }
}
