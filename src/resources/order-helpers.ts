import { CLIENT_ORDER_ID_MAX_LENGTH } from '../constants.js';
import type { OcoParams, OrderExecutionParam, OrderExecutionParams } from '../types/index.js';
import { toPositiveMonetaryString } from '../utils/format.js';
import { assertNonEmptyString, assertOneOf, ensure } from '../utils/validation.js';

/** Accepted `execution` values. */
export const ORDER_EXECUTIONS: readonly OrderExecutionParam[] = [
  'limit',
  'market',
  'stop_limit',
  'stop_market',
];
/** Accepted order sides. */
export const ORDER_SIDES = ['buy', 'sell'] as const;
/** Accepted `tradeType` filter values. */
export const TRADE_TYPES = ['spot', 'margin'] as const;

function isOco(params: OrderExecutionParams | OcoParams): params is OcoParams {
  return 'mode' in params && (params as { mode?: unknown }).mode !== undefined;
}

/**
 * Validates and serialises the price-related fields (`execution`, `price`, `stopPrice`,
 * `mode`, `stopLimitPrice`) shared by spot orders, margin orders and position-close orders.
 */
export function buildPriceFields(params: OrderExecutionParams | OcoParams): Record<string, string> {
  if (isOco(params)) {
    assertOneOf(params.mode, 'mode', ['oco'] as const);
    return {
      mode: 'oco',
      price: toPositiveMonetaryString(params.price, 'price'),
      stopPrice: toPositiveMonetaryString(params.stopPrice, 'stopPrice'),
      stopLimitPrice: toPositiveMonetaryString(params.stopLimitPrice, 'stopLimitPrice'),
    };
  }

  const execution = params.execution ?? 'limit';
  assertOneOf(execution, 'execution', ORDER_EXECUTIONS);
  const fields: Record<string, string> = { execution };
  const needsPrice = execution === 'limit' || execution === 'stop_limit';
  const isStop = execution === 'stop_limit' || execution === 'stop_market';

  ensure(!needsPrice || params.price !== undefined, 'price', `is required for ${execution} orders`);
  ensure(
    isStop === (params.stopPrice !== undefined),
    'stopPrice',
    isStop ? `is required for ${execution} orders` : `is only allowed for stop orders`,
  );

  if (params.price !== undefined) fields.price = toPositiveMonetaryString(params.price, 'price');
  if (params.stopPrice !== undefined) {
    fields.stopPrice = toPositiveMonetaryString(params.stopPrice, 'stopPrice');
  }
  return fields;
}

/** Validates an optional `clientOrderId`. */
export function assertClientOrderId(value: unknown): void {
  if (value === undefined) return;
  assertNonEmptyString(value, 'clientOrderId');
  ensure(
    value.length <= CLIENT_ORDER_ID_MAX_LENGTH,
    'clientOrderId',
    `must be at most ${CLIENT_ORDER_ID_MAX_LENGTH} characters`,
  );
}

/** Validates a market pair and returns lower-cased currency codes. */
export function marketPair(
  srcCurrency: unknown,
  dstCurrency: unknown,
): { srcCurrency: string; dstCurrency: string } {
  assertNonEmptyString(srcCurrency, 'srcCurrency');
  assertNonEmptyString(dstCurrency, 'dstCurrency');
  return { srcCurrency: srcCurrency.toLowerCase(), dstCurrency: dstCurrency.toLowerCase() };
}
