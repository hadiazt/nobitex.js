/** Scalar values accepted in query strings. `undefined`/`null` entries are omitted. */
export type QueryValue =
  string | number | boolean | readonly (string | number)[] | null | undefined;

/** Query-string parameters. */
export type QueryParams = Readonly<Record<string, QueryValue>>;

/**
 * Serialises query parameters in insertion order. Arrays are comma-joined (the convention used
 * by Nobitex, e.g. `currencies=rls,btc`). Returns an empty string or a string starting with `?`.
 */
export function buildQueryString(params: QueryParams | undefined): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.append(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Removes `undefined` properties so they are not serialised into request bodies. */
export function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}
