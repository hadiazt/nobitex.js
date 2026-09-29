/** Compile-time tests for the public type surface (run by `vitest --typecheck`). */
import { describe, expectTypeOf, it } from 'vitest';
import type {
  CandleEvent,
  ChannelPayload,
  MarketSymbol,
  NobitexClient,
  NobitexErrorCode,
  OcoOrderResponse,
  OrderBookEvent,
  OrderResponse,
  PrivateOrderEvent,
} from '../../src/index.js';
import { type channels } from '../../src/index.js';

declare const client: NobitexClient;

describe('order creation overloads', () => {
  it('returns a single order for regular orders and two for OCO', () => {
    expectTypeOf(
      client.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        amount: '1',
        price: '1',
      }),
    ).resolves.toEqualTypeOf<OrderResponse>();

    expectTypeOf(
      client.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'usdt',
        amount: '1',
        mode: 'oco',
        price: '1',
        stopPrice: '2',
        stopLimitPrice: '3',
      }),
    ).resolves.toEqualTypeOf<OcoOrderResponse>();
  });

  it('rejects invalid parameter combinations at compile time', () => {
    // @ts-expect-error -- limit orders need a price
    void client.orders.create({ type: 'buy', srcCurrency: 'btc', dstCurrency: 'rls', amount: '1' });

    // @ts-expect-error -- stop orders need stopPrice, not stopLimitPrice
    void client.orders.create({
      type: 'buy',
      srcCurrency: 'btc',
      dstCurrency: 'rls',
      amount: '1',
      execution: 'stop_market',
      stopLimitPrice: '1',
    });

    void client.orders.create({
      // @ts-expect-error -- unknown side
      type: 'long',
      srcCurrency: 'btc',
      dstCurrency: 'rls',
      amount: '1',
      price: '1',
    });
  });
});

describe('WebSocket channel payloads', () => {
  it('infers payload types from channel names', () => {
    expectTypeOf<ChannelPayload<'public:orderbook-BTCIRT'>>().toEqualTypeOf<OrderBookEvent>();
    expectTypeOf<ChannelPayload<'public:candle-BTCIRT-15'>>().toEqualTypeOf<CandleEvent>();
    expectTypeOf<ChannelPayload<'private:orders#abc'>>().toEqualTypeOf<PrivateOrderEvent>();
    expectTypeOf<
      ChannelPayload<ReturnType<typeof channels.orderBook>>
    >().toEqualTypeOf<OrderBookEvent>();
    expectTypeOf<ChannelPayload<'something-else'>>().toBeUnknown();
  });
});

describe('literal helpers', () => {
  it('MarketSymbol accepts IRT/USDT markets only', () => {
    expectTypeOf<'BTCIRT'>().toExtend<MarketSymbol>();
    expectTypeOf<'ETHUSDT'>().toExtend<MarketSymbol>();
    expectTypeOf<'btc-rls'>().not.toExtend<MarketSymbol>();
  });

  it('error codes autocomplete but accept unknown strings', () => {
    expectTypeOf<'SmallOrder'>().toExtend<NobitexErrorCode>();
    expectTypeOf<'SomeFutureCode'>().toExtend<NobitexErrorCode>();
  });
});
