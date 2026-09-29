import { describe, expect, it } from 'vitest';
import { NobitexValidationError, type NobitexClient } from '../../src/index.js';
import { createTestClient } from '../helpers/mock-fetch.js';

type Case = [name: string, call: (client: NobitexClient) => Promise<unknown>, param: string];

// Casts simulate plain-JavaScript callers bypassing the type system.
const cases: Case[] = [
  // Path-safety of symbols and ids
  ['symbol with slash', (c) => c.market.getOrderBook('BTC/IRT'), 'symbol'],
  ['symbol "all" on getOrderBook', (c) => c.market.getOrderBook('all'), 'symbol'],
  ['empty symbol', (c) => c.market.getTrades(''), 'symbol'],
  ['path traversal in rial id', (c) => c.rialWithdrawals.get('../users'), 'withdrawId'],
  ['non-integer position id', (c) => c.margin.getPosition(1.5), 'positionId'],
  ['negative withdraw id', (c) => c.withdrawals.get(-1), 'withdrawId'],

  // Market data
  [
    'bad OHLC resolution',
    (c) => c.market.getOHLC({ symbol: 'BTCIRT', resolution: '2' as '1', to: 1 }),
    'resolution',
  ],
  [
    'millisecond OHLC timestamp',
    (c) => c.market.getOHLC({ symbol: 'BTCIRT', resolution: 'D', to: 1.5 }),
    'to',
  ],
  [
    'invalid OHLC Date',
    (c) => c.market.getOHLC({ symbol: 'BTCIRT', resolution: 'D', to: new Date('x') }),
    'to',
  ],
  [
    'zero countback',
    (c) => c.market.getOHLC({ symbol: 'BTCIRT', resolution: 'D', to: 1, countback: 0 }),
    'countback',
  ],
  [
    'zero OHLC page',
    (c) => c.market.getOHLC({ symbol: 'BTCIRT', resolution: 'D', to: 1, page: 0 }),
    'page',
  ],

  // Spot orders
  [
    'invalid side',
    (c) =>
      c.orders.create({
        type: 'hold' as 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        amount: '1',
        price: '1',
      }),
    'type',
  ],
  [
    'limit order without price',
    (c) =>
      c.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        amount: '1',
      } as never),
    'price',
  ],
  [
    'stop order without stopPrice',
    (c) =>
      c.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        amount: '1',
        execution: 'stop_limit',
        price: '1',
      } as never),
    'stopPrice',
  ],
  [
    'stopPrice on a limit order',
    (c) =>
      c.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        amount: '1',
        price: '1',
        stopPrice: '2',
      } as never),
    'stopPrice',
  ],
  [
    'unknown execution',
    (c) =>
      c.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        amount: '1',
        execution: 'iceberg',
        price: '1',
      } as never),
    'execution',
  ],
  [
    'zero amount',
    (c) =>
      c.orders.create({ type: 'buy', srcCurrency: 'btc', dstCurrency: 'rls', amount: 0, price: 1 }),
    'amount',
  ],
  [
    'negative price',
    (c) =>
      c.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        amount: 1,
        price: -1,
      }),
    'price',
  ],
  [
    'non-numeric amount string',
    (c) =>
      c.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        amount: '1,000',
        price: 1,
      }),
    'amount',
  ],
  [
    'NaN price',
    (c) =>
      c.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        amount: 1,
        price: Number.NaN,
      }),
    'price',
  ],
  [
    'clientOrderId over 32 chars',
    (c) =>
      c.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        amount: 1,
        price: 1,
        clientOrderId: 'x'.repeat(33),
      }),
    'clientOrderId',
  ],
  [
    'OCO with non-oco mode',
    (c) =>
      c.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'usdt',
        amount: 1,
        mode: 'otoco',
        price: 1,
        stopPrice: 2,
        stopLimitPrice: 3,
      } as never),
    'mode',
  ],
  [
    'missing srcCurrency',
    (c) =>
      c.orders.create({ type: 'buy', srcCurrency: '', dstCurrency: 'rls', amount: 1, price: 1 }),
    'srcCurrency',
  ],
  ['getStatus without id', (c) => c.orders.getStatus({ id: 0 }), 'id'],
  [
    'getStatus empty clientOrderId',
    (c) => c.orders.getStatus({ clientOrderId: '' }),
    'clientOrderId',
  ],
  ['list with fromId and page', (c) => c.orders.list({ fromId: 5, page: 2 }), 'page'],
  ['list with invalid status', (c) => c.orders.list({ status: 'active' as 'open' }), 'status'],
  ['list with invalid order', (c) => c.orders.list({ order: 'amount' as 'id' }), 'order'],
  ['list with invalid details', (c) => c.orders.list({ details: 3 as 2 }), 'details'],
  ['list pageSize > 1000', (c) => c.orders.list({ pageSize: 1001 }), 'pageSize'],
  ['list with bad type', (c) => c.orders.list({ type: 'x' as 'buy' }), 'type'],
  ['list with bad execution', (c) => c.orders.list({ execution: 'x' as 'limit' }), 'execution'],
  ['list with bad tradeType', (c) => c.orders.list({ tradeType: 'x' as 'spot' }), 'tradeType'],
  ['list with page 0', (c) => c.orders.list({ page: 0 }), 'page'],
  [
    'updateStatus to done',
    (c) => c.orders.updateStatus({ order: 1, status: 'done' as 'canceled' }),
    'status',
  ],
  [
    'updateStatus bad order id',
    (c) => c.orders.updateStatus({ order: 0, status: 'canceled' }),
    'order',
  ],
  [
    'updateStatus empty clientOrderId',
    (c) => c.orders.updateStatus({ clientOrderId: ' ', status: 'canceled' }),
    'clientOrderId',
  ],
  ['cancelBulk negative hours', (c) => c.orders.cancelBulk({ hours: -1 }), 'hours'],
  [
    'cancelBulk bad execution',
    (c) => c.orders.cancelBulk({ execution: 'x' as 'limit' }),
    'execution',
  ],
  [
    'cancelBulk bad tradeType',
    (c) => c.orders.cancelBulk({ tradeType: 'x' as 'spot' }),
    'tradeType',
  ],
  ['listTrades with only src', (c) => c.orders.listTrades({ srcCurrency: 'btc' }), 'srcCurrency'],
  ['listTrades bad fromId', (c) => c.orders.listTrades({ fromId: -3 }), 'fromId'],
  ['batchCreate with no orders', (c) => c.orders.batchCreate([]), 'orders'],
  [
    'batchCancel with 21 ids',
    (c) => c.orders.batchCancel(Array.from({ length: 21 }, (_, i) => i + 1)),
    'orderIds',
  ],
  ['batchCancel with bad id', (c) => c.orders.batchCancel([1, 0]), 'orderIds[1]'],
  [
    'getOpenCount bad tradeType',
    (c) => c.orders.getOpenCount({ tradeType: 'x' as 'spot' }),
    'tradeType',
  ],

  // Margin
  [
    'leverage below 1',
    (c) =>
      c.margin.createOrder({
        srcCurrency: 'btc',
        dstCurrency: 'usdt',
        leverage: '0.5',
        amount: '1',
        price: '1',
      }),
    'leverage',
  ],
  [
    'leverage not a 0.5 step',
    (c) =>
      c.margin.createOrder({
        srcCurrency: 'btc',
        dstCurrency: 'usdt',
        leverage: 2.3,
        amount: '1',
        price: '1',
      }),
    'leverage',
  ],
  [
    'margin bad side',
    (c) =>
      c.margin.createOrder({
        srcCurrency: 'btc',
        dstCurrency: 'usdt',
        type: 'long' as 'buy',
        amount: '1',
        price: '1',
      }),
    'type',
  ],
  ['delegation limit bad market', (c) => c.margin.getDelegationLimit('BTC USDT'), 'market'],
  ['positions bad status', (c) => c.margin.listPositions({ status: 'open' as 'active' }), 'status'],
  ['positions pageSize 0', (c) => c.margin.listPositions({ pageSize: 0 }), 'pageSize'],
  [
    'close position without amount',
    (c) => c.margin.closePosition(1, { price: '1' } as never),
    'amount',
  ],
  ['edit collateral zero', (c) => c.margin.editCollateral(1, 0), 'collateral'],

  // Wallets
  ['wallet list bad type', (c) => c.wallets.list({ type: 'futures' as 'spot' }), 'type'],
  ['summaries bad type', (c) => c.wallets.getSummaries({ type: 'futures' as 'spot' }), 'type'],
  ['balance empty currency', (c) => c.wallets.getBalance(''), 'currency'],
  ['transactions without wallet', (c) => c.wallets.getTransactions({ wallet: 0 }), 'wallet'],
  [
    'transactions pageSize 101',
    (c) => c.wallets.getTransactions({ wallet: 1, pageSize: 101 }),
    'pageSize',
  ],
  ['transactions page 0', (c) => c.wallets.getTransactions({ wallet: 1, page: 0 }), 'page'],
  [
    'history from after to',
    (c) => c.wallets.getTransactionHistory({ from: '2024-02-01', to: '2024-01-01' }),
    'from',
  ],
  ['history invalid date', (c) => c.wallets.getTransactionHistory({ from: 'yesterday' }), 'from'],
  ['history bad fromId', (c) => c.wallets.getTransactionHistory({ fromId: 0 }), 'fromId'],
  ['deposits bad date format', (c) => c.wallets.getDeposits({ from: '12/05/2022' }), 'from'],
  ['deposits invalid Date', (c) => c.wallets.getDeposits({ to: new Date('nope') }), 'to'],
  ['deposits bad wallet', (c) => c.wallets.getDeposits({ wallet: -1 }), 'wallet'],
  [
    'generate address empty currency',
    (c) => c.wallets.generateAddress({ currency: '' }),
    'currency',
  ],
  ['generate address bad wallet', (c) => c.wallets.generateAddress({ wallet: 0 }), 'wallet'],
  [
    'transfer same wallets',
    (c) => c.wallets.transfer({ currency: 'rls', amount: '1', src: 'spot', dst: 'spot' }),
    'dst',
  ],
  [
    'transfer bad src',
    (c) => c.wallets.transfer({ currency: 'rls', amount: '1', src: 'x' as 'spot', dst: 'margin' }),
    'src',
  ],

  // Withdrawals
  [
    'withdraw without address',
    (c) => c.withdrawals.create({ wallet: 1, amount: '1' } as never),
    'address',
  ],
  [
    'withdraw tag with noTag',
    (c) => c.withdrawals.create({ wallet: 1, address: 'a', amount: '1', tag: 't', noTag: true }),
    'tag',
  ],
  ['withdraw empty invoice', (c) => c.withdrawals.create({ wallet: 1, invoice: '' }), 'invoice'],
  ['withdraw bad wallet', (c) => c.withdrawals.create({ wallet: 0, invoice: 'x' }), 'wallet'],
  ['confirm non-numeric otp', (c) => c.withdrawals.confirm({ withdraw: 1, otp: '12a4' }), 'otp'],
  ['withdraw list bad date', (c) => c.withdrawals.list({ from: '2024/01/01' }), 'from'],
  [
    'rial withdraw bad account',
    (c) => c.rialWithdrawals.create({ destinationBankAccountId: 0, amount: '1' }),
    'destinationBankAccountId',
  ],

  // Account & security
  ['add card without bank', (c) => c.account.addCard({ number: '1', bank: '' }), 'bank'],
  [
    'add account without shaba',
    (c) => c.account.addBankAccount({ number: '1', shaba: '', bank: 'b' }),
    'shaba',
  ],
  ['add favorites empty', (c) => c.account.addFavoriteMarkets([]), 'markets'],
  ['remove favorite empty', (c) => c.account.removeFavoriteMarket(''), 'market'],
  [
    'address book tag required',
    (c) =>
      c.addressBook.add({ title: 't', network: 'xrp', address: 'r', otpCode: '1', tfaCode: '2' }),
    'tag',
  ],
  [
    'address book missing tfa',
    (c) =>
      c.addressBook.add({ title: 't', network: 'BSC', address: 'r', otpCode: '1', tfaCode: '' }),
    'tfaCode',
  ],
  ['address book delete bad id', (c) => c.addressBook.delete(0), 'addressId'],
  [
    'deactivate whitelist missing otp',
    (c) => c.addressBook.deactivateWhitelist({ otpCode: '', tfaCode: '1' }),
    'otpCode',
  ],
  [
    'anti-phishing code too short',
    (c) => c.security.setAntiPhishingCode({ code: 'abc', otpCode: '1' }),
    'code',
  ],
  ['otp without usage', (c) => c.security.requestOtp({ type: 'email', usage: '' }), 'usage'],
  ['referral negative share', (c) => c.referral.createLink({ friendShare: -1 }), 'friendShare'],
  ['set referrer empty', (c) => c.referral.setReferrer(''), 'referrerCode'],
  ['login without password', (c) => c.auth.login({ username: 'u', password: '' }), 'password'],

  // API keys
  [
    'api key no permissions',
    (c) => c.apiKeys.create({ name: 'n', permissions: [] }),
    'permissions',
  ],
  [
    'api key unknown permission',
    (c) => c.apiKeys.create({ name: 'n', permissions: ['ADMIN' as 'READ'] }),
    'permissions[0]',
  ],
  [
    'api key invalid expiry',
    (c) => c.apiKeys.create({ name: 'n', permissions: ['READ'], expirationDate: 'soon' }),
    'expirationDate',
  ],
  ['api key update nothing', (c) => c.apiKeys.update('k', {}), 'params'],
  ['api key delete empty', (c) => c.apiKeys.delete(''), 'publicKey'],
];

describe('local input validation', () => {
  it.each(cases)('%s → NobitexValidationError(%s)', async (_name, call, param) => {
    const { client, requests } = createTestClient({ token: 't' });
    let error: unknown;
    try {
      await call(client);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(NobitexValidationError);
    expect((error as NobitexValidationError).param).toBe(param);
    expect(requests).toHaveLength(0);
  });
});
