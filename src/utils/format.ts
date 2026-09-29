import type { MonetaryInput } from '../types/common.js';
import { ensure } from './validation.js';

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

/**
 * Converts a monetary input into the decimal string sent to the API.
 *
 * Numbers are rendered without exponent notation (`1e-7` → `"0.0000001"`), strings are validated
 * as plain non-negative decimals. Strings are recommended for full precision.
 */
export function toMonetaryString(value: MonetaryInput, param: string): string {
  if (typeof value === 'number') {
    ensure(Number.isFinite(value) && value >= 0, param, 'must be a finite, non-negative number');
    let text = String(value);
    if (text.includes('e')) {
      ensure(value < 1e21, param, 'is too large to be represented without precision loss');
      text = value.toFixed(20).replace(/\.?0+$/, '');
    }
    return text;
  }
  ensure(
    typeof value === 'string' && DECIMAL_PATTERN.test(value.trim()),
    param,
    'must be a non-negative decimal number, e.g. "0.015"',
  );
  return value.trim();
}

/** Like {@link toMonetaryString} but additionally requires a value greater than zero. */
export function toPositiveMonetaryString(value: MonetaryInput, param: string): string {
  const text = toMonetaryString(value, param);
  ensure(/[1-9]/.test(text), param, 'must be greater than zero');
  return text;
}

/** Formats a date as `YYYY-MM-DD` (UTC). Strings are passed through after a format check. */
export function toDateOnly(value: string | Date, param: string): string {
  if (value instanceof Date) {
    ensure(!Number.isNaN(value.getTime()), param, 'is an invalid Date');
    return value.toISOString().slice(0, 10);
  }
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(value), param, 'must be a Date or a "YYYY-MM-DD" string');
  return value;
}

/** Formats a date as an ISO-8601 string. Strings are passed through after a parse check. */
export function toIsoDateTime(value: string | Date, param: string): string {
  const date = value instanceof Date ? value : new Date(value);
  ensure(!Number.isNaN(date.getTime()), param, 'must be a Date or an ISO-8601 date-time string');
  return value instanceof Date ? value.toISOString() : value;
}

/** Converts a `Date` or a Unix timestamp (seconds) into Unix seconds. */
export function toUnixSeconds(value: number | Date, param: string): number {
  if (value instanceof Date) {
    ensure(!Number.isNaN(value.getTime()), param, 'is an invalid Date');
    return Math.floor(value.getTime() / 1000);
  }
  ensure(Number.isInteger(value) && value >= 0, param, 'must be Unix time in whole seconds');
  return value;
}

/** Joins a list into the comma-separated form used by several endpoints. */
export function toCommaList(value: string | readonly string[]): string {
  return typeof value === 'string' ? value : value.join(',');
}
