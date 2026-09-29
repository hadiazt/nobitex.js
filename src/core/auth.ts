import { NobitexValidationError } from '../errors/index.js';
import { base64ToBytes, bytesToBase64 } from '../utils/encoding.js';
import { assertNonEmptyString } from '../utils/validation.js';

/** The parts of a request that are covered by an API-key signature. */
export interface SignaturePayload {
  /** Upper-case HTTP method. */
  method: string;
  /** Path including the query string, exactly as sent, e.g. `/market/orders/list?fromId=123`. */
  path: string;
  /** Raw request body (empty string when there is none). */
  body: string;
}

/** Produces authentication headers for a request. */
export interface Authenticator {
  readonly kind: 'token' | 'apiKey';
  headers(payload: SignaturePayload): Promise<Record<string, string>>;
}

/** `Authorization: Token <token>` authentication. */
export class TokenAuthenticator implements Authenticator {
  readonly kind = 'token';
  readonly #token: string;

  constructor(token: string) {
    assertNonEmptyString(token, 'token');
    this.#token = token.trim();
  }

  /** Returns the `Authorization: Token …` header. */
  headers(): Promise<Record<string, string>> {
    return Promise.resolve({ Authorization: `Token ${this.#token}` });
  }
}

/** Signs the UTF-8 message bytes with Ed25519 and returns the raw signature (or base64). */
export type Ed25519Signer = (message: Uint8Array) => Promise<Uint8Array | string>;

/** DER prefix that turns a raw 32-byte Ed25519 seed into a PKCS#8 `PrivateKeyInfo`. */
const PKCS8_ED25519_PREFIX = Uint8Array.from([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);

/**
 * Converts a private key into PKCS#8 DER. Accepts the base64 (standard or URL-safe) 32-byte seed
 * returned by `POST /apikeys/create`, a 64-byte seed+public-key pair, a base64 PKCS#8 DER blob, or
 * a PEM `PRIVATE KEY` block.
 */
export function ed25519PrivateKeyToPkcs8(privateKey: string): Uint8Array<ArrayBuffer> {
  const pem = /-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/.exec(privateKey);
  const encoded = pem?.[1] ? pem[1].replace(/\s+/g, '') : privateKey;

  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = base64ToBytes(encoded);
  } catch (error) {
    throw new NobitexValidationError('apiKey.privateKey', `is not valid base64 (${String(error)})`);
  }

  if (bytes.length === 48 && PKCS8_ED25519_PREFIX.every((b, i) => bytes[i] === b)) return bytes;
  if (bytes.length === 32 || bytes.length === 64) {
    const der = new Uint8Array(48);
    der.set(PKCS8_ED25519_PREFIX, 0);
    der.set(bytes.subarray(0, 32), 16);
    return der;
  }
  throw new NobitexValidationError(
    'apiKey.privateKey',
    `must be a 32-byte Ed25519 seed, a 64-byte key pair or PKCS#8 DER (got ${bytes.length} bytes)`,
  );
}

/** Creates an {@link Ed25519Signer} backed by the Web Crypto API (Node.js ≥ 22, Deno, Bun, browsers). */
export function createWebCryptoSigner(privateKey: string): Ed25519Signer {
  const pkcs8 = ed25519PrivateKeyToPkcs8(privateKey);
  let keyPromise: Promise<CryptoKey> | undefined;

  return async (message) => {
    keyPromise ??= globalThis.crypto.subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, false, [
      'sign',
    ]);
    const key = await keyPromise;
    const data = Uint8Array.from(message);
    return new Uint8Array(await globalThis.crypto.subtle.sign({ name: 'Ed25519' }, key, data));
  };
}

/** Builds the exact string that Nobitex expects to be signed: `timestamp + method + path + body`. */
export function buildSignatureMessage(timestamp: string, payload: SignaturePayload): string {
  return `${timestamp}${payload.method.toUpperCase()}${payload.path}${payload.body}`;
}

/**
 * API-key authentication (Ed25519). Adds the `Nobitex-Key`, `Nobitex-Timestamp` and
 * `Nobitex-Signature` headers, with `signature = base64(Ed25519(timestamp + method + url + body))`.
 */
export class ApiKeyAuthenticator implements Authenticator {
  readonly kind = 'apiKey';
  readonly #publicKey: string;
  readonly #sign: Ed25519Signer;
  readonly #now: () => number;

  constructor(publicKey: string, signer: Ed25519Signer, now: () => number = Date.now) {
    assertNonEmptyString(publicKey, 'apiKey.key');
    this.#publicKey = publicKey.trim();
    this.#sign = signer;
    this.#now = now;
  }

  /** Signs `payload` and returns the three `Nobitex-*` authentication headers. */
  async headers(payload: SignaturePayload): Promise<Record<string, string>> {
    const timestamp = String(Math.floor(this.#now() / 1000));
    const message = new TextEncoder().encode(buildSignatureMessage(timestamp, payload));
    const signature = await this.#sign(message);
    return {
      'Nobitex-Key': this.#publicKey,
      'Nobitex-Timestamp': timestamp,
      'Nobitex-Signature': typeof signature === 'string' ? signature : bytesToBase64(signature),
    };
  }
}
