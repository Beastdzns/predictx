'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Market, EventMetadata, Trade } from '@/lib/types';
import { KalshiAPI } from '@/lib/api';
import SingleMarketChart from './single-market-chart';
import TradeInfoBox from './trade-info-box';
import OrderbookYes from './orderbook-yes';
import OrderbookNo from './orderbook-no';
import { Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccessControlStore } from '@/lib/store-access';
import ProtectedContent from '@/components/protected-content';

interface MarketDetailDialogProps {
  market: Market | null;
  metadata: EventMetadata | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSide?: 'yes' | 'no';
}

export default function MarketDetailDialog({
  market,
  metadata,
  open,
  onOpenChange,
  initialSide = 'yes',
}: MarketDetailDialogProps) {
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>(initialSide);
  const [activeView, setActiveView] = useState<'chart' | 'orderbook'>('chart');
  const [orderbook, setOrderbook] = useState<any>(null);
  const [orderbookLoading, setOrderbookLoading] = useState(false);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);

  // Access control - market-specific
  const marketTicker = market?.ticker || '';
  const hasTradeCalculatorAccess = useAccessControlStore((state) => state.hasTradeCalculatorAccess(marketTicker));
  const hasOrderbookAccess = useAccessControlStore((state) => state.hasOrderbookAccess(marketTicker));
  const hasChartAccess = useAccessControlStore((state) => state.hasChartAccess(marketTicker));
  const hasActivityAccess = useAccessControlStore((state) => state.hasActivityAccess(marketTicker));
  const requestTradeCalculatorAccess = () => useAccessControlStore.getState().requestTradeCalculatorAccess(marketTicker);
  const requestOrderbookAccess = () => useAccessControlStore.getState().requestOrderbookAccess(marketTicker);
  const requestChartAccess = () => useAccessControlStore.getState().requestChartAccess(marketTicker);
  const requestActivityAccess = () => useAccessControlStore.getState().requestActivityAccess(marketTicker);

  useEffect(() => {
    setSelectedSide(initialSide);
  }, [initialSide]);

  // Fetch orderbook and trades when dialog opens
  useEffect(() => {
    if (!open || !market) return;

    const fetchData = async () => {
      // Fetch orderbook
      setOrderbookLoading(true);
      try {
        const orderbookData = await KalshiAPI.getOrderbook(market.ticker, 50);
        setOrderbook(orderbookData.orderbook);
      } catch (err) {
        console.error('Failed to fetch orderbook:', err);
      } finally {
        setOrderbookLoading(false);
      }

      // Fetch trades
      setTradesLoading(true);
      try {
        const tradesData = await KalshiAPI.getTrades({
          ticker: market.ticker,
          limit: 15,
        });
        setRecentTrades(tradesData.trades || []);
      } catch (err) {
        console.error('Failed to fetch trades:', err);
      } finally {
        setTradesLoading(false);
      }
    };

    fetchData();
  }, [open, market]);

  if (!market) return null;

  const yesPrice = market.yes_bid !== undefined ? market.yes_bid : market.last_price || 50;
  const noPrice = 100 - yesPrice;

  const marketImage = metadata?.market_details?.find(
    (detail) => detail.market_ticker === market.ticker
  )?.image_url;

  // Get custom strike or subtitle
  const displaySubtitle = market.custom_strike 
    ? String(Object.values(market.custom_strike)[0])
    : market.subtitle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-yellow-400/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {marketImage && (
              <img
                src={marketImage}
                alt={market.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <DialogTitle className="text-yellow-400 text-xl mb-2">
                {market.title}
              </DialogTitle>
              {displaySubtitle && (
                <p className="text-white/60 text-sm">{displaySubtitle}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* YES/NO Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedSide('yes')}
              className={`py-4 px-6 rounded-lg border-2 transition-all ${
                selectedSide === 'yes'
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : 'bg-green-500/5 border-green-500/30 text-green-400/60 hover:border-green-500/50'
              }`}
            >
              <div className="text-xs font-semibold uppercase mb-1">YES</div>
              <div className="text-2xl font-bold">{yesPrice}%</div>
              <div className="text-xs opacity-60">{yesPrice}¢ per share</div>
            </button>

            <button
              onClick={() => setSelectedSide('no')}
              className={`py-4 px-6 rounded-lg border-2 transition-all ${
                selectedSide === 'no'
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : 'bg-red-500/5 border-red-500/30 text-red-400/60 hover:border-red-500/50'
              }`}
            >
              <div className="text-xs font-semibold uppercase mb-1">NO</div>
              <div className="text-2xl font-bold">{noPrice}%</div>
              <div className="text-xs opacity-60">{noPrice}¢ per share</div>
            </button>
          </div>

          {/* Trade Info Box */}
          <ProtectedContent
            isUnlocked={hasTradeCalculatorAccess}
            onUnlock={() => requestTradeCalculatorAccess()}
            blurAmount="blur-md"
            message="Unlock Calculator"
            title="Trade Calculator"
          >
            <TradeInfoBox
              side={selectedSide}
              price={selectedSide === 'yes' ? yesPrice : noPrice}
              marketTitle={market.title}
            />
          </ProtectedContent>

          {/* Chart/Orderbook Toggle */}
          <div className="flex gap-2 border-b border-white/10">
            <button
              onClick={() => setActiveView('chart')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeView === 'chart'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setActiveView('orderbook')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeView === 'orderbook'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Orderbook
            </button>
          </div>

          {/* Chart or Orderbook View */}
          <AnimatePresence mode="wait">
            {activeView === 'chart' ? (
              <motion.div
                key="chart"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ProtectedContent
                  isUnlocked={hasChartAccess}
                  onUnlock={() => requestChartAccess()}
                  blurAmount="blur-md"
                  message="Unlock Chart"
                  title="Price Chart"
                >
                  <SingleMarketChart market={market} />
                </ProtectedContent>
              </motion.div>
            ) : (
              <motion.div
                key="orderbook"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ProtectedContent
                  isUnlocked={hasOrderbookAccess}
                  onUnlock={() => requestOrderbookAccess()}
                  blurAmount="blur-md"
                  message="Unlock Orderbook"
                  title="Order Book"
                >
                  {orderbookLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                    </div>
                  ) : orderbook ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-green-400 text-sm font-semibold mb-2">YES Orderbook</h4>
                        <OrderbookYes yesOrders={orderbook.yes} noOrders={orderbook.no} />
                      </div>
                      <div>
                        <h4 className="text-red-400 text-sm font-semibold mb-2">NO Orderbook</h4>
                        <OrderbookNo noOrders={orderbook.no} yesOrders={orderbook.yes} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/40 text-center py-8">No orderbook data available</p>
                  )}
                </ProtectedContent>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rules Section */}
          {(market.rules_primary || (market.rules_secondary && market.rules_secondary.length > 0)) && (
            <div className="space-y-3 border-t border-white/10 pt-4">
              <h3 className="text-yellow-400 font-semibold">Rules</h3>
              {market.rules_primary && (
                <div className="space-y-2">
                  <h4 className="text-white text-sm font-medium">Primary Rules</h4>
                  <p className="text-white/70 text-sm leading-relaxed">{market.rules_primary}</p>
                </div>
              )}
              {market.rules_secondary && Array.isArray(market.rules_secondary) && market.rules_secondary.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-white text-sm font-medium">Secondary Rules</h4>
                  <ul className="space-y-2">
                    {market.rules_secondary.map((rule, idx) => (
                      <li
                        key={idx}
                        className="text-white/70 text-sm leading-relaxed pl-4 border-l-2 border-yellow-400/30"
                      >
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recent Activity */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <ProtectedContent
              isUnlocked={hasActivityAccess}
              onUnlock={() => requestActivityAccess()}
              blurAmount="blur-md"
              message="Unlock Activity"
              title="Recent Activity"
            >
              {tradesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                </div>
              ) : recentTrades.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-6">No recent trades</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentTrades.map((trade) => (
                    <div
                      key={trade.trade_id}
                      className="flex items-center justify-between py-2 border-b border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                            trade.taker_side === 'yes'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {trade.taker_side}
                        </span>
                        <span className="text-white/40 text-xs">
                          {new Date(trade.created_time).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-mono text-sm">
                          {trade.count} @ {trade.price}¢
                        </div>
                        <div className="text-white/50 text-xs">
                          ${((trade.count * trade.price) / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ProtectedContent>
          </div>

          {/* Market Metadata */}
          <div className="space-y-2 border-t border-white/10 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/50">Status:</span>
                <span className="text-white ml-2">{market.status}</span>
              </div>
              <div>
                <span className="text-white/50">Volume:</span>
                <span className="text-white ml-2">{market.volume?.toLocaleString() || 'N/A'}</span>
              </div>
              <div>
                <span className="text-white/50">Ticker:</span>
                <span className="text-white ml-2 font-mono text-xs">{market.ticker}</span>
              </div>
              {market.liquidity && (
                <div>
                  <span className="text-white/50">Liquidity:</span>
                  <span className="text-white ml-2">{market.liquidity.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
