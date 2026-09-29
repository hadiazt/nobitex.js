import { describe, expect, it } from 'vitest';
import type { NobitexClient } from '../../src/index.js';
import { createTestClient, jsonResponse, queryOf } from '../helpers/mock-fetch.js';

interface EndpointCase {
  name: string;
  call: (client: NobitexClient) => Promise<unknown>;
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  /** `none` → no auth header may be sent even when credentials exist. */
  auth?: 'required' | 'none' | 'optional';
  totp?: string;
}

const cases: EndpointCase[] = [
  // --- Market (public) ---------------------------------------------------------------------
  {
    name: 'market.getOrderBook',
    call: (c) => c.market.getOrderBook('btcirt'),
    method: 'GET',
    path: '/v3/orderbook/BTCIRT',
    auth: 'none',
  },
  {
    name: 'market.getAllOrderBooks',
    call: (c) => c.market.getAllOrderBooks(),
    method: 'GET',
    path: '/v3/orderbook/all',
    auth: 'none',
  },
  {
    name: 'market.getDepth',
    call: (c) => c.market.getDepth('BTCIRT'),
    method: 'GET',
    path: '/v2/depth/BTCIRT',
    auth: 'none',
  },
  {
    name: 'market.getTrades',
    call: (c) => c.market.getTrades('BCHIRT'),
    method: 'GET',
    path: '/v2/trades/BCHIRT',
    auth: 'none',
  },
  {
    name: 'market.getStats',
    call: (c) => c.market.getStats({ srcCurrency: ['btc', 'usdt'], dstCurrency: 'rls' }),
    method: 'GET',
    path: '/market/stats',
    query: { srcCurrency: 'btc,usdt', dstCurrency: 'rls' },
    auth: 'none',
  },
  {
    name: 'market.getOHLC',
    call: (c) =>
      c.market.getOHLC({
        symbol: 'BTCIRT',
        resolution: 'D',
        from: 1562058167,
        to: new Date(1562230967_000),
        countback: 4,
        page: 2,
      }),
    method: 'GET',
    path: '/market/udf/history',
    query: {
      symbol: 'BTCIRT',
      resolution: 'D',
      from: '1562058167',
      to: '1562230967',
      countback: '4',
      page: '2',
    },
    auth: 'none',
  },
  {
    name: 'system.getOptions',
    call: (c) => c.system.getOptions(),
    method: 'GET',
    path: '/v2/options',
    auth: 'none',
  },

  // --- Account ------------------------------------------------------------------------------
  {
    name: 'account.getProfile',
    call: (c) => c.account.getProfile(),
    method: 'GET',
    path: '/users/profile',
  },
  {
    name: 'account.getLimitations',
    call: (c) => c.account.getLimitations(),
    method: 'GET',
    path: '/users/limitations',
  },
  {
    name: 'account.addCard',
    call: (c) => c.account.addCard({ number: '5041721011111111', bank: 'رسالت' }),
    method: 'POST',
    path: '/users/cards-add',
    body: { number: '5041721011111111', bank: 'رسالت' },
  },
  {
    name: 'account.addBankAccount',
    call: (c) =>
      c.account.addBankAccount({
        number: '5041721011111111',
        shaba: 'IR111111111111111111111111',
        bank: 'رسالت',
      }),
    method: 'POST',
    path: '/users/accounts-add',
    body: { number: '5041721011111111', shaba: 'IR111111111111111111111111', bank: 'رسالت' },
  },
  {
    name: 'account.getFavoriteMarkets',
    call: (c) => c.account.getFavoriteMarkets(),
    method: 'GET',
    path: '/users/markets/favorite',
  },
  {
    name: 'account.addFavoriteMarkets',
    call: (c) => c.account.addFavoriteMarkets(['BTCIRT', 'DOGEUSDT']),
    method: 'POST',
    path: '/users/markets/favorite',
    body: { market: 'BTCIRT,DOGEUSDT' },
  },
  {
    name: 'account.removeFavoriteMarket',
    call: (c) => c.account.removeFavoriteMarket('All'),
    method: 'DELETE',
    path: '/users/markets/favorite',
    query: { market: 'All' },
  },

  // --- Wallets ------------------------------------------------------------------------------
  {
    name: 'wallets.list',
    call: (c) => c.wallets.list({ type: 'margin' }),
    method: 'GET',
    path: '/users/wallets/list',
    query: { type: 'margin' },
  },
  {
    name: 'wallets.getSummaries',
    call: (c) => c.wallets.getSummaries({ currencies: ['rls', 'btc'], type: 'spot' }),
    method: 'GET',
    path: '/v2/wallets',
    query: { currencies: 'rls,btc', type: 'spot' },
  },
  {
    name: 'wallets.getBalance',
    call: (c) => c.wallets.getBalance('LTC'),
    method: 'POST',
    path: '/users/wallets/balance',
    body: { currency: 'ltc' },
  },
  {
    name: 'wallets.getTransactions',
    call: (c) => c.wallets.getTransactions({ wallet: 4159, page: 2, pageSize: 10 }),
    method: 'GET',
    path: '/users/wallets/transactions/list',
    query: { wallet: '4159', page: '2', pageSize: '10' },
  },
  {
    name: 'wallets.getTransactionHistory',
    call: (c) =>
      c.wallets.getTransactionHistory({
        currency: 'ltc',
        tp: 'withdraw',
        from: new Date('2018-10-01T00:00:00Z'),
        to: '2018-10-20T00:00:00.000000+00:00',
        fromId: 96124,
      }),
    method: 'GET',
    path: '/users/transactions-history',
    query: {
      currency: 'ltc',
      tp: 'withdraw',
      from: '2018-10-01T00:00:00.000Z',
      to: '2018-10-20T00:00:00.000000+00:00',
      from_id: '96124',
    },
  },
  {
    name: 'wallets.getDeposits',
    call: (c) =>
      c.wallets.getDeposits({ wallet: 4159, from: '2022-05-12', to: new Date('2022-07-22') }),
    method: 'GET',
    path: '/users/wallets/deposits/list',
    query: { wallet: '4159', from: '2022-05-12', to: '2022-07-22' },
  },
  {
    name: 'wallets.generateAddress',
    call: (c) => c.wallets.generateAddress({ currency: 'BTC', network: 'BSC' }),
    method: 'POST',
    path: '/users/wallets/generate-address',
    body: { currency: 'btc', network: 'BSC' },
  },
  {
    name: 'wallets.generateAddress (legacy wallet id)',
    call: (c) => c.wallets.generateAddress({ wallet: 4159 }),
    method: 'POST',
    path: '/users/wallets/generate-address',
    body: { wallet: 4159 },
  },
  {
    name: 'wallets.transfer',
    call: (c) =>
      c.wallets.transfer({ currency: 'rls', amount: 2500000000, src: 'spot', dst: 'margin' }),
    method: 'POST',
    path: '/wallets/transfer',
    body: { currency: 'rls', amount: '2500000000', src: 'spot', dst: 'margin' },
  },

  // --- Spot orders --------------------------------------------------------------------------
  {
    name: 'orders.create (limit)',
    call: (c) =>
      c.orders.create({
        type: 'buy',
        srcCurrency: 'BTC',
        dstCurrency: 'rls',
        amount: '0.6',
        price: 520000000,
        clientOrderId: 'order1',
      }),
    method: 'POST',
    path: '/market/orders/add',
    body: {
      type: 'buy',
      srcCurrency: 'btc',
      dstCurrency: 'rls',
      amount: '0.6',
      execution: 'limit',
      price: '520000000',
      clientOrderId: 'order1',
    },
  },
  {
    name: 'orders.create (stop_market, pro)',
    call: (c) =>
      c.orders.create({
        type: 'sell',
        srcCurrency: 'doge',
        dstCurrency: 'rls',
        amount: '64',
        execution: 'stop_market',
        stopPrice: 47500,
        pro: true,
      }),
    method: 'POST',
    path: '/market/orders/add',
    body: {
      type: 'sell',
      srcCurrency: 'doge',
      dstCurrency: 'rls',
      amount: '64',
      execution: 'stop_market',
      stopPrice: '47500',
      pro: 'yes',
    },
  },
  {
    name: 'orders.create (oco)',
    call: (c) =>
      c.orders.create({
        type: 'buy',
        srcCurrency: 'btc',
        dstCurrency: 'usdt',
        amount: '0.01',
        mode: 'oco',
        price: 42390,
        stopPrice: 42700,
        stopLimitPrice: 42715,
      }),
    method: 'POST',
    path: '/market/orders/add',
    body: {
      type: 'buy',
      srcCurrency: 'btc',
      dstCurrency: 'usdt',
      amount: '0.01',
      mode: 'oco',
      price: '42390',
      stopPrice: '42700',
      stopLimitPrice: '42715',
    },
  },
  {
    name: 'orders.getStatus (id)',
    call: (c) => c.orders.getStatus({ id: 5684 }),
    method: 'POST',
    path: '/market/orders/status',
    body: { id: 5684 },
  },
  {
    name: 'orders.getStatus (clientOrderId)',
    call: (c) => c.orders.getStatus({ clientOrderId: 'order1' }),
    method: 'POST',
    path: '/market/orders/status',
    body: { clientOrderId: 'order1' },
  },
  {
    name: 'orders.list',
    call: (c) =>
      c.orders.list({
        status: 'all',
        srcCurrency: 'BTC',
        dstCurrency: 'usdt',
        details: 2,
        order: '-created_at',
        tradeType: 'spot',
        execution: 'limit',
        type: 'sell',
        page: 2,
        pageSize: 500,
      }),
    method: 'GET',
    path: '/market/orders/list',
    query: {
      status: 'all',
      srcCurrency: 'btc',
      dstCurrency: 'usdt',
      details: '2',
      order: '-created_at',
      tradeType: 'spot',
      execution: 'limit',
      type: 'sell',
      page: '2',
      pageSize: '500',
    },
  },
  {
    name: 'orders.updateStatus',
    call: (c) => c.orders.updateStatus({ order: 5684, status: 'canceled' }),
    method: 'POST',
    path: '/market/orders/update-status',
    body: { order: 5684, status: 'canceled' },
  },
  {
    name: 'orders.cancel (id)',
    call: (c) => c.orders.cancel(5684),
    method: 'POST',
    path: '/market/orders/update-status',
    body: { order: 5684, status: 'canceled' },
  },
  {
    name: 'orders.cancel (clientOrderId)',
    call: (c) => c.orders.cancel({ clientOrderId: 'order1' }),
    method: 'POST',
    path: '/market/orders/update-status',
    body: { clientOrderId: 'order1', status: 'canceled' },
  },
  {
    name: 'orders.cancelBulk',
    call: (c) =>
      c.orders.cancelBulk({
        execution: 'limit',
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        hours: 2.4,
        tradeType: 'spot',
      }),
    method: 'POST',
    path: '/market/orders/cancel-old',
    body: {
      execution: 'limit',
      srcCurrency: 'btc',
      dstCurrency: 'rls',
      hours: 2.4,
      tradeType: 'spot',
    },
  },
  {
    name: 'orders.listTrades',
    call: (c) => c.orders.listTrades({ srcCurrency: 'usdt', dstCurrency: 'rls', fromId: 10023 }),
    method: 'GET',
    path: '/market/trades/list',
    query: { srcCurrency: 'usdt', dstCurrency: 'rls', fromId: '10023' },
  },
  {
    name: 'orders.batchCreate',
    call: (c) =>
      c.orders.batchCreate(
        [
          { type: 'buy', srcCurrency: 'btc', dstCurrency: 'rls', amount: '0.6', price: 520000000 },
          {
            type: 'buy',
            srcCurrency: 'btc',
            dstCurrency: 'usdt',
            amount: '0.01',
            mode: 'oco',
            price: 42390,
            stopPrice: 42700,
            stopLimitPrice: 42715,
          },
        ],
        { pro: true },
      ),
    method: 'POST',
    path: '/market/orders/batch-add',
    body: {
      data: [
        {
          type: 'buy',
          srcCurrency: 'btc',
          dstCurrency: 'rls',
          amount: '0.6',
          execution: 'limit',
          price: '520000000',
        },
        {
          type: 'buy',
          srcCurrency: 'btc',
          dstCurrency: 'usdt',
          amount: '0.01',
          mode: 'oco',
          price: '42390',
          stopPrice: '42700',
          stopLimitPrice: '42715',
        },
      ],
      pro: 'yes',
    },
  },
  {
    name: 'orders.batchCancel',
    call: (c) => c.orders.batchCancel([1, 2]),
    method: 'POST',
    path: '/market/orders/cancel-batch',
    body: { orderIds: [1, 2] },
  },
  {
    name: 'orders.getOpenCount',
    call: (c) => c.orders.getOpenCount({ tradeType: 'margin' }),
    method: 'GET',
    path: '/market/orders/open-count',
    query: { tradeType: 'margin' },
  },

  // --- Margin -------------------------------------------------------------------------------
  {
    name: 'margin.getMarkets',
    call: (c) => c.margin.getMarkets(),
    method: 'GET',
    path: '/margin/markets/list',
    auth: 'optional',
  },
  {
    name: 'margin.getLiquidityPools',
    call: (c) => c.margin.getLiquidityPools(),
    method: 'GET',
    path: '/liquidity-pools/list',
  },
  {
    name: 'margin.getDelegationLimit',
    call: (c) => c.margin.getDelegationLimit('btcusdt'),
    method: 'GET',
    path: '/margin/v2/delegation-limit',
    query: { market: 'BTCUSDT' },
  },
  {
    name: 'margin.createOrder',
    call: (c) =>
      c.margin.createOrder({
        srcCurrency: 'btc',
        dstCurrency: 'rls',
        leverage: '2',
        amount: '0.01',
        price: '6400000000',
      }),
    method: 'POST',
    path: '/margin/orders/add',
    body: {
      srcCurrency: 'btc',
      dstCurrency: 'rls',
      leverage: '2',
      amount: '0.01',
      execution: 'limit',
      price: '6400000000',
    },
  },
  {
    name: 'margin.createOrder (oco, buy)',
    call: (c) =>
      c.margin.createOrder({
        srcCurrency: 'btc',
        dstCurrency: 'usdt',
        type: 'buy',
        leverage: 1.5,
        amount: '0.01',
        mode: 'oco',
        price: '13400',
        stopPrice: '12600',
        stopLimitPrice: '12610',
      }),
    method: 'POST',
    path: '/margin/orders/add',
    body: {
      srcCurrency: 'btc',
      dstCurrency: 'usdt',
      type: 'buy',
      leverage: '1.5',
      amount: '0.01',
      mode: 'oco',
      price: '13400',
      stopPrice: '12600',
      stopLimitPrice: '12610',
    },
  },
  {
    name: 'margin.listPositions',
    call: (c) => c.margin.listPositions({ srcCurrency: 'btc', status: 'past', page: 1 }),
    method: 'GET',
    path: '/positions/list',
    query: { srcCurrency: 'btc', status: 'past', page: '1' },
  },
  {
    name: 'margin.getPosition',
    call: (c) => c.margin.getPosition(128),
    method: 'GET',
    path: '/positions/128/status',
  },
  {
    name: 'margin.closePosition',
    call: (c) => c.margin.closePosition(128, { amount: '0.0100150225', price: '6200000000' }),
    method: 'POST',
    path: '/positions/128/close',
    body: { amount: '0.0100150225', execution: 'limit', price: '6200000000' },
  },
  {
    name: 'margin.editCollateral',
    call: (c) => c.margin.editCollateral(128, '230000000'),
    method: 'POST',
    path: '/positions/128/edit-collateral',
    body: { collateral: '230000000' },
  },

  // --- Withdrawals --------------------------------------------------------------------------
  {
    name: 'withdrawals.create (invoice)',
    call: (c) => c.withdrawals.create({ wallet: 3456, invoice: 'lnbc123m1' }, { totp: '123456' }),
    method: 'POST',
    path: '/users/wallets/withdraw',
    body: { wallet: 3456, invoice: 'lnbc123m1' },
    totp: '123456',
  },
  {
    name: 'withdrawals.create (address)',
    call: (c) =>
      c.withdrawals.create({
        wallet: 3456,
        network: 'XRP',
        address: 'rAddr',
        amount: 0.123,
        tag: '123456',
        explanations: 'note',
      }),
    method: 'POST',
    path: '/users/wallets/withdraw',
    body: {
      wallet: 3456,
      network: 'XRP',
      explanations: 'note',
      address: 'rAddr',
      amount: '0.123',
      tag: '123456',
    },
  },
  {
    name: 'withdrawals.confirm',
    call: (c) => c.withdrawals.confirm({ withdraw: 432, otp: '023005' }),
    method: 'POST',
    path: '/users/wallets/withdraw-confirm',
    body: { withdraw: 432, otp: '023005' },
  },
  {
    name: 'withdrawals.get',
    call: (c) => c.withdrawals.get(433),
    method: 'GET',
    path: '/withdraws/433',
  },
  {
    name: 'withdrawals.list',
    call: (c) => c.withdrawals.list({ wallet: 3456, pageSize: 20 }),
    method: 'GET',
    path: '/users/wallets/withdraws/list',
    query: { wallet: '3456', pageSize: '20' },
  },
  {
    name: 'rialWithdrawals.create',
    call: (c) =>
      c.rialWithdrawals.create({ destinationBankAccountId: 13568, amount: '2500000000' }),
    method: 'POST',
    path: '/cobank/withdraw',
    body: { destinationBankAccountId: 13568, amount: '2500000000' },
  },
  {
    name: 'rialWithdrawals.cancel',
    call: (c) => c.rialWithdrawals.cancel('CW430542'),
    method: 'POST',
    path: '/cobank/withdraw/CW430542/cancel',
  },
  {
    name: 'rialWithdrawals.get',
    call: (c) => c.rialWithdrawals.get('CW430542'),
    method: 'GET',
    path: '/cobank/withdraw/CW430542',
  },

  // --- Address book -------------------------------------------------------------------------
  {
    name: 'addressBook.list',
    call: (c) => c.addressBook.list({ network: 'BSC' }),
    method: 'GET',
    path: '/address_book',
    query: { network: 'BSC' },
  },
  {
    name: 'addressBook.add',
    call: (c) =>
      c.addressBook.add({
        title: 'test',
        network: 'bsc',
        address: '0xabc',
        otpCode: '123456',
        tfaCode: '654321',
      }),
    method: 'POST',
    path: '/address_book',
    body: { title: 'test', network: 'BSC', address: '0xabc', otpCode: '123456', tfaCode: '654321' },
  },
  {
    name: 'addressBook.delete',
    call: (c) => c.addressBook.delete(5),
    method: 'DELETE',
    path: '/address_book/5/delete',
  },
  {
    name: 'addressBook.activateWhitelist',
    call: (c) => c.addressBook.activateWhitelist(),
    method: 'POST',
    path: '/address_book/whitelist/activate',
  },
  {
    name: 'addressBook.deactivateWhitelist',
    call: (c) => c.addressBook.deactivateWhitelist({ otpCode: '1234', tfaCode: '12345' }),
    method: 'POST',
    path: '/address_book/whitelist/deactivate',
    body: { otpCode: '1234', tfaCode: '12345' },
  },

  // --- Security -----------------------------------------------------------------------------
  {
    name: 'security.getLoginAttempts',
    call: (c) => c.security.getLoginAttempts(),
    method: 'GET',
    path: '/users/login-attempts',
  },
  {
    name: 'security.activateEmergencyCancel',
    call: (c) => c.security.activateEmergencyCancel(),
    method: 'GET',
    path: '/security/emergency-cancel/activate',
  },
  {
    name: 'security.setAntiPhishingCode',
    call: (c) => c.security.setAntiPhishingCode({ code: 'sample_code', otpCode: '12345' }),
    method: 'POST',
    path: '/security/anti-phishing',
    body: { code: 'sample_code', otpCode: '12345' },
  },
  {
    name: 'security.getAntiPhishingCode',
    call: (c) => c.security.getAntiPhishingCode(),
    method: 'GET',
    path: '/security/anti-phishing',
  },
  {
    name: 'security.requestOtp',
    call: (c) => c.security.requestOtp({ type: 'email', usage: 'address_book' }),
    method: 'POST',
    path: '/v2/otp/request',
    body: { type: 'email', usage: 'address_book' },
  },

  // --- Referral -----------------------------------------------------------------------------
  {
    name: 'referral.listLinks',
    call: (c) => c.referral.listLinks(),
    method: 'GET',
    path: '/users/referral/links-list',
  },
  {
    name: 'referral.createLink',
    call: (c) => c.referral.createLink({ friendShare: 10 }),
    method: 'POST',
    path: '/users/referral/links-add',
    body: { friendShare: 10 },
  },
  {
    name: 'referral.getStatus',
    call: (c) => c.referral.getStatus(),
    method: 'GET',
    path: '/users/referral/referral-status',
  },
  {
    name: 'referral.setReferrer',
    call: (c) => c.referral.setReferrer('40404'),
    method: 'POST',
    path: '/users/referral/set-referrer',
    body: { referrerCode: '40404' },
  },

  // --- Portfolio ----------------------------------------------------------------------------
  {
    name: 'portfolio.getDailyProfit',
    call: (c) => c.portfolio.getDailyProfit({ monthly: true }),
    method: 'POST',
    path: '/users/portfolio/last-week-daily-profit',
    body: { monthly: true },
  },
  {
    name: 'portfolio.getDailyTotalProfit',
    call: (c) => c.portfolio.getDailyTotalProfit(),
    method: 'POST',
    path: '/users/portfolio/last-week-daily-total-profit',
  },
  {
    name: 'portfolio.getMonthlyTotalProfit',
    call: (c) => c.portfolio.getMonthlyTotalProfit(),
    method: 'POST',
    path: '/users/portfolio/last-month-total-profit',
  },

  // --- Auth & API keys ----------------------------------------------------------------------
  {
    name: 'auth.getWebSocketToken',
    call: (c) => c.auth.getWebSocketToken(),
    method: 'GET',
    path: '/auth/ws/token/',
  },
  {
    name: 'apiKeys.create',
    call: (c) =>
      c.apiKeys.create(
        {
          name: 'my-api-key',
          description: 'internal',
          permissions: ['READ', 'TRADE', 'READ'],
          ipAddressesWhitelist: ['192.168.1.10'],
          expirationDate: new Date('2025-12-31T23:59:59Z'),
        },
        { totp: '999999' },
      ),
    method: 'POST',
    path: '/apikeys/create',
    body: {
      name: 'my-api-key',
      description: 'internal',
      permissions: 'READ,TRADE',
      ipAddressesWhitelist: ['192.168.1.10'],
      expirationDate: '2025-12-31T23:59:59.000Z',
    },
    totp: '999999',
  },
  {
    name: 'apiKeys.list',
    call: (c) => c.apiKeys.list(),
    method: 'GET',
    path: '/apikeys/list',
  },
  {
    name: 'apiKeys.update (url-encodes the key)',
    call: (c) => c.apiKeys.update('ab/c+d=', { name: 'renamed' }),
    method: 'POST',
    path: '/apikeys/update/ab%2Fc%2Bd%3D',
    body: { name: 'renamed' },
  },
  {
    name: 'apiKeys.delete',
    call: (c) => c.apiKeys.delete('5XOCQZSPLQM4MiLzuUnZoBuqgYgTKl40W2X5j1pxfIA='),
    method: 'POST',
    path: '/apikeys/delete/5XOCQZSPLQM4MiLzuUnZoBuqgYgTKl40W2X5j1pxfIA%3D',
  },
];

describe('endpoint mapping', () => {
  it.each(cases)('$name → $method $path', async (tc) => {
    const { client, last } = createTestClient({ token: 'secret-token' }, (request) =>
      jsonResponse(
        request.url.pathname === '/market/udf/history' ? { s: 'no_data' } : { status: 'ok' },
      ),
    );

    await tc.call(client);
    const request = last();

    expect(request.method).toBe(tc.method);
    expect(request.url.pathname).toBe(tc.path);
    expect(queryOf(request)).toEqual(tc.query ?? {});
    expect(request.body).toEqual(tc.body);

    if (tc.body === undefined) expect(request.headers['content-type']).toBeUndefined();
    else expect(request.headers['content-type']).toBe('application/json');

    if (tc.auth === 'none') expect(request.headers.authorization).toBeUndefined();
    else expect(request.headers.authorization).toBe('Token secret-token');

    expect(request.headers['x-totp']).toBe(tc.totp);
  });

  it('covers every public resource method', () => {
    const { client } = createTestClient();
    const resources = [
      'market',
      'system',
      'account',
      'wallets',
      'orders',
      'margin',
      'withdrawals',
      'rialWithdrawals',
      'addressBook',
      'security',
      'referral',
      'portfolio',
      'auth',
      'apiKeys',
    ] as const;
    const tested = new Set(cases.map((tc) => tc.name.split(' ')[0]));
    // Login/logout have dedicated tests because they mutate client state.
    const excluded = new Set(['auth.login', 'auth.logout']);

    const missing: string[] = [];
    for (const name of resources) {
      const proto = Object.getPrototypeOf(client[name]) as object;
      for (const method of Object.getOwnPropertyNames(proto)) {
        if (method === 'constructor') continue;
        const id = `${name}.${method}`;
        if (!tested.has(id) && !excluded.has(id)) missing.push(id);
      }
    }
    expect(missing).toEqual([]);
  });

  it('allows optional-auth endpoints without credentials', async () => {
    const { client, last } = createTestClient({}, () =>
      jsonResponse({ status: 'ok', markets: {} }),
    );
    await client.margin.getMarkets();
    expect(last().headers.authorization).toBeUndefined();
  });
});
