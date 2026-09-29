/**
 * Response samples copied from the official documentation (https://apidocs.nobitex.ir).
 * `satisfies` makes the compiler verify that the SDK types match what Nobitex returns.
 */
import type {
  DelegationLimitResponse,
  LoginResponse,
  MarketStatsResponse,
  OcoOrderResponse,
  OhlcResponse,
  OrderBookResponse,
  OrderResponse,
  PositionResponse,
  ProfileResponse,
  PublicTradesResponse,
  RialWithdrawResponse,
  TransferResponse,
  WalletsResponse,
  WithdrawResponse,
} from '../../src/index.js';
import type { OrderBookEvent, PrivateOrderEvent } from '../../src/websocket/types.js';

export const orderBook = {
  status: 'ok',
  lastUpdate: 1644991756704,
  lastTradePrice: '35650565900',
  asks: [
    ['1476091000', '1.016'],
    ['1479700000', '0.2561'],
  ],
  bids: [
    ['1470001120', '0.126571'],
    ['1470000000', '0.818994'],
  ],
} as const satisfies OrderBookResponse;

export const allOrderBooks = {
  status: 'ok',
  BTCIRT: {
    lastUpdate: 1644991756704,
    asks: [['1476091000', '1.016']],
    bids: [['1470001120', '0.126571']],
  },
  USDTIRT: {
    lastUpdate: 1644991767392,
    asks: [['277990', '6688.3']],
    bids: [['277960', '119.31']],
  },
};

export const publicTrades = {
  status: 'ok',
  trades: [
    { time: 1588689375067, price: '1470000110', volume: '0', type: 'sell' },
    { time: 1588689360464, price: '1470000110', volume: '0.002', type: 'buy' },
  ],
} as const satisfies PublicTradesResponse;

export const marketStats = {
  status: 'ok',
  stats: {
    'btc-rls': {
      isClosed: false,
      bestSell: '749976360',
      bestBuy: '733059600',
      volumeSrc: '0.2929480000',
      volumeDst: '212724856.0678640000',
      latest: '750350000',
      mark: '747461987',
      dayLow: '686021860',
      dayHigh: '750350000',
      dayOpen: '686021860',
      dayClose: '750350000',
      dayChange: '9.38',
    },
  },
} as const satisfies MarketStatsResponse;

export const ohlc = {
  s: 'ok',
  t: [1562095800, 1562182200],
  o: [146272500, 150551000],
  h: [155869600, 161869500],
  l: [140062400, 150551000],
  c: [151440200, 157000000],
  v: [18.221362316, 9.8592626506],
} satisfies OhlcResponse;

export const profile = {
  status: 'ok',
  profile: {
    firstName: 'مهدی',
    lastName: 'رضایی',
    nationalCode: '011122333',
    email: 'name@example.com',
    username: 'name@example.com',
    phone: '02142719000-9012',
    mobile: '09151111111',
    city: 'مشهد',
    bankCards: [
      {
        number: '6037-9900-0000-0000',
        bank: 'ملی',
        owner: 'مهدی رضایی',
        confirmed: true,
        status: 'confirmed',
      },
    ],
    bankAccounts: [
      {
        id: 1999,
        number: '0346666666666',
        shaba: 'IR460170000000346666666666',
        bank: 'ملی',
        owner: 'مهدی رضایی',
        confirmed: true,
        status: 'confirmed',
      },
    ],
    verifications: {
      email: true,
      phone: true,
      mobile: true,
      identity: true,
      selfie: false,
      bankAccount: true,
      bankCard: true,
      address: true,
      city: true,
      nationalSerialNumber: true,
    },
    pendingVerifications: { email: false, phone: false },
    options: {
      fee: '0.35',
      feeUsdt: '0.2',
      isManualFee: false,
      tfa: false,
      socialLoginEnabled: false,
    },
    withdrawEligible: true,
  },
  tradeStats: { monthTradesTotal: '10867181.5365000000', monthTradesCount: 3 },
  websocketAuthParam: '1987577cdf7c7422dee369e188e276ee',
} satisfies ProfileResponse;

export const wallets = {
  status: 'ok',
  wallets: [
    {
      depositAddress: null,
      depositTag: null,
      depositInfo: { FIAT_MONEY: { address: null, tag: null } },
      id: 2693280,
      currency: 'rls',
      balance: '746212980',
      blockedBalance: '0',
      activeBalance: '746212980',
      rialBalance: 746212980,
      rialBalanceSell: 746212980,
    },
  ],
} satisfies WalletsResponse;

export const order = {
  status: 'ok',
  order: {
    type: 'sell',
    srcCurrency: 'Bitcoin',
    dstCurrency: 'ریال',
    price: '520000000',
    amount: '0.6',
    totalPrice: '312000000.0',
    matchedAmount: 0,
    unmatchedAmount: '0.6',
    id: 25,
    status: 'Active',
    partial: false,
    fee: 0,
    created_at: '2018-11-28T11:36:13.592827+00:00',
    clientOrderId: 'order1',
  },
} satisfies OrderResponse;

export const ocoOrder = {
  status: 'ok',
  orders: [
    {
      id: 27,
      type: 'buy',
      execution: 'Limit',
      market: 'BTC-USDT',
      srcCurrency: 'Bitcoin',
      dstCurrency: 'Tether',
      price: '42390',
      amount: '0.01',
      totalPrice: '0',
      totalOrderPrice: '423.9',
      matchedAmount: '0',
      unmatchedAmount: '0.01',
      status: 'Active',
      created_at: '2022-04-10T10:12:38.402795+00:00',
      pairId: 28,
      clientOrderId: 'order1',
    },
    {
      id: 28,
      type: 'buy',
      execution: 'StopLimit',
      market: 'BTC-USDT',
      srcCurrency: 'Bitcoin',
      dstCurrency: 'Tether',
      price: '42715',
      amount: '0.01',
      param1: '42700',
      totalPrice: '0',
      totalOrderPrice: '427.15',
      matchedAmount: '0',
      unmatchedAmount: '0.01',
      status: 'Inactive',
      created_at: '2022-04-10T10:12:38.402795+00:00',
      pairId: 27,
      clientOrderId: null,
    },
  ],
} satisfies OcoOrderResponse;

export const transfer = {
  status: 'ok',
  srcWallet: {
    id: 53456,
    currency: 'rls',
    balance: '1870000000',
    blockedBalance: '420000000',
    activeBalance: '1450000000',
    rialBalance: '1870000000',
    rialBalanceSell: '1870000000',
    depositAddress: null,
    depositTag: null,
    depositInfo: { FIAT_MONEY: { address: null, tag: null } },
  },
  dstWallet: {
    id: 86459,
    currency: 'rls',
    balance: '2500000000',
    blockedBalance: '0',
    activeBalance: '2500000000',
    rialBalance: '2500000000',
    rialBalanceSell: '2500000000',
  },
} satisfies TransferResponse;

export const delegationLimit = {
  status: 'ok',
  limits: {
    buy: [{ leverage: '1', limit: '1250' }],
    sell: [{ leverage: '1', limit: '0.021' }],
  },
} satisfies DelegationLimitResponse;

export const position = {
  status: 'ok',
  position: {
    id: 128,
    createdAt: '2022-10-20T11:36:13.604420+00:00',
    srcCurrency: 'btc',
    dstCurrency: 'rls',
    side: 'sell',
    status: 'Open',
    marginType: 'Isolated Margin',
    collateral: '320000000',
    leverage: '2',
    openedAt: '2022-10-20T11:36:16.562038+00:00',
    closedAt: null,
    liquidationPrice: '25174302690',
    entryPrice: '6400000000',
    exitPrice: null,
    delegatedAmount: '0.03',
    liability: '0.0300450676',
    totalAsset: '831712000',
    marginRatio: '1.49',
    liabilityInOrder: '0',
    assetInOrder: '0',
    unrealizedPNL: '-576435',
    unrealizedPNLPercent: '-0.09',
    expirationDate: '2022-11-20',
    extensionFee: '320000',
    markPrice: '6430000000',
  },
} satisfies PositionResponse;

export const withdraw = {
  status: 'ok',
  withdraw: {
    id: 432,
    createdAt: '2021-12-11T10:13:42.957103+00:00',
    status: 'New',
    amount: '0.0123',
    currency: 'btc',
    network: 'BTCLN',
    invoice: 'lnbc123m1pskcu80pp5qqqsyqcyq5rqwz',
    address: 'SaMpLeWaLlEtAdDrEsS',
    tag: '123456',
    wallet_id: 3456,
    blockchain_url: 'https://nobitex.ir/receipt/Bitcoin/ewd23d',
    is_cancelable: true,
  },
} satisfies WithdrawResponse;

export const rialWithdraw = {
  status: 'ok',
  result: {
    id: 'CW430542',
    createdAt: '2021-12-11T10:13:42.957103+00:00',
    status: 'New',
    amount: '2500000000',
    fee: '500000',
    fulfilledAmount: '499500000',
    bankAccountId: 13568,
    bankAccountInfo: 'صادرات: IR670190123456789001234567',
    isCancelable: true,
    records: [
      {
        amount: '1000000000',
        bankReferenceNumber: null,
        status: 'Pending',
        estimatedSettleAt: null,
        providerUpdatedAt: '2021-12-11T10:13:42.957103+00:00',
        transferType: 'normal',
      },
    ],
  },
} satisfies RialWithdrawResponse;

export const login = {
  status: 'success',
  key: 'db2055f743c1ac8c30d23278a496283b1e2dd46f',
  device: 'AlRyansW',
} satisfies LoginResponse;

export const rateLimited = {
  status: 'failed',
  code: 'TooManyRequests',
  message: 'تعداد درخواست شما بیش از حد معمول تشخیص داده شده. لطفا 12 ثانیه صبر نمایید.',
  backOff: 12,
  limit: 60,
};

export const orderBookEvent = {
  asks: [['35077909990', '0.009433']],
  bids: [['35020080080', '0.185784']],
  lastTradePrice: '35077909990',
  lastUpdate: 1726581829816,
} satisfies OrderBookEvent;

export const privateOrderEvent = {
  amount: '0.0002',
  avgFilledPrice: '114879999920',
  clientOrderId: null,
  dstCurrency: 'rls',
  eventTime: 1762779011366,
  fee: '0.00000031',
  filledAmount: '0.0002',
  lastFillTime: 1762779011258,
  marketType: 'Spot',
  orderId: 278339,
  orderType: 'Market',
  param1: null,
  price: null,
  side: 'Buy',
  srcCurrency: 'btc',
  status: 'Done',
  tradeAmount: '0.0002',
  tradeId: 92547,
  tradePrice: '114879999920',
} satisfies PrivateOrderEvent;
