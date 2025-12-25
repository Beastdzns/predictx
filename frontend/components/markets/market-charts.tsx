'use client';

import { Market, MarketCandlesticks, EventMetadata } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Dot } from 'recharts';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { KalshiAPI } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useChartStore } from '@/lib/store';

interface MarketChartsProps {
  markets: Market[];
  metadata: EventMetadata | null;
}

const intervalOptions = [
  { label: '1h', value: 60 },
  { label: '4h', value: 240 },
  { label: '1d', value: 1440 },
  { label: '1w', value: 10080 },
];

// Custom blinking dot component
const BlinkingDot = (props: any) => {
  const { cx, cy, fill } = props;
  return (
    <circle cx={cx} cy={cy} r={5} fill={fill}>
      <animate
        attributeName="opacity"
        values="1;0.2;1"
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
  );
};

export default function MarketCharts({ markets, metadata }: MarketChartsProps) {
  const { chartInterval, setChartInterval } = useChartStore();
  const [chartData, setChartData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const topMarkets = markets.slice(0, 3);

  useEffect(() => {
    const fetchChartData = async () => {
      if (topMarkets.length === 0) return;

      setLoading(true);
      try {
        const tickers = topMarkets.map(m => m.ticker);
        
        // Calculate max candlesticks per market to stay under 10,000 total limit
        const maxCandlesticksPerMarket = Math.floor(10000 / tickers.length);
        
        // Calculate lookback period based on interval to not exceed limit
        const maxMinutesLookback = maxCandlesticksPerMarket * chartInterval;
        const maxSecondsLookback = maxMinutesLookback * 60;
        
        const endTs = Math.floor(Date.now() / 1000);
        const calculatedStartTs = endTs - maxSecondsLookback;
        
        // Get the earliest open time from the top 3 markets
        const openTimes = topMarkets.map(m => new Date(m.open_time).getTime() / 1000);
        const marketOpenTs = Math.min(...openTimes);
        
        // Use the later of the two: calculated start or market open
        const startTs = Math.max(calculatedStartTs, marketOpenTs);

        const response = await KalshiAPI.getCandlesticks({
          market_tickers: tickers,
          start_ts: startTs,
          end_ts: endTs,
          period_interval: chartInterval,
          include_latest_before_start: true,
        });

        // Transform data for combined chart
        // Create a map of timestamps to combine all markets
        const timestampMap = new Map<number, any>();
        
        response.markets?.forEach((marketData: MarketCandlesticks) => {
          marketData.candlesticks.forEach(candle => {
            const ts = candle.end_period_ts * 1000;
            if (!timestampMap.has(ts)) {
              timestampMap.set(ts, {
                timestamp: ts,
                date: new Date(ts).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: chartInterval < 1440 ? '2-digit' : undefined,
                }),
              });
            }
            const dataPoint = timestampMap.get(ts);
            dataPoint[marketData.market_ticker] = candle.price.close || candle.price.previous || 0;
          });
        });

        // Convert map to array and sort by timestamp
        const combinedData = Array.from(timestampMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        
        setChartData({ combined: combinedData });
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [chartInterval, markets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
      </div>
    );
  }

  if (topMarkets.length === 0) return null;

  const data = chartData.combined || [];
  const colors = ['#FACC15', '#22C55E', '#3B82F6', '#EF4444', '#A855F7'];

  // Get the latest price for each market
  const getLatestPrice = (ticker: string) => {
    if (data.length === 0) return 0;
    const latestData = data[data.length - 1];
    return latestData[ticker] || 0;
  };

  // Get market labels with strike info
  const getMarketLabel = (market: Market) => {
    if (market.custom_strike) {
      // custom_strike is an object with key-value pairs, extract the value
      const value = Object.values(market.custom_strike)[0];
      return `${value}`;
    }
    if (market.strike_type && market.floor_strike !== undefined) {
      return `${market.floor_strike}${market.cap_strike !== undefined ? `-${market.cap_strike}` : '+'}`;
    }
    return market.subtitle || market.title;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="space-y-4 -mx-5"
    >
      {/* Interval Toggle */}
      <div className="flex items-center justify-between px-6">
        <h3 className="text-white font-semibold text-sm">Market Trends</h3>
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
          {intervalOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setChartInterval(option.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                chartInterval === option.value
                  ? 'bg-yellow-400 text-black'
                  : 'text-white/60 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Legend Above Chart */}
      <div className="flex flex-wrap gap-4 px-6">
        {topMarkets.map((market, idx) => {
          const marketDetail = metadata?.market_details?.find(
            detail => detail.market_ticker === market.ticker
          );
          const color = marketDetail?.color_code || colors[idx % colors.length];
          const label = getMarketLabel(market);
          const price = getLatestPrice(market.ticker);
          
          return (
            <div key={market.ticker} className="flex items-center gap-2">
              <div 
                className="w-1 h-1 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-white/60 text-xs">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Combined Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className=""
      >
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickLine={{ stroke: '#27272a' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#fbbf24', marginBottom: '4px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: any, name?: string) => {
                if (!name) return [value, name];
                const market = topMarkets.find(m => m.ticker === name);
                if (!market) return [value, name];
                const label = getMarketLabel(market);
                return [`${value}%`, label];
              }}
            />
            {topMarkets.map((market, idx) => {
              const marketDetail = metadata?.market_details?.find(
                detail => detail.market_ticker === market.ticker
              );
              const color = marketDetail?.color_code || colors[idx % colors.length];
              
              return (
                <Line
                  key={market.ticker}
                  type="linear"
                  dataKey={market.ticker}
                  name={market.ticker}
                  stroke={color}
                  strokeWidth={2}
                  dot={(props: any) => {
                    // Only show blinking dot at the last point
                    const isLastPoint = props.index === data.length - 1;
                    if (isLastPoint && props.payload[market.ticker]) {
                      return <BlinkingDot {...props} fill={color} />;
                    }
                    return null;
                  }}
                  activeDot={{ r: 4, fill: color }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}
