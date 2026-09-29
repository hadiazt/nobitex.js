import type * as CentrifugeModule from 'centrifuge';
import type { Centrifuge, Options as CentrifugeOptions } from 'centrifuge';
import type { NobitexClient } from '../client.js';
import { WEBSOCKET_URL } from '../constants.js';
import { NobitexAuthenticationError, NobitexPermissionError } from '../errors/index.js';
import { assertNonEmptyString } from '../utils/validation.js';
import type { ChannelPayload } from './types.js';

export { channels } from './channels.js';
export type * from './types.js';

/** Options for {@link NobitexWebSocket.create}. */
export interface NobitexWebSocketOptions {
  /** WebSocket endpoint (default `wss://ws.nobitex.ir/connection/websocket`). */
  url?: string | undefined;
  /**
   * Authenticated REST client used to fetch (and refresh) the connection JWT for private
   * channels via `client.auth.getWebSocketToken()`.
   */
  client?: NobitexClient | undefined;
  /** Custom token provider; takes precedence over `client`. */
  getToken?: (() => Promise<string>) | undefined;
  /**
   * Subscribe with fossil delta compression (default `true`), which cuts bandwidth by ~60%.
   * Decoding is handled transparently by `centrifuge`.
   */
  delta?: boolean | undefined;
  /** Extra options passed to the `Centrifuge` constructor (e.g. `websocket` for old runtimes). */
  centrifuge?: Partial<CentrifugeOptions> | undefined;
}

/** Listener for publications on a channel. */
export type ChannelHandler<C extends string> = (data: ChannelPayload<C>) => void;

/**
 * Real-time market and account data over Nobitex's Centrifugo WebSocket.
 *
 * Requires the optional peer dependency `centrifuge` (`npm i centrifuge`). Runtimes without a
 * global `WebSocket` (Node.js < 22) must pass one via `centrifuge: { websocket: WebSocket }`.
 *
 * @example
 * import { NobitexWebSocket, channels } from 'nobitex.js/websocket';
 *
 * const ws = await NobitexWebSocket.create();
 * const unsubscribe = ws.subscribe(channels.orderBook('BTCIRT'), (book) => {
 *   console.log(book.bids[0], book.asks[0]);
 * });
 * ws.connect();
 */
export class NobitexWebSocket {
  /** Underlying `centrifuge` client for advanced use. */
  readonly raw: Centrifuge;
  readonly #delta: boolean;

  /** Wraps an existing `Centrifuge` instance. Prefer {@link NobitexWebSocket.create}. */
  constructor(centrifuge: Centrifuge, options: { delta?: boolean | undefined } = {}) {
    this.raw = centrifuge;
    this.#delta = options.delta ?? true;
  }

  /** Loads `centrifuge` and creates a (not yet connected) WebSocket client. */
  static async create(options: NobitexWebSocketOptions = {}): Promise<NobitexWebSocket> {
    let mod: typeof CentrifugeModule;
    try {
      mod = await import('centrifuge');
    } catch (error) {
      throw new Error(
        'nobitex.js/websocket requires the "centrifuge" package. Install it with `npm i centrifuge`.',
        { cause: error },
      );
    }

    const tokenProvider = options.getToken ?? createClientTokenProvider(options.client);
    const getToken = tokenProvider
      ? async (): Promise<string> => {
          try {
            return await tokenProvider();
          } catch (error) {
            // Tell centrifuge to stop refreshing instead of retrying forever.
            if (
              error instanceof NobitexAuthenticationError ||
              error instanceof NobitexPermissionError
            ) {
              throw new mod.UnauthorizedError(error.message);
            }
            throw error;
          }
        }
      : undefined;

    const centrifuge = new mod.Centrifuge(options.url ?? WEBSOCKET_URL, {
      ...(getToken && { getToken }),
      ...options.centrifuge,
    });
    return new NobitexWebSocket(centrifuge, { delta: options.delta });
  }

  /** Opens the connection (reconnects automatically). */
  connect(): void {
    this.raw.connect();
  }

  /** Closes the connection. */
  disconnect(): void {
    this.raw.disconnect();
  }

  /** Resolves once connected. */
  async ready(timeoutMs?: number): Promise<void> {
    await this.raw.ready(timeoutMs);
  }

  /**
   * Subscribes to a channel with a payload type inferred from its name. Re-subscribing to the
   * same channel adds another handler to the existing subscription.
   *
   * @returns A function that removes this handler (and the subscription when it was the last one).
   */
  subscribe<C extends string>(channel: C, handler: ChannelHandler<C>): () => void {
    assertNonEmptyString(channel, 'channel');
    const existing = this.raw.getSubscription(channel);
    const subscription =
      existing ?? this.raw.newSubscription(channel, this.#delta ? { delta: 'fossil' } : {});

    const listener = (ctx: { data: unknown }): void => {
      handler(parsePayload(ctx.data) as ChannelPayload<C>);
    };
    subscription.on('publication', listener);
    if (!existing) subscription.subscribe();

    return () => {
      subscription.removeListener('publication', listener);
      if (subscription.listeners('publication').length === 0) {
        subscription.unsubscribe();
        this.raw.removeSubscription(subscription);
      }
    };
  }
}

function createClientTokenProvider(
  client: NobitexClient | undefined,
): (() => Promise<string>) | undefined {
  if (!client) return undefined;
  return async () => (await client.auth.getWebSocketToken()).token;
}

/** The raw protocol delivers JSON strings; `centrifuge` usually decodes them already. */
function parsePayload(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}
