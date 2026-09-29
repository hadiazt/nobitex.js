import { NobitexValidationError } from '../errors/index.js';

/** Characters allowed in values interpolated into URL paths (symbols, ids, codes). */
const PATH_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Throws a {@link NobitexValidationError} when `condition` is false. */
export function ensure(condition: boolean, param: string, message: string): asserts condition {
  if (!condition) throw new NobitexValidationError(param, message);
}

/** Asserts a non-empty string (after trimming). */
export function assertNonEmptyString(value: unknown, param: string): asserts value is string {
  ensure(typeof value === 'string' && value.trim().length > 0, param, 'must be a non-empty string');
}

/**
 * Asserts a value that is safe to interpolate into a URL path segment (market symbols,
 * withdraw ids such as `CW430542`, …). Guards against path traversal/injection.
 */
export function assertPathSegment(value: unknown, param: string): asserts value is string {
  assertNonEmptyString(value, param);
  ensure(PATH_SEGMENT_PATTERN.test(value), param, 'may only contain letters, digits, "_" and "-"');
}

/** Asserts a positive safe integer (ids). */
export function assertPositiveInteger(value: unknown, param: string): asserts value is number {
  ensure(
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0,
    param,
    'must be a positive integer',
  );
}

/** Asserts an integer within `[min, max]`. */
export function assertIntegerInRange(
  value: unknown,
  param: string,
  min: number,
  max: number,
): asserts value is number {
  ensure(
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max,
    param,
    `must be an integer between ${min} and ${max}`,
  );
}

/** Asserts that `value` is one of `allowed`. */
export function assertOneOf<T extends string>(
  value: unknown,
  param: string,
  allowed: readonly T[],
): asserts value is T {
  ensure(
    typeof value === 'string' && (allowed as readonly string[]).includes(value),
    param,
    `must be one of ${allowed.map((v) => `"${v}"`).join(', ')}`,
  );
}

/** Validates optional `page` / `pageSize` values (1–100 per the API). */
export function assertPagination(params: { page?: number; pageSize?: number }): void {
  if (params.page !== undefined) {
    ensure(Number.isInteger(params.page) && params.page >= 1, 'page', 'must be a positive integer');
  }
  if (params.pageSize !== undefined) assertIntegerInRange(params.pageSize, 'pageSize', 1, 100);
}
