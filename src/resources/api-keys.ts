import { API_KEY_PERMISSIONS } from '../constants.js';
import { Resource, type RequestOptions, type TotpRequestOptions } from '../core/http-client.js';
import { NobitexValidationError } from '../errors/index.js';
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

const MAX_WHITELISTED_IPS = 15;

/** API-key management calls require a 2FA code in the `X-TOTP` header. */
function assertTotp(options: TotpRequestOptions | undefined): void {
  if (options?.totp === undefined || options.totp.trim() === '') {
    throw new NobitexValidationError('totp', 'a 2FA code is required (pass `{ totp }`)');
  }
}

function assertIpWhitelist(list: readonly string[] | undefined): void {
  if (list === undefined) return;
  ensure(
    Array.isArray(list) && list.length <= MAX_WHITELISTED_IPS,
    'ipAddressesWhitelist',
    `must be an array of at most ${MAX_WHITELISTED_IPS} IP addresses`,
  );
}

/**
 * Management of Ed25519 API keys. Keys are scoped by permissions (`READ`, `TRADE`, `WITHDRAW`,
 * `DEPOSIT`, `ADDRESS_BOOK`, `OTP`, `VIP_CREDIT`), can be restricted to up to 15 IP addresses
 * and given an expiry date. At most 20 active keys per user. These endpoints are token only and
 * need a 2FA code for every change; most users create keys in the Nobitex panel instead.
 * Rate limit: 10/min each.
 */
export class ApiKeysResource extends Resource {
  /**
   * Creates an API key (`POST /apikeys/create`). A 2FA code is **required** (`options.totp`).
   * The returned `privateKey` is shown only once — store it in a secret manager. Permissions
   * cannot be changed afterwards.
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
    assertIpWhitelist(params.ipAddressesWhitelist);
    const body = {
      name: params.name,
      description: params.description ?? '',
      permissions: [...new Set(params.permissions)].join(','),
      ipAddressesWhitelist: params.ipAddressesWhitelist ?? [],
      ...(params.expirationDate !== undefined && {
        expirationDate: toIsoDateTime(params.expirationDate, 'expirationDate'),
      }),
    };
    assertTotp(options);
    return this.request({ method: 'POST', path: '/apikeys/create', body }, options);
  }

  /** Lists the user's API keys (`GET /apikeys/list`). */
  list(options?: RequestOptions): Promise<ListApiKeysResponse> {
    return this.request({ method: 'GET', path: '/apikeys/list' }, options);
  }

  /**
   * Updates the name, description or IP whitelist of a key (`POST /apikeys/update/{key}`).
   * A 2FA code is **required** (`options.totp`).
   *
   * @param publicKey - The key's public key.
   */
  update(
    publicKey: string,
    params: UpdateApiKeyParams,
    options: TotpRequestOptions & { totp: string },
  ): Promise<ApiKeyResponse> {
    assertNonEmptyString(publicKey, 'publicKey');
    assertIpWhitelist(params.ipAddressesWhitelist);
    const body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.description !== undefined) body.description = params.description;
    if (params.ipAddressesWhitelist !== undefined) {
      body.ipAddressesWhitelist = params.ipAddressesWhitelist;
    }
    ensure(Object.keys(body).length > 0, 'params', 'must change at least one field');
    assertTotp(options);
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

  /** Deletes an API key (`POST /apikeys/delete/{key}`). A 2FA code is **required** (`options.totp`). */
  delete(publicKey: string, options: TotpRequestOptions & { totp: string }): Promise<OkResponse> {
    assertNonEmptyString(publicKey, 'publicKey');
    assertTotp(options);
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
