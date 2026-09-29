import { Resource, type RequestOptions } from '../core/http-client.js';
import type { SystemOptionsResponse } from '../types/index.js';

/** System-wide configuration. No credentials required. */
export class SystemResource extends Resource {
  /**
   * Active currencies, networks, withdraw fees and limits, minimum order sizes and price/amount
   * precisions per market (`GET /v2/options`). Cache the result — it changes rarely.
   */
  getOptions(options?: RequestOptions): Promise<SystemOptionsResponse> {
    return this.request({ method: 'GET', path: '/v2/options', auth: 'none' }, options);
  }
}
