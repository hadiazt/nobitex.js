/**
 * Public market data — no credentials needed.
 * Run: npx tsx examples/market-data.ts
 */
import { NobitexClient, toCandles } from 'nobitex.js';

const client = new NobitexClient();

// Order book of one market (asks = sell orders, bids = buy orders).
const book = await client.market.getOrderBook('BTCIRT');
console.log('best ask', book.asks[0], 'best bid', book.bids[0], 'last', book.lastTradePrice);

// Every order book in a single request.
const books = await client.market.getAllOrderBooks();
console.log('markets with a book:', Object.keys(books).length);

// Recent public trades.
const { trades } = await client.market.getTrades('USDTIRT');
console.log('latest trade', trades[0]);

// 24h statistics, filtered by currency.
const { stats } = await client.market.getStats({ srcCurrency: ['btc', 'eth'], dstCurrency: 'rls' });
console.log('BTC/RLS 24h change %', stats['btc-rls']?.dayChange);

// Hourly candles for the last day.
const ohlc = await client.market.getOHLC({
  symbol: 'BTCIRT',
  resolution: '60',
  to: new Date(),
  countback: 24,
});
console.log(toCandles(ohlc).at(-1));

// Minimum order sizes and precisions (cache this — it changes rarely).
const { nobitex } = await client.system.getOptions();
console.log(
  'min rial order',
  nobitex.minOrders.rls,
  'BTCIRT price step',
  nobitex.pricePrecisions.BTCIRT,
);
