import { NobitexClient, type FetchLike, type NobitexClientOptions } from '../../src/index.js';

/** A request captured by {@link createMockFetch}. */
export interface RecordedRequest {
  url: URL;
  method: string;
  headers: Record<string, string>;
  /** Parsed JSON body, or `undefined` when there is none. */
  body: unknown;
  rawBody: string | undefined;
  signal: AbortSignal | undefined;
}

export type Responder = (request: RecordedRequest) => Response | Promise<Response>;

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/** Creates a `fetch` mock that records every request and answers with `responder`. */
export function createMockFetch(responder: Responder = () => jsonResponse({ status: 'ok' })): {
  fetch: FetchLike;
  requests: RecordedRequest[];
  last: () => RecordedRequest;
} {
  const requests: RecordedRequest[] = [];
  const fetch: FetchLike = async (input, init) => {
    const headers: Record<string, string> = {};
    new Headers(init.headers).forEach((value, key) => {
      headers[key] = value;
    });
    const rawBody = typeof init.body === 'string' ? init.body : undefined;
    const request: RecordedRequest = {
      url: new URL(input),
      method: init.method ?? 'GET',
      headers,
      body: rawBody === undefined ? undefined : (JSON.parse(rawBody) as unknown),
      rawBody,
      signal: init.signal ?? undefined,
    };
    requests.push(request);
    return responder(request);
  };
  return {
    fetch,
    requests,
    last: () => {
      const request = requests.at(-1);
      if (!request) throw new Error('no request recorded');
      return request;
    },
  };
}

/** A client wired to a mock fetch, with retries disabled unless overridden. */
export function createTestClient(
  options: NobitexClientOptions = {},
  responder?: Responder,
): { client: NobitexClient } & ReturnType<typeof createMockFetch> {
  const mock = createMockFetch(responder);
  const client = new NobitexClient({ retry: false, ...options, fetch: mock.fetch });
  return { client, ...mock };
}

/** Query parameters of a recorded request as a plain object. */
export function queryOf(request: RecordedRequest): Record<string, string> {
  return Object.fromEntries(request.url.searchParams.entries());
}
