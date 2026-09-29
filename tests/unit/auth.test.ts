import { describe, expect, it } from 'vitest';
import {
  ApiKeyAuthenticator,
  NobitexValidationError,
  TokenAuthenticator,
  buildSignatureMessage,
  createWebCryptoSigner,
} from '../../src/index.js';
import { ed25519PrivateKeyToPkcs8 } from '../../src/core/auth.js';
import { base64ToBytes, bytesToBase64 } from '../../src/utils/encoding.js';

/** Generates an Ed25519 key pair and returns the raw 32-byte seed as base64 (like Nobitex does). */
async function generateKeyPair(urlSafe = false) {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const seed = bytesToBase64(pkcs8.slice(16));
  return {
    publicKey: pair.publicKey,
    publicKeyBase64: bytesToBase64(raw),
    pkcs8,
    seed: urlSafe ? seed.replace(/\+/g, '-').replace(/\//g, '_') : seed,
  };
}

async function verify(publicKey: CryptoKey, signatureB64: string, message: string) {
  return crypto.subtle.verify(
    { name: 'Ed25519' },
    publicKey,
    base64ToBytes(signatureB64),
    new TextEncoder().encode(message),
  );
}

describe('TokenAuthenticator', () => {
  it('produces the Authorization header', async () => {
    await expect(new TokenAuthenticator(' abc ').headers()).resolves.toEqual({
      Authorization: 'Token abc',
    });
  });

  it('rejects empty tokens', () => {
    expect(() => new TokenAuthenticator('  ')).toThrow(NobitexValidationError);
  });
});

describe('buildSignatureMessage', () => {
  it('concatenates timestamp + METHOD + path(with query) + body', () => {
    expect(
      buildSignatureMessage('1700000000', {
        method: 'post',
        path: '/market/orders/list?fromId=123',
        body: '{"a":1}',
      }),
    ).toBe('1700000000POST/market/orders/list?fromId=123{"a":1}');
  });
});

describe('ApiKeyAuthenticator (Ed25519)', () => {
  it('signs requests so the signature verifies with the public key', async () => {
    const keys = await generateKeyPair();
    const auth = new ApiKeyAuthenticator(
      keys.publicKeyBase64,
      createWebCryptoSigner(keys.seed),
      () => 1_725_000_000_123,
    );
    const payload = { method: 'POST', path: '/market/orders/add', body: '{"type":"buy"}' };
    const headers = await auth.headers(payload);

    expect(headers['Nobitex-Key']).toBe(keys.publicKeyBase64);
    expect(headers['Nobitex-Timestamp']).toBe('1725000000');
    const signature = headers['Nobitex-Signature']!;
    expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
    await expect(
      verify(keys.publicKey, signature, `1725000000POST/market/orders/add{"type":"buy"}`),
    ).resolves.toBe(true);
    await expect(
      verify(keys.publicKey, signature, `1725000001POST/market/orders/add{"type":"buy"}`),
    ).resolves.toBe(false);
  });

  it('accepts URL-safe base64 seeds such as the one shown in the docs', async () => {
    const keys = await generateKeyPair(true);
    const auth = new ApiKeyAuthenticator('pub', createWebCryptoSigner(keys.seed), () => 0);
    const { 'Nobitex-Signature': signature } = await auth.headers({
      method: 'GET',
      path: '/users/profile',
      body: '',
    });
    await expect(verify(keys.publicKey, signature!, '0GET/users/profile')).resolves.toBe(true);
    // Format of the documentation sample (32-byte URL-safe seed) is accepted.
    expect(ed25519PrivateKeyToPkcs8('S5y19KewZzheCWCO4xqMcwwvtR8vQ-hHjE_cdjz-XxE=')).toHaveLength(
      48,
    );
  });

  it('supports external signers returning bytes or base64 strings', async () => {
    const bytes = new ApiKeyAuthenticator('k', () => Promise.resolve(new Uint8Array([1, 2, 3])));
    const text = new ApiKeyAuthenticator('k', () => Promise.resolve('c2ln'));
    await expect(bytes.headers({ method: 'GET', path: '/', body: '' })).resolves.toMatchObject({
      'Nobitex-Signature': 'AQID',
    });
    await expect(text.headers({ method: 'GET', path: '/', body: '' })).resolves.toMatchObject({
      'Nobitex-Signature': 'c2ln',
    });
  });

  it('rejects a missing public key', () => {
    expect(() => new ApiKeyAuthenticator('', () => Promise.resolve(''))).toThrow(
      NobitexValidationError,
    );
  });
});

describe('ed25519PrivateKeyToPkcs8', () => {
  it('accepts a raw seed, a 64-byte key pair, PKCS#8 DER and PEM', async () => {
    const keys = await generateKeyPair();
    const fromSeed = ed25519PrivateKeyToPkcs8(keys.seed);
    expect(fromSeed).toEqual(keys.pkcs8);

    const pair = new Uint8Array(64);
    pair.set(keys.pkcs8.slice(16), 0);
    expect(ed25519PrivateKeyToPkcs8(bytesToBase64(pair))).toEqual(keys.pkcs8);

    expect(ed25519PrivateKeyToPkcs8(bytesToBase64(keys.pkcs8))).toEqual(keys.pkcs8);

    const pem = `-----BEGIN PRIVATE KEY-----\n${bytesToBase64(keys.pkcs8)}\n-----END PRIVATE KEY-----\n`;
    expect(ed25519PrivateKeyToPkcs8(pem)).toEqual(keys.pkcs8);
  });

  it('rejects keys of the wrong size or encoding', () => {
    expect(() => ed25519PrivateKeyToPkcs8(bytesToBase64(new Uint8Array(16)))).toThrow(
      /32-byte Ed25519 seed/,
    );
    expect(() => ed25519PrivateKeyToPkcs8('%%%not base64%%%')).toThrow(NobitexValidationError);
  });
});
