import { API_KEY_PERMISSIONS } from '../constants.js';
import { Resource, type RequestOptions, type TotpRequestOptions } from '../core/http-client.js';
import type {
  ApiKeyResponse,
  CreateApiKeyParams,
  CreateApiKeyResponse,
  ListApiKeysResponse,
  OkResponse,
  UpdateApiKeyParams,
} from '../types/index.js';
import { toIsoDateTime } from '../utils/format.js';
import { assertNonEmptyString, assertOneOf, ensure } from '../utils/validation.js';

/**
 * Management of Ed25519 API keys (experimental). Keys can be scoped to `READ`, `TRADE` and/or
 * `WITHDRAW`, restricted to IP addresses and given an expiry date.
 */
export class ApiKeysResource extends Resource {
  /**
   * Creates an API key (`POST /apikeys/create`). A 2FA code is **required** (`options.totp`).
   * The returned `privateKey` is shown only once — store it in a secret manager.
   *
   * @example
   * const { key, privateKey } = await client.apiKeys.create(
   *   { name: 'bot', permissions: ['READ', 'TRADE'], ipAddressesWhitelist: ['203.0.113.7'] },
   *   { totp: '123456' },
   * );
   */
  create(params: CreateApiKeyParams, options?: TotpRequestOptions): Promise<CreateApiKeyResponse> {
    assertNonEmptyString(params.name, 'name');
    ensure(
      Array.isArray(params.permissions) && params.permissions.length > 0,
      'permissions',
      'must contain at least one permission',
    );
    params.permissions.forEach((permission, i) => {
      assertOneOf(permission, `permissions[${i}]`, API_KEY_PERMISSIONS);
    });
    return this.request(
      {
        method: 'POST',
        path: '/apikeys/create',
        body: {
          name: params.name,
          description: params.description ?? '',
          permissions: [...new Set(params.permissions)].join(','),
          ipAddressesWhitelist: params.ipAddressesWhitelist ?? [],
          ...(params.expirationDate !== undefined && {
            expirationDate: toIsoDateTime(params.expirationDate, 'expirationDate'),
          }),
        },
      },
      options,
    );
  }

  /** Lists the user's API keys and their status (`GET /apikeys/list`). */
  list(options?: RequestOptions): Promise<ListApiKeysResponse> {
    return this.request({ method: 'GET', path: '/apikeys/list' }, options);
  }

  /**
   * Updates the name, description or IP whitelist of a key (`POST /apikeys/update/{key}`).
   *
   * @param publicKey - The key's public key.
   */
  update(
    publicKey: string,
    params: UpdateApiKeyParams,
    options?: RequestOptions,
  ): Promise<ApiKeyResponse> {
    assertNonEmptyString(publicKey, 'publicKey');
    const body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.description !== undefined) body.description = params.description;
    if (params.ipAddressesWhitelist !== undefined) {
      body.ipAddressesWhitelist = params.ipAddressesWhitelist;
    }
    ensure(Object.keys(body).length > 0, 'params', 'must change at least one field');
    return this.request(
      {
        method: 'POST',
        path: `/apikeys/update/${encodeURIComponent(publicKey)}`,
        body,
        idempotent: true,
      },
      options,
    );
  }

  /** Deletes an API key (`POST /apikeys/delete/{key}`). */
  delete(publicKey: string, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyString(publicKey, 'publicKey');
    return this.request(
      {
        method: 'POST',
        path: `/apikeys/delete/${encodeURIComponent(publicKey)}`,
        idempotent: true,
      },
      options,
    );
  }
}
