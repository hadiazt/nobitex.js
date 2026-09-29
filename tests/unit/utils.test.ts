import { describe, expect, it } from 'vitest';
import { NobitexValidationError } from '../../src/index.js';
import { base64ToBytes, bytesToBase64, sleep } from '../../src/utils/encoding.js';
import {
  toCommaList,
  toDateOnly,
  toIsoDateTime,
  toMonetaryString,
  toPositiveMonetaryString,
  toUnixSeconds,
} from '../../src/utils/format.js';
import { buildQueryString, compact } from '../../src/utils/query.js';

describe('toMonetaryString', () => {
  it.each([
    ['0.015', '0.015'],
    [' 12 ', '12'],
    [520000000, '520000000'],
    [0.1, '0.1'],
    [1e-7, '0.0000001'],
    [1.5e-10, '0.00000000015'],
    [1e20, '100000000000000000000'],
  ])('%o → %s', (input, expected) => {
    expect(toMonetaryString(input, 'x')).toBe(expected);
  });

  it.each(['-1', '1e5', '1,000', 'abc', '', '.5', Infinity, -2, Number.NaN, 1e21])(
    'rejects %o',
    (input) => {
      expect(() => toMonetaryString(input, 'x')).toThrow(NobitexValidationError);
    },
  );

  it('toPositiveMonetaryString rejects zero', () => {
    expect(() => toPositiveMonetaryString('0.000', 'x')).toThrow(/greater than zero/);
    expect(toPositiveMonetaryString('0.001', 'x')).toBe('0.001');
  });
});

describe('date helpers', () => {
  it('formats dates', () => {
    const date = new Date('2022-07-22T23:30:00Z');
    expect(toDateOnly(date, 'd')).toBe('2022-07-22');
    expect(toDateOnly('2022-05-12', 'd')).toBe('2022-05-12');
    expect(toIsoDateTime(date, 'd')).toBe('2022-07-22T23:30:00.000Z');
    expect(toIsoDateTime('2018-10-01T00:00:00+00:00', 'd')).toBe('2018-10-01T00:00:00+00:00');
    expect(toUnixSeconds(date, 'd')).toBe(1658532600);
    expect(toUnixSeconds(1562230967, 'd')).toBe(1562230967);
  });

  it('rejects malformed dates', () => {
    expect(() => toDateOnly(new Date(Number.NaN), 'd')).toThrow(NobitexValidationError);
    expect(() => toUnixSeconds(new Date(Number.NaN), 'd')).toThrow(NobitexValidationError);
    expect(() => toUnixSeconds(-1, 'd')).toThrow(NobitexValidationError);
  });
});

describe('query helpers', () => {
  it('serialises in insertion order, skipping empty values', () => {
    expect(buildQueryString(undefined)).toBe('');
    expect(buildQueryString({ a: undefined })).toBe('');
    expect(buildQueryString({ b: 2, a: 'x y', c: ['r', 1], d: true })).toBe(
      '?b=2&a=x+y&c=r%2C1&d=true',
    );
  });

  it('compact removes undefined keys only', () => {
    expect(compact({ a: 1, b: undefined, c: null, d: 0 })).toEqual({ a: 1, c: null, d: 0 });
  });

  it('toCommaList joins arrays', () => {
    expect(toCommaList(['a', 'b'])).toBe('a,b');
    expect(toCommaList('a')).toBe('a');
  });
});

describe('encoding helpers', () => {
  it('round-trips base64 including URL-safe input without padding', () => {
    const bytes = new Uint8Array([251, 255, 0, 1, 2]);
    const b64 = bytesToBase64(bytes);
    expect(b64).toBe('+/8AAQI=');
    expect(base64ToBytes(b64)).toEqual(bytes);
    expect(base64ToBytes('-_8AAQI')).toEqual(bytes);
  });

  it('sleep resolves and can be aborted', async () => {
    await expect(sleep(1)).resolves.toBeUndefined();
    await expect(sleep(1, AbortSignal.abort(new Error('pre')))).rejects.toThrow('pre');
    const controller = new AbortController();
    const pending = sleep(10_000, controller.signal);
    controller.abort(new Error('mid'));
    await expect(pending).rejects.toThrow('mid');
  });
});
