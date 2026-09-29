import { Resource, type RequestOptions } from '../core/http-client.js';
import type { DailyProfitResponse, TotalProfitResponse } from '../types/index.js';

/** Profit & loss reports (beta). Rate limit: 10 per 3 min for each endpoint. */
export class PortfolioResource extends Resource {
  /**
   * Daily P&L for the last 7 days, or the last 30 with `monthly: true`
   * (`POST /users/portfolio/last-week-daily-profit`).
   */
  getDailyProfit(
    params: { monthly?: boolean } = {},
    options?: RequestOptions,
  ): Promise<DailyProfitResponse> {
    return this.request(
      {
        method: 'POST',
        path: '/users/portfolio/last-week-daily-profit',
        ...(params.monthly !== undefined && { body: { monthly: params.monthly } }),
        idempotent: true,
      },
      options,
    );
  }

  /** Cumulative daily P&L over the last week (`POST /users/portfolio/last-week-daily-total-profit`). */
  getDailyTotalProfit(options?: RequestOptions): Promise<DailyProfitResponse> {
    return this.request(
      {
        method: 'POST',
        path: '/users/portfolio/last-week-daily-total-profit',
        idempotent: true,
      },
      options,
    );
  }

  /** Total P&L of the last month (`POST /users/portfolio/last-month-total-profit`). */
  getMonthlyTotalProfit(options?: RequestOptions): Promise<TotalProfitResponse> {
    return this.request(
      { method: 'POST', path: '/users/portfolio/last-month-total-profit', idempotent: true },
      options,
    );
  }
}
