/**
 * Smoke tests against the real Nobitex API (public, read-only endpoints only).
 *
 * Skipped by default. Nobitex only accepts requests from Iranian IP addresses, so run them from
 * an Iranian network:  `npm run test:integration`  (sets NOBITEX_INTEGRATION=1).
 * Set NOBITEX_ENV=testnet to target https://testnetapiv2.nobitex.ir instead.
 */
import { describe, expect, it } from 'vitest';
import { NobitexClient, toCandles } from '../../src/index.js';

const enabled = process.env.NOBITEX_INTEGRATION === '1';

/**
 * Real network calls (e.g. the ~320 KB `/v2/options` payload) can exceed Vitest's default 5 s.
 * Keep this above the SDK's own 30 s request timeout so a slow API surfaces as a descriptive
 * `NobitexTimeoutError` instead of a bare "Test timed out".
 */
const LIVE_TEST_TIMEOUT_MS = 60_000;

describe.runIf(enabled)(
  'live Nobitex API (public endpoints)',
  { timeout: LIVE_TEST_TIMEOUT_MS },
  () => {
    const client = NobitexClient.fromEnv(process.env, { userAgent: 'TraderBot/nobitex.js-tests' });

    it('GET /v3/orderbook/BTCIRT', async () => {
      const book = await client.market.getOrderBook('BTCIRT');
      expect(book.status).toBe('ok');
      expect(Array.isArray(book.asks)).toBe(true);
    });

    it('GET /v2/trades/USDTIRT', async () => {
      const { trades } = await client.market.getTrades('USDTIRT');
      expect(trades.length).toBeGreaterThan(0);
    });

    it('GET /market/stats', async () => {
      const { stats } = await client.market.getStats({ srcCurrency: 'btc', dstCurrency: 'rls' });
      expect(stats['btc-rls']).toBeDefined();
    });

    it('GET /market/udf/history', async () => {
      const data = await client.market.getOHLC({
        symbol: 'BTCIRT',
        resolution: '60',
        to: new Date(),
        countback: 5,
      });
      expect(toCandles(data).length).toBeGreaterThan(0);
    });

    it('GET /v2/options', async () => {
      const options = await client.system.getOptions();
      expect(options.nobitex.activeCurrencies).toContain('btc');
    });

    it.runIf(client.isAuthenticated)('GET /users/profile (only with credentials)', async () => {
      const { profile } = await client.account.getProfile();
      expect(profile.username).toBeTruthy();
    });
  },
);
