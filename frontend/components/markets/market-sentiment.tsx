'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface SentimentRecommendation {
  marketTitle: string;
  customStrike: string;
  recommendedSide: 'YES' | 'NO';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface MarketSentimentProps {
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  insights: string;
  recommendations: SentimentRecommendation[];
  loading?: boolean;
}

export default function MarketSentiment({
  sentiment,
  insights,
  recommendations,
  loading = false,
}: MarketSentimentProps) {
  const getSentimentConfig = () => {
    switch (sentiment) {
      case 'bullish':
        return {
          icon: TrendingUp,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          label: 'Bullish',
        };
      case 'bearish':
        return {
          icon: TrendingDown,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: 'Bearish',
        };
      case 'volatile':
        return {
          icon: Activity,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          label: 'Volatile',
        };
      default:
        return {
          icon: Minus,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          label: 'Neutral',
        };
    }
  };

  const getConfidenceDots = (confidence: string) => {
    const count = confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1;
    return (
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i <= count ? 'bg-yellow-400' : 'bg-white/20'
            }`}
          />
        ))}
      </div>
    );
  };

  const config = getSentimentConfig();
  const Icon = config.icon;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="text-yellow-400 font-semibold text-lg">Market Sentiment</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-white/40 text-sm">
            Analyzing market sentiment...
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h3 className="text-yellow-400 font-semibold text-lg">Market Sentiment</h3>

      {/* Sentiment Badge & Insights */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}
          >
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className={`text-sm font-semibold ${config.color}`}>
              {config.label}
            </span>
          </div>
        </div>

        <p className="text-white/70 text-sm leading-relaxed">{insights}</p>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-white/80 text-sm font-medium">Top Recommendations</h4>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between py-2 px-3 rounded border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white/40 text-xs">#{idx + 1}</span>
                    <span className="text-white text-sm truncate">
                      {rec.customStrike}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed">
                    {rec.reason}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-3">
                  <span
                    className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                      rec.recommendedSide === 'YES'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {rec.recommendedSide}
                  </span>
                  {getConfidenceDots(rec.confidence)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-white/30 text-xs text-center pt-2 border-t border-white/5">
        AI-powered analysis • Not financial advice
      </div>
    </motion.div>
  );
}
