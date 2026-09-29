/**
 * Authenticated spot trading with robust error handling.
 * Run: node --env-file=.env --import tsx examples/trading.ts
 */
import {
  NobitexApiError,
  NobitexClient,
  NobitexRateLimitError,
  NobitexValidationError,
  isNobitexApiError,
} from 'nobitex.js';

// Reads NOBITEX_TOKEN (or NOBITEX_API_KEY + NOBITEX_API_PRIVATE_KEY) from the environment.
const client = NobitexClient.fromEnv(process.env, {
  userAgent: 'TraderBot/my-bot-1.0',
  retry: { maxRetries: 3 },
  hooks: {
    onResponse: ({ method, path, status, durationMs }) => {
      console.debug(`${method} ${path} → ${status} (${durationMs}ms)`);
    },
  },
});

const { wallets } = await client.wallets.getSummaries({ currencies: ['rls', 'btc'] });
console.log('RLS balance', wallets.RLS?.balance);

try {
  // Prices in rial markets are in rials (not tomans). Amounts/prices are strings for precision.
  const { order } = await client.orders.create({
    type: 'buy',
    srcCurrency: 'btc',
    dstCurrency: 'rls',
    amount: '0.001',
    price: '5000000000',
    clientOrderId: `bot-${Date.now()}`,
  });
  console.log('placed order', order.id, order.status);

  const { order: current } = await client.orders.getStatus({ id: order.id });
  console.log('matched', current.matchedAmount);

  await client.orders.cancel(order.id);
} catch (error) {
  if (error instanceof NobitexValidationError) {
    console.error(`Fix parameter "${error.param}": ${error.message}`);
  } else if (error instanceof NobitexRateLimitError) {
    console.error(`Rate limited; retry after ${error.backOff ?? '?'}s`);
  } else if (isNobitexApiError(error, 'SmallOrder')) {
    console.error('Order value is below the market minimum');
  } else if (error instanceof NobitexApiError) {
    console.error(`API error ${error.code} (HTTP ${error.httpStatus})`, error.body);
  } else {
    throw error;
  }
}

// Recent fills and open orders.
const { trades } = await client.orders.listTrades({ srcCurrency: 'btc', dstCurrency: 'rls' });
const { orders } = await client.orders.list({ status: 'open', details: 2 });
console.log(trades.length, 'trades,', orders.length, 'open orders');
