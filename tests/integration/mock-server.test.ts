/**
 * End-to-end tests against a local HTTP server that emulates the Nobitex API. These exercise the
 * real `fetch` stack, header handling, API-key signature verification, rate-limit back-off and
 * timeouts without touching the network.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  NobitexApiError,
  NobitexAuthenticationError,
  NobitexClient,
  NobitexRateLimitError,
  NobitexTimeoutError,
} from '../../src/index.js';
import { base64ToBytes, bytesToBase64 } from '../../src/utils/encoding.js';
import { order, orderBook } from '../fixtures/docs-examples.js';

interface Recorded {
  method: string;
  url: string;
  headers: IncomingMessage['headers'];
  body: string;
}

let server: Server;
let baseUrl: string;
let publicKey: CryptoKey;
let publicKeyB64: string;
let privateSeedB64: string;
const recorded: Recorded[] = [];
const counters = new Map<string, number>();

async function verifySignature(req: IncomingMessage, body: string): Promise<boolean> {
  const key = req.headers['nobitex-key'];
  const timestamp = req.headers['nobitex-timestamp'];
  const signature = req.headers['nobitex-signature'];
  if (typeof key !== 'string' || typeof timestamp !== 'string' || typeof signature !== 'string') {
    return false;
  }
  if (key !== publicKeyB64) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 30) return false;
  const message = `${timestamp}${req.method ?? ''}${req.url ?? ''}${body}`;
  return crypto.subtle.verify(
    { name: 'Ed25519' },
    publicKey,
    base64ToBytes(signature),
    new TextEncoder().encode(message),
  );
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body = '';
  for await (const chunk of req) body += String(chunk);
  recorded.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, body });
  const url = new URL(req.url ?? '/', 'http://localhost');
  const count = (counters.get(url.pathname) ?? 0) + 1;
  counters.set(url.pathname, count);

  const authorized =
    req.headers.authorization === 'Token good-token' || (await verifySignature(req, body));

  switch (url.pathname) {
    case '/v3/orderbook/BTCIRT':
      send(res, 200, orderBook);
      return;
    case '/rate-limited':
      if (count === 1) {
        send(res, 429, { status: 'failed', code: 'TooManyRequests', backOff: 0.05, limit: 60 });
      } else {
        send(res, 200, { status: 'ok', attempt: count });
      }
      return;
    case '/slow':
      setTimeout(() => {
        send(res, 200, { status: 'ok' });
      }, 500);
      return;
  }

  if (!authorized) {
    send(res, 401, { detail: 'Invalid token.' });
    return;
  }

  switch (url.pathname) {
    case '/users/profile':
      send(res, 200, { status: 'ok', profile: { username: 'me' }, websocketAuthParam: 'p' });
      return;
    case '/market/orders/add': {
      const data = JSON.parse(body) as { amount: string; price?: string };
      if (Number(data.amount) * Number(data.price ?? 0) < 3_000_000) {
        send(res, 200, { status: 'failed', code: 'SmallOrder', message: 'Order value too small' });
        return;
      }
      send(res, 200, order);
      return;
    }
    case '/market/orders/status':
      send(res, 200, order);
      return;
    case '/market/orders/update-status':
      send(res, 200, {
        status: 'ok',
        updatedStatus: 'Canceled',
        order: { ...order.order, status: 'Canceled' },
      });
      return;
    case '/market/orders/list':
      send(res, 200, { status: 'ok', orders: [order.order], query: url.search });
      return;
    default:
      send(res, 404, { detail: 'Not found.' });
  }
}

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  publicKey = pair.publicKey;
  publicKeyB64 = bytesToBase64(new Uint8Array(await crypto.subtle.exportKey('raw', publicKey)));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  // Emulate the URL-safe seed format returned by POST /apikeys/create.
  privateSeedB64 = bytesToBase64(pkcs8.slice(16)).replace(/\+/g, '-').replace(/\//g, '_');

  server = createServer((req, res) => {
    void handle(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) =>
    server.close(() => {
      resolve();
    }),
  );
});

beforeEach(() => {
  recorded.length = 0;
  counters.clear();
});

describe('integration: mock Nobitex server', () => {
  it('fetches public data without credentials', async () => {
    const client = new NobitexClient({ baseUrl });
    const book = await client.market.getOrderBook('BTCIRT');
    expect(book.lastTradePrice).toBe(orderBook.lastTradePrice);
    expect(recorded[0]?.headers['user-agent']).toMatch(/^TraderBot\//);
    expect(recorded[0]?.headers.authorization).toBeUndefined();
  });

  it('authenticates with a token', async () => {
    const client = new NobitexClient({ baseUrl, token: 'good-token' });
    await expect(client.account.getProfile()).resolves.toMatchObject({ websocketAuthParam: 'p' });

    const bad = new NobitexClient({ baseUrl, token: 'expired' });
    await expect(bad.account.getProfile()).rejects.toBeInstanceOf(NobitexAuthenticationError);
  });

  it('signs requests with an Ed25519 API key that the server can verify', async () => {
    const client = new NobitexClient({
      baseUrl,
      apiKey: { key: publicKeyB64, privateKey: privateSeedB64 },
    });
    await expect(client.account.getProfile()).resolves.toMatchObject({ status: 'ok' });
    const listed = await client.orders.list({
      srcCurrency: 'btc',
      dstCurrency: 'usdt',
      details: 2,
    });
    expect(listed.orders).toHaveLength(1);
    // Query string is part of the signed URL.
    expect(recorded.at(-1)?.url).toBe(
      '/market/orders/list?srcCurrency=btc&dstCurrency=usdt&details=2',
    );

    const forged = new NobitexClient({
      baseUrl,
      apiKey: { key: publicKeyB64, sign: () => Promise.resolve(new Uint8Array(64)) },
    });
    await expect(forged.account.getProfile()).rejects.toBeInstanceOf(NobitexAuthenticationError);
  });

  it('runs a full order lifecycle', async () => {
    const client = new NobitexClient({ baseUrl, token: 'good-token' });
    const created = await client.orders.create({
      type: 'sell',
      srcCurrency: 'btc',
      dstCurrency: 'rls',
      amount: '0.6',
      price: '520000000',
      clientOrderId: 'order1',
    });
    expect(created.order.id).toBe(25);

    const status = await client.orders.getStatus({ clientOrderId: 'order1' });
    expect(status.order.status).toBe('Active');

    const cancelled = await client.orders.cancel(created.order.id);
    expect(cancelled.updatedStatus).toBe('Canceled');
    expect(JSON.parse(recorded.at(-1)!.body)).toEqual({ order: 25, status: 'canceled' });
  });

  it('surfaces business errors from HTTP 200 responses', async () => {
    const client = new NobitexClient({ baseUrl, token: 'good-token' });
    const error = await client.orders
      .create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        amount: '0.0001',
        price: 1000,
      })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NobitexApiError);
    expect((error as NobitexApiError).code).toBe('SmallOrder');
  });

  it('honours backOff on HTTP 429 and succeeds on retry', async () => {
    const client = new NobitexClient({ baseUrl });
    const result = await client.request<{ attempt: number }>({
      method: 'GET',
      path: '/rate-limited',
      auth: 'none',
    });
    expect(result.attempt).toBe(2);

    counters.clear();
    const noRetry = new NobitexClient({ baseUrl, retry: false });
    await expect(
      noRetry.request({ method: 'GET', path: '/rate-limited', auth: 'none' }),
    ).rejects.toBeInstanceOf(NobitexRateLimitError);
  });

  it('times out slow responses', async () => {
    const client = new NobitexClient({ baseUrl, timeout: 50, retry: false });
    await expect(
      client.request({ method: 'GET', path: '/slow', auth: 'none' }),
    ).rejects.toBeInstanceOf(NobitexTimeoutError);
  });
});
