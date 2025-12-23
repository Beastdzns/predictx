import { MarketsResponse, SeriesResponse, EventsResponse } from './types';

const BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2';

export class KalshiAPI {
  // Fetch series based on category and tags
  static async getSeries(category?: string, tags?: string[]): Promise<SeriesResponse> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (tags && tags.length > 0) params.append('tags', tags.join(','));
    
    const response = await fetch(`${BASE_URL}/series?${params.toString()}`, {
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error('Failed to fetch series');
    return response.json();
  }

  // Fetch markets with filters
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
    
    const response = await fetch(`${BASE_URL}/markets?${searchParams.toString()}`, {
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error('Failed to fetch markets');
    return response.json();
  }

  // Fetch events with nested markets
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
    
    const response = await fetch(`${BASE_URL}/events?${searchParams.toString()}`, {
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  }

  // Main method to fetch events data based on category and tags
  static async fetchEventData(
    category: string,
    tags: string[],
    sortBy: string = 'Trending'
  ): Promise<EventsResponse> {
    // For special categories (trending, all, new), fetch events directly
    if (category === 'trending' || category === 'all' || category === 'new') {
      return this.getEvents({ 
        limit: 25,
        status: 'open',
        with_nested_markets: true
      });
    }

    // For specific categories, first fetch series, then events
    try {
      const seriesResponse = await this.getSeries(category, tags.length > 0 ? tags : undefined);
      
      if (!seriesResponse.series || seriesResponse.series.length === 0) {
        return { events: [] };
      }

      // Get first 25 series tickers
      const seriesTickers = seriesResponse.series.slice(0, 25).map(s => s.ticker);
      
      // Fetch events for each series ticker and combine
      const allEvents: EventsResponse = { events: [] };
      
      for (const ticker of seriesTickers) {
        const eventsResponse = await this.getEvents({
          series_ticker: ticker,
          limit: 25,
          status: 'open',
          with_nested_markets: true
        });
        
        allEvents.events.push(...eventsResponse.events);
        
        // Limit total events to 25
        if (allEvents.events.length >= 25) {
          allEvents.events = allEvents.events.slice(0, 25);
          break;
        }
      }
      
      return allEvents;
    } catch (error) {
      console.error('Error fetching event data:', error);
      return { events: [] };
    }
  }
}
