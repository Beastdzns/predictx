import { MarketsResponse, SeriesResponse, EventsResponse, EventMetadata } from './types';

const BASE_URL = '/api/kalshi';

export class KalshiAPI {
  static async getSeries(category?: string, tags?: string[]): Promise<SeriesResponse> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (tags && tags.length > 0) params.append('tags', tags.join(','));
    const response = await fetch(`${BASE_URL}/series?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error('Failed to fetch series');
    return response.json();
  }

  static async getMarkets(params: {
    limit?: number;
    series_ticker?: string;
    status?: string;
    cursor?: string;
  }): Promise<MarketsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('limit', (params.limit || 25).toString());
    if (params.series_ticker) searchParams.append('series_ticker', params.series_ticker);
    if (params.status) searchParams.append('status', params.status);
    if (params.cursor) searchParams.append('cursor', params.cursor);
    const response = await fetch(`${BASE_URL}/markets?${searchParams.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error('Failed to fetch markets');
    return response.json();
  }

  static async getEvents(params: {
    limit?: number;
    series_ticker?: string;
    status?: string;
    with_nested_markets?: boolean;
    cursor?: string;
  }): Promise<EventsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('limit', (params.limit || 25).toString());
    if (params.series_ticker) searchParams.append('series_ticker', params.series_ticker);
    if (params.status) searchParams.append('status', params.status);
    if (params.with_nested_markets) searchParams.append('with_nested_markets', 'true');
    if (params.cursor) searchParams.append('cursor', params.cursor);
    const response = await fetch(`${BASE_URL}/events?${searchParams.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  }

  static async fetchEventData(
    category: string,
    tags: string[],
    sortBy: string = 'Trending'
  ): Promise<EventsResponse> {
    if (category === 'trending' || category === 'all' || category === 'new') {
      return this.getEvents({ limit: 100, status: 'open', with_nested_markets: true });
    }

    try {
      const seriesResponse = await this.getSeries(category, tags.length > 0 ? tags : undefined);
      if (!seriesResponse.series || seriesResponse.series.length === 0) {
        return { events: [] };
      }
      const seriesTickers = seriesResponse.series.slice(0, 20).map(s => s.ticker);
      const allEvents: EventsResponse = { events: [] };
      for (const ticker of seriesTickers) {
        const eventsResponse = await this.getEvents({
          series_ticker: ticker, limit: 100, status: 'open', with_nested_markets: true,
        });
        allEvents.events.push(...eventsResponse.events);
        if (allEvents.events.length >= 100) {
          allEvents.events = allEvents.events.slice(0, 100);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      return allEvents;
    } catch (error) {
      console.error('Error fetching event data:', error);
      return { events: [] };
    }
  }

  static async getEventMetadata(eventTicker: string): Promise<EventMetadata | null> {
    try {
      const response = await fetch(`${BASE_URL}/events/${eventTicker}/metadata`, { cache: "no-store" });
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.warn(`Failed to fetch metadata for ${eventTicker}:`, error);
      return null;
    }
  }

  static async getCandlesticks(params: {
    market_tickers: string[];
    start_ts: number;
    end_ts: number;
    period_interval: number;
    include_latest_before_start?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append('market_tickers', params.market_tickers.join(','));
    searchParams.append('start_ts', params.start_ts.toString());
    searchParams.append('end_ts', params.end_ts.toString());
    searchParams.append('period_interval', params.period_interval.toString());
    if (params.include_latest_before_start !== undefined) {
      searchParams.append('include_latest_before_start', params.include_latest_before_start.toString());
    }
    const response = await fetch(`${BASE_URL}/markets/candlesticks?${searchParams.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error('Failed to fetch candlesticks');
    return response.json();
  }

  static async getOrderbook(ticker: string, depth?: number) {
    const searchParams = new URLSearchParams();
    if (depth !== undefined) searchParams.append('depth', depth.toString());
    const response = await fetch(`${BASE_URL}/markets/${ticker}/orderbook?${searchParams.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error('Failed to fetch orderbook');
    return response.json();
  }

  static async getTrades(params: {
    limit?: number;
    ticker?: string;
    min_ts?: number;
    max_ts?: number;
    cursor?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params.ticker) searchParams.append('ticker', params.ticker);
    if (params.min_ts !== undefined) searchParams.append('min_ts', params.min_ts.toString());
    if (params.max_ts !== undefined) searchParams.append('max_ts', params.max_ts.toString());
    if (params.cursor) searchParams.append('cursor', params.cursor);
    const response = await fetch(`${BASE_URL}/markets/trades?${searchParams.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error('Failed to fetch trades');
    return response.json();
  }
}
