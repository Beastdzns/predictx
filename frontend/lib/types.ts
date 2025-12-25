// Kalshi API Types

export interface Market {
  ticker: string;
  event_ticker: string;
  market_type: string;
  title: string;
  subtitle: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  created_time: string;
  open_time: string;
  close_time: string;
  expiration_time: string;
  status: string;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  last_price?: number;
  volume?: number;
  volume_24h?: number;
  open_interest?: any;
  category: string;
  liquidity?: number;
  strike_type?: string;
  floor_strike?: number;
  cap_strike?: number;
  custom_strike?: any;
  rules_primary?: string;
  rules_secondary?: string[];
  can_close_early?: boolean;
  early_close_condition?: string;
  expected_expiration_time?: string;
  latest_expiration_time?: string;
}

export interface Series {
  ticker: string;
  frequency: string;
  title: string;
  category: string;
  tags: string[];
  settlement_sources?: Array<{
    name: string;
    url: string;
  }>;
}

export interface Event {
  event_ticker: string;
  series_ticker: string;
  sub_title: string;
  title: string;
  category: string;
  markets?: Market[];
}

export interface MarketsResponse {
  markets: Market[];
  cursor?: string;
}

export interface SeriesResponse {
  series: Series[];
}

export interface EventsResponse {
  events: Event[];
  cursor?: string;
}

export interface MarketDetail {
  market_ticker: string;
  image_url?: string;
  color_code?: string;
}

export interface SettlementSource {
  name: string;
  url: string;
}

export interface EventMetadata {
  image_url?: string;
  market_details?: MarketDetail[];
  settlement_sources?: SettlementSource[];
  featured_image_url?: string;
  competition?: string;
  competition_scope?: string;
}

export interface PriceData {
  open: number;
  open_dollars: string;
  low: number;
  low_dollars: string;
  high: number;
  high_dollars: string;
  close: number;
  close_dollars: string;
  mean?: number;
  mean_dollars?: string;
  previous?: number;
  previous_dollars?: string;
  min?: number;
  min_dollars?: string;
  max?: number;
  max_dollars?: string;
}

export interface Candlestick {
  end_period_ts: number;
  yes_bid: PriceData;
  yes_ask: PriceData;
  price: PriceData;
  volume: number;
  open_interest: number;
}

export interface MarketCandlesticks {
  market_ticker: string;
  candlesticks: Candlestick[];
}

export interface CandlesticksResponse {
  markets: MarketCandlesticks[];
}

export interface Orderbook {
  yes: number[][];
  no: number[][];
  yes_dollars: [string, number][];
  no_dollars: [string, number][];
}

export interface OrderbookResponse {
  orderbook: Orderbook;
}

export interface Trade {
  trade_id: string;
  ticker: string;
  price: number;
  count: number;
  yes_price: number;
  no_price: number;
  yes_price_dollars: string;
  no_price_dollars: string;
  taker_side: 'yes' | 'no';
  created_time: string;
}

export interface TradesResponse {
  trades: Trade[];
  cursor?: string;
}
