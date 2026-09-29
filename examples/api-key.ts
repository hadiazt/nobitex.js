/**
 * Creating a scoped Ed25519 API key and using it.
 * Run: node --env-file=.env --import tsx examples/api-key.ts 123456   (current 2FA code)
 */
import { NobitexClient } from 'nobitex.js';

const totp = process.argv[2];
if (!totp) throw new Error('Pass your current 2FA code as the first argument');

// 1. With a token-authenticated client, create a trade-only key bound to this server's IP.
const admin = NobitexClient.fromEnv();
const { key, privateKey } = await admin.apiKeys.create(
  {
    name: 'trading-bot',
    permissions: ['READ', 'TRADE'],
    ipAddressesWhitelist: ['203.0.113.7'],
    expirationDate: new Date(Date.now() + 90 * 24 * 3600 * 1000),
  },
  { totp },
);
// The private key is shown only once — store it in a secret manager, never in source control.
console.log('NOBITEX_API_KEY=%s', key.key);

// 2. Use the key: every request is signed with Ed25519 automatically.
const bot = new NobitexClient({ apiKey: { key: key.key, privateKey } });
const { orders } = await bot.orders.list({ status: 'open' });
console.log(orders.length, 'open orders');

// 3. Or keep the private key outside the process (KMS/HSM) with a custom signer.
const kms = new NobitexClient({
  apiKey: {
    key: key.key,
    sign: async (message) => {
      // e.g. return await kmsClient.sign({ keyId, message });
      await Promise.resolve(message);
      throw new Error('plug in your KMS here');
    },
  },
});
console.log(kms.isAuthenticated);
