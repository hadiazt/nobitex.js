/**
 * Real-time data over WebSocket. Requires `npm i centrifuge`.
 * Run: node --env-file=.env --import tsx examples/websocket.ts
 */
import { NobitexClient } from 'nobitex.js';
import { NobitexWebSocket, channels } from 'nobitex.js/websocket';

const client = NobitexClient.fromEnv();
const ws = await NobitexWebSocket.create({ client });

// Payload types are inferred from the channel name.
const stopBook = ws.subscribe(channels.orderBook('BTCIRT'), (book) => {
  console.log('BTCIRT', book.bids[0], book.asks[0]);
});
ws.subscribe(channels.candle('BTCIRT', '1'), (candle) => {
  console.log('1m candle close', candle.c);
});

// Private channels need the per-user `websocketAuthParam` from the profile.
if (client.isAuthenticated) {
  const { websocketAuthParam } = await client.account.getProfile();
  ws.subscribe(channels.privateOrders(websocketAuthParam), (event) => {
    console.log(`order ${event.orderId}: ${event.status} filled ${event.filledAmount}`);
  });
}

ws.raw.on('error', (ctx) => {
  console.error('websocket error', ctx.error);
});
ws.connect();

setTimeout(() => {
  stopBook();
  ws.disconnect();
}, 60_000);
