import { EventEmitter } from 'node:events';
import type { Centrifuge } from 'centrifuge';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NobitexClient,
  NobitexPermissionError,
  NobitexValidationError,
  WEBSOCKET_URL,
  channels,
} from '../../src/index.js';
import { NobitexWebSocket, type OrderBookEvent } from '../../src/websocket/index.js';
import { orderBookEvent, privateOrderEvent } from '../fixtures/docs-examples.js';
import { jsonResponse } from '../helpers/mock-fetch.js';

class FakeSubscription extends EventEmitter {
  state: 'unsubscribed' | 'subscribed' = 'unsubscribed';
  constructor(
    readonly channel: string,
    readonly options: unknown,
  ) {
    super();
  }
  subscribe = vi.fn(() => {
    this.state = 'subscribed';
  });
  unsubscribe = vi.fn(() => {
    this.state = 'unsubscribed';
  });
}

class FakeCentrifuge {
  static instances: FakeCentrifuge[] = [];
  subs = new Map<string, FakeSubscription>();
  connect = vi.fn();
  disconnect = vi.fn();
  ready = vi.fn(() => Promise.resolve());

  constructor(
    readonly url: string,
    readonly options: { getToken?: () => Promise<string> } & Record<string, unknown>,
  ) {
    FakeCentrifuge.instances.push(this);
  }
  newSubscription(channel: string, options: unknown) {
    const sub = new FakeSubscription(channel, options);
    this.subs.set(channel, sub);
    return sub;
  }
  getSubscription(channel: string) {
    return this.subs.get(channel) ?? null;
  }
  removeSubscription = vi.fn((sub: FakeSubscription) => {
    this.subs.delete(sub.channel);
  });
}

class FakeUnauthorizedError extends Error {}

vi.mock('centrifuge', () => ({
  Centrifuge: FakeCentrifuge,
  UnauthorizedError: FakeUnauthorizedError,
}));

beforeEach(() => {
  FakeCentrifuge.instances = [];
});

function wrap(delta?: boolean) {
  const fake = new FakeCentrifuge(WEBSOCKET_URL, {});
  const ws = new NobitexWebSocket(fake as unknown as Centrifuge, { delta });
  return { fake, ws };
}

describe('channels', () => {
  it('builds documented channel names', () => {
    expect(channels.orderBook('btcirt')).toBe('public:orderbook-BTCIRT');
    expect(channels.candle('BTCIRT', '15')).toBe('public:candle-BTCIRT-15');
    expect(channels.trades('ethusdt')).toBe('public:trades-ETHUSDT');
    expect(channels.marketStats('BTCIRT')).toBe('public:market-stats-BTCIRT');
    expect(channels.allMarketStats()).toBe('public:market-stats-all');
    expect(channels.privateOrders('abc')).toBe('private:orders#abc');
    expect(channels.privateTrades('abc')).toBe('private:trades#abc');
  });

  it('validates inputs', () => {
    expect(() => channels.orderBook('BTC IRT')).toThrow(NobitexValidationError);
    expect(() => channels.candle('BTCIRT', '2' as '1')).toThrow(NobitexValidationError);
    expect(() => channels.privateTrades('')).toThrow(NobitexValidationError);
  });
});

describe('NobitexWebSocket', () => {
  it('subscribes with fossil delta and delivers typed payloads', () => {
    const { fake, ws } = wrap();
    const received: OrderBookEvent[] = [];
    ws.subscribe(channels.orderBook('BTCIRT'), (book) => received.push(book));

    const sub = fake.subs.get('public:orderbook-BTCIRT')!;
    expect(sub.options).toEqual({ delta: 'fossil' });
    expect(sub.subscribe).toHaveBeenCalledOnce();

    sub.emit('publication', { data: orderBookEvent });
    sub.emit('publication', { data: JSON.stringify(orderBookEvent) });
    expect(received).toEqual([orderBookEvent, orderBookEvent]);
  });

  it('can disable delta compression and passes through unparseable strings', () => {
    const { fake, ws } = wrap(false);
    const handler = vi.fn();
    ws.subscribe('public:custom', handler);
    const sub = fake.subs.get('public:custom')!;
    expect(sub.options).toEqual({});
    sub.emit('publication', { data: 'not-json' });
    expect(handler).toHaveBeenCalledWith('not-json');
  });

  it('shares one subscription between handlers and cleans up after the last one', () => {
    const { fake, ws } = wrap();
    const channel = channels.privateOrders('p');
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = ws.subscribe(channel, first);
    const offSecond = ws.subscribe(channel, second);
    const sub = fake.subs.get(channel)!;
    expect(sub.subscribe).toHaveBeenCalledOnce();

    sub.emit('publication', { data: privateOrderEvent });
    expect(first).toHaveBeenCalledWith(privateOrderEvent);
    expect(second).toHaveBeenCalledWith(privateOrderEvent);

    offFirst();
    expect(sub.unsubscribe).not.toHaveBeenCalled();
    offSecond();
    expect(sub.unsubscribe).toHaveBeenCalledOnce();
    expect(fake.removeSubscription).toHaveBeenCalledWith(sub);
  });

  it('delegates connection management', async () => {
    const { fake, ws } = wrap();
    ws.connect();
    await ws.ready(1000);
    ws.disconnect();
    expect(fake.connect).toHaveBeenCalledOnce();
    expect(fake.ready).toHaveBeenCalledWith(1000);
    expect(fake.disconnect).toHaveBeenCalledOnce();
    expect(ws.raw).toBe(fake);
  });

  it('rejects empty channel names', () => {
    const { ws } = wrap();
    expect(() => ws.subscribe('', vi.fn())).toThrow(NobitexValidationError);
  });
});

describe('NobitexWebSocket.create', () => {
  it('loads centrifuge lazily with the default URL and no token provider', async () => {
    const ws = await NobitexWebSocket.create({ centrifuge: { debug: true } });
    const instance = FakeCentrifuge.instances[0]!;
    expect(ws.raw).toBe(instance);
    expect(instance.url).toBe(WEBSOCKET_URL);
    expect(instance.options).toEqual({ debug: true });
  });

  it('fetches connection tokens through the REST client', async () => {
    const fetch = vi.fn(() => Promise.resolve(jsonResponse({ status: 'ok', token: 'jwt' })));
    const client = new NobitexClient({ token: 't', fetch });
    await NobitexWebSocket.create({ client, url: 'wss://example/ws' });
    const instance = FakeCentrifuge.instances[0]!;
    expect(instance.url).toBe('wss://example/ws');
    await expect(instance.options.getToken!()).resolves.toBe('jwt');
  });

  it('maps auth failures to UnauthorizedError so centrifuge stops refreshing', async () => {
    const denied = new NobitexPermissionError('denied', {
      code: 'HTTP_ERROR',
      httpStatus: 403,
      request: { method: 'GET', path: '/auth/ws/token/' },
    });
    await NobitexWebSocket.create({ getToken: () => Promise.reject(denied) });
    await expect(FakeCentrifuge.instances[0]!.options.getToken!()).rejects.toBeInstanceOf(
      FakeUnauthorizedError,
    );

    const transient = new Error('network');
    await NobitexWebSocket.create({ getToken: () => Promise.reject(transient) });
    await expect(FakeCentrifuge.instances[1]!.options.getToken!()).rejects.toBe(transient);
  });
});
