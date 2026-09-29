import { describe, expect, it } from 'vitest';
import { NobitexApiError, toCandles } from '../../src/index.js';
import { allOrderBooks, ohlc, orderBook, publicTrades } from '../fixtures/docs-examples.js';
import { createTestClient, jsonResponse } from '../helpers/mock-fetch.js';

describe('market resource', () => {
  it('returns the documented order book shape', async () => {
    const { client } = createTestClient({}, () => jsonResponse(orderBook));
    const book = await client.market.getOrderBook('BTCIRT');
    expect(book.lastTradePrice).toBe('35650565900');
    expect(book.bids[0]).toEqual(['1470001120', '0.126571']);
  });

  it('strips the status key from the "all" order book map', async () => {
    const { client } = createTestClient({}, () => jsonResponse(allOrderBooks));
    const books = await client.market.getAllOrderBooks();
    expect(Object.keys(books)).toEqual(['BTCIRT', 'USDTIRT']);
    expect(books.USDTIRT?.asks[0]).toEqual(['277990', '6688.3']);
  });

  it('returns public trades', async () => {
    const { client } = createTestClient({}, () => jsonResponse(publicTrades));
    const { trades } = await client.market.getTrades('BTCIRT');
    expect(trades).toHaveLength(2);
    expect(trades[0]?.type).toBe('sell');
  });

  it('omits empty stats filters', async () => {
    const { client, last } = createTestClient({}, () => jsonResponse({ status: 'ok', stats: {} }));
    await client.market.getStats();
    expect(last().url.search).toBe('');
  });

  it('parses OHLC data and converts it to candles', async () => {
    const { client } = createTestClient({}, () => jsonResponse(ohlc));
    const data = await client.market.getOHLC({
      symbol: 'btcirt',
      resolution: '60',
      to: 1562230967,
    });
    expect(toCandles(data)).toEqual([
      {
        time: 1562095800,
        open: 146272500,
        high: 155869600,
        low: 140062400,
        close: 151440200,
        volume: 18.221362316,
      },
      {
        time: 1562182200,
        open: 150551000,
        high: 161869500,
        low: 150551000,
        close: 157000000,
        volume: 9.8592626506,
      },
    ]);
    expect(toCandles({ s: 'no_data' })).toEqual([]);
  });

  it('surfaces UDF errors', async () => {
    const { client } = createTestClient({}, () =>
      jsonResponse({ s: 'error', errmsg: 'Invalid resolution!' }),
    );
    await expect(
      client.market.getOHLC({ symbol: 'BTCIRT', resolution: 'D', to: 1 }),
    ).rejects.toBeInstanceOf(NobitexApiError);
  });
});
