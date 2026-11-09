import { TAG_REQUIRED_NETWORKS } from '../constants.js';
import { Resource, type RequestOptions } from '../core/http-client.js';
import type {
  AddAddressParams,
  AddressBookEntryResponse,
  AddressBookResponse,
  ConfirmAddressBookItemParams,
  CreateAddressBookItemParams,
  CreateAddressBookItemResponse,
  DeactivateWhitelistParams,
  OkResponse,
  ValidateAddressParams,
} from '../types/index.js';
import { assertNonEmptyString, assertPositiveInteger, ensure } from '../utils/validation.js';

/** Upper-cases the network and checks that tag networks get a tag. */
function networkWithTag(network: unknown, tag: unknown): string {
  assertNonEmptyString(network, 'network');
  const upper = network.toUpperCase();
  ensure(
    tag !== undefined || !(TAG_REQUIRED_NETWORKS as readonly string[]).includes(upper),
    'tag',
    `is required on the ${upper} network`,
  );
  return upper;
}

/**
 * Address book and whitelist ("safe withdrawal") mode. Withdrawals to saved addresses do not need
 * 2FA or a confirmation code.
 *
 * Adding an address is a two-step flow:
 * 1. {@link AddressBookResource.createItem} with a 2FA code → `address_book_item_id`;
 * 2. `security.requestOtp({ type: 'email', usage: 'address_book' })`, then
 *    {@link AddressBookResource.confirmItem} with that code.
 */
export class AddressBookResource extends Resource {
  /**
   * Saved (confirmed) addresses, optionally filtered by network (`GET /address_book`).
   * Rate limit: 20/min. API keys need the `READ` permission.
   */
  list(params: { network?: string } = {}, options?: RequestOptions): Promise<AddressBookResponse> {
    return this.request(
      { method: 'GET', path: '/address_book', query: { network: params.network } },
      options,
    );
  }

  /**
   * Checks that an address (and tag) is valid on a network
   * (`GET /security/validate-address-network`). Resolves on success and throws a
   * {@link NobitexApiError} with code `InvalidAddress`, `InvalidTag` or `ValidationError`
   * otherwise. Rate limit: 6/min. Token only — API keys are not supported by this endpoint.
   */
  validateAddress(params: ValidateAddressParams, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyString(params.network, 'network');
    assertNonEmptyString(params.address, 'address');
    return this.request(
      {
        method: 'GET',
        path: '/security/validate-address-network',
        query: { network: params.network.toUpperCase(), address: params.address, tag: params.tag },
      },
      options,
    );
  }

  /**
   * Step 1 of adding an address (`POST /security/address-book-item/create`). The entry stays
   * inactive (and is not listed) until {@link AddressBookResource.confirmItem} succeeds.
   * Re-creating the same unconfirmed address updates its title and returns the same id.
   * Rate limit: 6/min. API keys need the `ADDRESS_BOOK` permission. Adding addresses is blocked
   * for one hour after a login from an unknown device (`NewDeviceLoginRestriction`).
   *
   * @example
   * const { address_book_item_id: id } = await client.addressBook.createItem({
   *   title: 'cold wallet', network: 'TRX', address: 'T…', tfaCode: '123456',
   * });
   * await client.security.requestOtp({ type: 'email', usage: 'address_book' });
   * await client.addressBook.confirmItem({ id, otpCode: '654321' });
   */
  createItem(
    params: CreateAddressBookItemParams,
    options?: RequestOptions,
  ): Promise<CreateAddressBookItemResponse> {
    assertNonEmptyString(params.title, 'title');
    assertNonEmptyString(params.address, 'address');
    assertNonEmptyString(params.tfaCode, 'tfaCode');
    const network = networkWithTag(params.network, params.tag);
    return this.request(
      {
        method: 'POST',
        path: '/security/address-book-item/create',
        body: {
          title: params.title,
          network,
          address: params.address,
          ...(params.tag !== undefined && { tag: params.tag }),
          tfaCode: params.tfaCode,
        },
      },
      options,
    );
  }

  /**
   * Step 2 of adding an address (`POST /security/address-book-item/confirm`) with the code from
   * `security.requestOtp({ type: 'email', usage: 'address_book' })`. In whitelist mode, crypto
   * withdrawals are restricted for one hour afterwards. Rate limit: 6/min. API keys need the
   * `ADDRESS_BOOK` permission (and `OTP` to request the code).
   */
  confirmItem(params: ConfirmAddressBookItemParams, options?: RequestOptions): Promise<OkResponse> {
    assertPositiveInteger(params.id, 'id');
    assertNonEmptyString(params.otpCode, 'otpCode');
    return this.request(
      {
        method: 'POST',
        path: '/security/address-book-item/confirm',
        body: { id: params.id, otpCode: params.otpCode },
      },
      options,
    );
  }

  /**
   * Saves an address in one step (`POST /address_book`). Requires an OTP from
   * `client.security.requestOtp({ type: 'email', usage: 'address_book' })` and a 2FA code.
   * Rate limit: 6/min.
   *
   * @deprecated Nobitex deprecated the one-step flow; use {@link AddressBookResource.createItem}
   *   followed by {@link AddressBookResource.confirmItem}.
   */
  add(params: AddAddressParams, options?: RequestOptions): Promise<AddressBookEntryResponse> {
    assertNonEmptyString(params.title, 'title');
    assertNonEmptyString(params.address, 'address');
    assertNonEmptyString(params.otpCode, 'otpCode');
    assertNonEmptyString(params.tfaCode, 'tfaCode');
    const network = networkWithTag(params.network, params.tag);
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

  /**
   * Deletes a saved address (`DELETE /address_book/{id}/delete`). Rate limit: 6/min. API keys
   * need the `ADDRESS_BOOK` permission.
   */
  delete(addressId: number, options?: RequestOptions): Promise<OkResponse> {
    assertPositiveInteger(addressId, 'addressId');
    return this.request(
      { method: 'DELETE', path: `/address_book/${addressId}/delete`, idempotent: true },
      options,
    );
  }

  /**
   * Enables whitelist mode: crypto withdrawals (except Lightning) are restricted to saved
   * addresses (`POST /address_book/whitelist/activate`). A no-op when already active.
   * Rate limit: 6/min. API keys need the `ADDRESS_BOOK` permission.
   */
  activateWhitelist(options?: RequestOptions): Promise<OkResponse> {
    return this.request(
      { method: 'POST', path: '/address_book/whitelist/activate', idempotent: true },
      options,
    );
  }

  /**
   * Disables whitelist mode (`POST /address_book/whitelist/deactivate`) with a 2FA code and the
   * code from `security.requestOtp({ type: 'email', usage: 'deactivate_whitelist' })`. For
   * security, withdrawals are then blocked for 24 hours. Rate limit: 6/min. API keys need the
   * `ADDRESS_BOOK` permission (and `OTP` to request the code).
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
