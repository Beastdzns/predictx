'use client';

import { Market } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { KalshiAPI } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useChartStore } from '@/lib/store';

interface SingleMarketChartProps {
  market: Market;
}

// Custom blinking dot component
const BlinkingDot = (props: any) => {
  const { cx, cy } = props;
  return (
    <circle cx={cx} cy={cy} r={4} fill="#FACC15">
      <animate
        attributeName="opacity"
        values="1;0.2;1"
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
  );
};

export default function SingleMarketChart({ market }: SingleMarketChartProps) {
  const { chartInterval } = useChartStore();
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      try {
        // Calculate time range
        const maxCandlesticks = 500;
        const maxMinutesLookback = maxCandlesticks * chartInterval;
        const maxSecondsLookback = maxMinutesLookback * 60;
        
        const endTs = Math.floor(Date.now() / 1000);
        const calculatedStartTs = endTs - maxSecondsLookback;
        const marketOpenTs = Math.floor(new Date(market.open_time).getTime() / 1000);
        const startTs = Math.max(calculatedStartTs, marketOpenTs);

        const response = await KalshiAPI.getCandlesticks({
          market_tickers: [market.ticker],
          start_ts: startTs,
          end_ts: endTs,
          period_interval: chartInterval,
          include_latest_before_start: true,
        });

        if (response.markets && response.markets.length > 0) {
          const data = response.markets[0].candlesticks.map((candle: any) => ({
            timestamp: candle.end_period_ts * 1000,
            date: new Date(candle.end_period_ts * 1000).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: chartInterval < 1440 ? '2-digit' : undefined,
            }),
            price: candle.price.close || candle.price.previous || 0,
          }));
          setChartData(data);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [market.ticker, chartInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          tick={{ fill: '#a1a1aa', fontSize: 10 }}
          tickLine={{ stroke: '#27272a' }}
        />
        <YAxis
          stroke="#71717a"
          tick={{ fill: '#a1a1aa', fontSize: 10 }}
          tickLine={{ stroke: '#27272a' }}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(24, 24, 27, 0.95)',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            fontSize: '11px',
          }}
          labelStyle={{ color: '#fbbf24' }}
          itemStyle={{ color: '#fff' }}
          formatter={(value: any) => [`${value}%`, 'Probability']}
        />
        <Line
          type="linear"
          dataKey="price"
          stroke="#FACC15"
          strokeWidth={2}
          dot={(props: any) => {
            // Only show blinking dot at the last point
            const isLastPoint = props.index === chartData.length - 1;
            if (isLastPoint && props.payload.price) {
              return <BlinkingDot {...props} />;
            }
            return null;
          }}
          activeDot={{ r: 3, fill: '#FACC15' }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
