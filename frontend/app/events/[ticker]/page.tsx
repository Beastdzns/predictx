'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Event, Market, EventMetadata, Trade } from '@/lib/types';
import { KalshiAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, TrendingUp, ExternalLink, DollarSign, ChevronsUpDown, Check } from 'lucide-react';
import MarketCard from '@/components/markets/market-card';
import MarketCharts from '@/components/markets/market-charts';
import MarketSentiment from '@/components/markets/market-sentiment';
import { Button } from '@/components/ui/button';
import X402ProtectedContent from '@/components/x402-protected-content';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = params.ticker as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [metadata, setMetadata] = useState<EventMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllMarkets, setShowAllMarkets] = useState(false);
  const [selectedRulesMarket, setSelectedRulesMarket] = useState<Market | null>(null);
  const [selectedTimelineMarket, setSelectedTimelineMarket] = useState<Market | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [sentimentData, setSentimentData] = useState<{ sentiment: string; insights: string; recommendations: string[] } | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  
  // x402 unlocked data state
  const [unlockedChartData, setUnlockedChartData] = useState<unknown>(null);
  const [unlockedActivityData, setUnlockedActivityData] = useState<{ trades?: Trade[] } | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);

      try {
        // First fetch the event to get the event_ticker
        const eventResponse = await KalshiAPI.getEvents({
          series_ticker: ticker,
          with_nested_markets: true,
          limit: 1
        });

        if (eventResponse.events && eventResponse.events.length > 0) {
          const fetchedEvent = eventResponse.events[0];
          setEvent(fetchedEvent);

          // Set first market as default for rules and timeline
          if (fetchedEvent.markets && fetchedEvent.markets.length > 0) {
            setSelectedRulesMarket(fetchedEvent.markets[0]);
            setSelectedTimelineMarket(fetchedEvent.markets[0]);
          }

          // Then fetch metadata using the event_ticker
          const metadataResponse = await KalshiAPI.getEventMetadata(fetchedEvent.event_ticker).catch(() => null);
          if (metadataResponse) {
            setMetadata(metadataResponse);
          }
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    if (ticker) {
      fetchEvent();
    }
  }, [ticker]);

  // Fetch recent trades for all markets
  useEffect(() => {
    const fetchRecentTrades = async () => {
      if (!event || !event.markets || event.markets.length === 0) return;
      
      setTradesLoading(true);
      try {
        const allTrades: Trade[] = [];
        
        // Fetch trades for each market (limit 5 per market)
        for (const market of event.markets) {
          try {
            const tradesResponse = await KalshiAPI.getTrades({
              ticker: market.ticker,
              limit: 5
            });
            
            if (tradesResponse.trades && tradesResponse.trades.length > 0) {
              allTrades.push(...tradesResponse.trades);
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`Failed to fetch trades for ${market.ticker}:`, err);
          }
        }
        
        // Sort by created_time (most recent first) and take top 20
        const sortedTrades = allTrades
          .sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime())
          .slice(0, 20);
        
        setRecentTrades(sortedTrades);
      } catch (err) {
        console.error('Error fetching trades:', err);
      } finally {
        setTradesLoading(false);
      }
    };
    
    fetchRecentTrades();
  }, [event]);

  // Fetch market sentiment analysis
  useEffect(() => {
    const fetchSentiment = async () => {
      if (!event || !event.markets || event.markets.length === 0) return;
      
      setSentimentLoading(true);
      try {
        const response = await fetch('/api/sentiment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: {
              title: event.title,
              category: event.category,
              sub_title: event.sub_title,
            },
            markets: event.markets,
            recentTrades: recentTrades,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSentimentData(data);
        }
      } catch (err) {
        console.error('Error fetching sentiment:', err);
      } finally {
        setSentimentLoading(false);
      }
    };

    // Only fetch sentiment after trades are fully loaded and if we don't have data yet
    if (!tradesLoading && event && event.markets && event.markets.length > 0 && !sentimentData) {
      fetchSentiment();
    }
  }, [event, tradesLoading, sentimentData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          <p className="text-white/60 text-sm">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-4">{error || 'Event not found'}</p>
          <Button
            onClick={() => router.push('/')}
            className="bg-yellow-400 text-black hover:bg-yellow-500"
          >
            Go Back Home
          </Button>
        </div>
      </div>
    );
  }

  const markets = (event.markets || []).sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const displayedMarkets = showAllMarkets ? markets : markets.slice(0, 3);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-yellow-400/20">
        <div className="px-6 py-4">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: -5 }}
            onClick={() => router.back()}
            className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-3 border-b border-white/20">
              {metadata?.image_url && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className=""
                >
                  <img
                    src={metadata.image_url}
                    alt={event.title}
                    className="object-contain w-30 h-30 rounded-lg"
                  />
                </motion.div>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                {event.title}
              </h1>
            </div>
            {event.category && (
              <span className="text-sm text-yellow-400">
                {event.category}
              </span>
            )}

            {event.sub_title && (
              <p className="text-white/60 text-sm md:text-base">
                {event.sub_title}
              </p>
            )}

            <div className="flex items-center gap-3 text-white/50 text-sm">
              <span className="flex items-center gap-1.5">
                {markets.length} {markets.length === 1 ? 'Market' : 'Markets'}
              </span>
              <span className="flex items-center gap-0.5">
                <DollarSign className="w-4 h-4" />
                {markets.reduce((total, market) => total + (market.volume || 0), 0)}
              </span>
              <span>•</span>
              <span className="font-mono">{event.series_ticker}</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Markets List */}
      <div className="px-6 py-3 space-y-4">
        {markets.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <p className="text-white/60">No markets available for this event.</p>
          </div>
        ) : (
          <>
            {/* Market Charts for Top 3 Markets - x402 gated */}
            {markets.length > 0 && (
              <X402ProtectedContent
                contentType="chart"
                contentId={ticker}
                title="Market Charts"
                message="Unlock Charts"
                blurAmount="blur-md"
                onUnlock={(data) => setUnlockedChartData(data)}
                lockedPreview={<MarketCharts markets={markets} metadata={metadata} />}
              >
                {(data) => (
                  <MarketCharts markets={markets} metadata={metadata} />
                )}
              </X402ProtectedContent>
            )}

            {/* Metadata Details */}
            {metadata && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="p-4 space-y-1"
              >
                {metadata.competition && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 text-sm">Competition:</span>
                    <span className="text-white text-sm font-semibold">{metadata.competition}</span>
                    {metadata.competition_scope && (
                      <span className="text-white/40 text-sm">({metadata.competition_scope})</span>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Market Sentiment - x402 gated with server-side data */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
            >
              <X402ProtectedContent
                contentType="sentiment"
                contentId={ticker}
                title="Market Sentiment"
                message="Unlock Sentiment"
                blurAmount="blur-md"
                lockedPreview={
                  <MarketSentiment
                    sentiment="neutral"
                    insights="AI-powered market sentiment analysis and recommendations."
                    recommendations={['Unlock to see recommendations', 'Powered by x402']}
                    loading={false}
                  />
                }
              >
                {(data) => {
                  const sentimentResult = data as { sentiment?: string; insights?: string; recommendations?: string[] };
                  return (
                    <MarketSentiment
                      sentiment={sentimentResult?.sentiment || 'neutral'}
                      insights={sentimentResult?.insights || ''}
                      recommendations={sentimentResult?.recommendations || []}
                      loading={false}
                    />
                  );
                }}
              </X402ProtectedContent>
            </motion.div>

            {/* Beginner Helper Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={() => setHelpDialogOpen(true)}
                className="w-full bg-transparent text-yellow-400"
              >
                <span className="text-lg mr-2">?</span>
                How Prediction Markets Work
              </Button>
            </motion.div>

            {/* Help Dialog */}
            <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
              <DialogContent className="bg-zinc-900 border-yellow-400/30 text-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-yellow-400 text-xl">How Prediction Markets Work</DialogTitle>
                </DialogHeader>
                <div className="text-white/70 text-sm leading-relaxed space-y-3 pt-2">
                  <p>
                    Trade shares priced 0-100¢. Each share represents the probability of an outcome.
                  </p>
                  <p>
                    <span className="text-green-400 font-semibold">YES shares</span> pay $1.00 if the outcome happens,
                    $0 if it doesn't.
                  </p>
                  <p>
                    <span className="text-red-400 font-semibold">NO shares</span> pay $1.00 if the outcome doesn't happen,
                    $0 if it does.
                  </p>
                  <p>
                    The price reflects the market's collective probability. For example, if YES shares trade at 30¢,
                    the market believes there's a 30% chance the outcome will happen.
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            <h1 className='text-yellow-400 text-xl'>Markets</h1>
            <div className="grid grid-cols-1 gap-4">
              {displayedMarkets.map((market, index) => (
                <MarketCard key={market.ticker} market={market} index={index} metadata={metadata} />
              ))}
            </div>

            {/* Show All/Show Less Button */}
            {markets.length > 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center pt-2"
              >
                <Button
                  onClick={() => setShowAllMarkets(!showAllMarkets)}
                  className="text-white"
                >
                  {showAllMarkets ? `Show Less` : `Show All ${markets.length} Markets`}
                </Button>
              </motion.div>
            )}
          </>
        )}
        {/* Rules Summary Section */}
        {markets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-4 border-b pb-4 border-white/20"
          >
            <div className="flex justify-between gap-2">
              <h3 className="text-yellow-400 font-semibold text-lg">Rules Summary</h3>

              {/* Market Selector */}
              <Popover open={rulesOpen} onOpenChange={setRulesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={rulesOpen}
                    className="w-40 justify-between text-white bg-transparent outline-none border-none"
                  >
                    {selectedRulesMarket ? (
                      <span className="truncate">
                        {selectedRulesMarket.custom_strike
                          ? String(Object.values(selectedRulesMarket.custom_strike)[0])
                          : selectedRulesMarket.subtitle || selectedRulesMarket.title}
                      </span>
                    ) : (
                      'Select market...'
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-0 bg-zinc-900 border-zinc-700">
                  <Command className="bg-zinc-900">
                    <CommandInput placeholder="Search markets..." className="text-white" />
                    <CommandList>
                      <CommandEmpty>No market found.</CommandEmpty>
                      <CommandGroup>
                        {markets.map((market) => {
                          const label = market.custom_strike
                            ? Object.values(market.custom_strike)[0]
                            : market.subtitle || market.title;

                          return (
                            <CommandItem
                              key={market.ticker}
                              value={String(label)}
                              onSelect={() => {
                                setSelectedRulesMarket(market);
                                setRulesOpen(false);
                              }}
                              className="text-white hover:bg-zinc-800"
                            >
                              <span className={cn(
                                ' text-lg',
                                selectedRulesMarket?.ticker === market.ticker
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}>•</span>
                              <span className="truncate">{String(label)}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Rules Display */}
            {selectedRulesMarket && (
              <div className="space-y-3">
                {selectedRulesMarket.rules_primary && (
                  <div className="space-y-2">
                    <h4 className="text-white font-medium text-sm">Primary Rules</h4>
                    <p className="text-white/70 text-sm leading-relaxed">
                      {selectedRulesMarket.rules_primary}
                    </p>
                  </div>
                )}

                {selectedRulesMarket.rules_secondary && Array.isArray(selectedRulesMarket.rules_secondary) && selectedRulesMarket.rules_secondary.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-white font-medium text-sm">Secondary Rules</h4>
                    <ul className="space-y-2">
                      {selectedRulesMarket.rules_secondary.map((rule, idx) => (
                        <li key={idx} className="text-white/70 text-sm leading-relaxed pl-4 border-l-2 border-yellow-400/30">
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!selectedRulesMarket.rules_primary &&
                  (!selectedRulesMarket.rules_secondary || !Array.isArray(selectedRulesMarket.rules_secondary) || selectedRulesMarket.rules_secondary.length === 0) && (
                    <p className="text-white/40 text-sm text-center py-4">
                      No rules available for this market.
                    </p>
                  )}
              </div>
            )}
            {metadata && metadata.settlement_sources && metadata.settlement_sources.length > 0 && (
              <div className="space-y-2">
                <span className="text-white/50 text-sm">Settlement Sources:</span>
                <div className="flex flex-wrap gap-2">
                  {metadata.settlement_sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 py-1 text-yellow-400 text-xs"
                    >
                      {source.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Timeline Section */}
        {markets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 border-b pb-4 border-white/20"
          >
            <div className="flex justify-between gap-2">
              <h3 className="text-yellow-400 font-semibold text-lg">Market Timeline</h3>

              {/* Market Selector for Timeline */}
              <Popover open={timelineOpen} onOpenChange={setTimelineOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={timelineOpen}
                    className="w-40 justify-between text-white bg-transparent outline-none border-none"
                  >
                    {selectedTimelineMarket ? (
                      <span className="truncate">
                        {selectedTimelineMarket.custom_strike
                          ? String(Object.values(selectedTimelineMarket.custom_strike)[0])
                          : selectedTimelineMarket.subtitle || selectedTimelineMarket.title}
                      </span>
                    ) : (
                      'Select market...'
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-0 bg-zinc-900 border-zinc-700">
                  <Command className="bg-zinc-900">
                    <CommandInput placeholder="Search markets..." className="text-white" />
                    <CommandList>
                      <CommandEmpty>No market found.</CommandEmpty>
                      <CommandGroup>
                        {markets.map((market) => {
                          const label = market.custom_strike
                            ? Object.values(market.custom_strike)[0]
                            : market.subtitle || market.title;

                          return (
                            <CommandItem
                              key={market.ticker}
                              value={String(label)}
                              onSelect={() => {
                                setSelectedTimelineMarket(market);
                                setTimelineOpen(false);
                              }}
                              className="text-white hover:bg-zinc-800"
                            >
                              <span className={cn(
                                ' text-lg',
                                selectedTimelineMarket?.ticker === market.ticker
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}>•</span>
                              <span className="truncate">{String(label)}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Timeline Display */}
            {selectedTimelineMarket && (
              <div className="relative pl-6">
                {/* Vertical Line */}
                <div className="absolute left-0 top-2 bottom-2 w-px bg-white/20"></div>

                {/* Timeline Items */}
                <div className="space-y-6">
                  {/* Open Time */}
                  <div className="relative flex items-start gap-4">
                    <div className="absolute -left-7.5 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-950"></div>
                    <div>
                      <div className="text-white/50 text-xs uppercase tracking-wide mb-1">Open Time</div>
                      <div className="text-green-400 text-sm">
                        {new Date(selectedTimelineMarket.open_time).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Expected Expiration */}
                  {selectedTimelineMarket.expected_expiration_time && (
                    <div className="relative flex items-start gap-4">
                      <div className="absolute -left-7.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-zinc-950"></div>
                      <div>
                        <div className="text-white/50 text-xs uppercase tracking-wide mb-1">Expected Expiration</div>
                        <div className="text-blue-400 text-sm">
                          {new Date(selectedTimelineMarket.expected_expiration_time).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Close Time */}
                  <div className="relative flex items-start gap-4">
                    <div className="absolute -left-7.5 w-3 h-3 rounded-full bg-red-500 border-2 border-zinc-950"></div>
                    <div>
                      <div className="text-white/50 text-xs uppercase tracking-wide mb-1">Close Time</div>
                      <div className="text-red-400 text-sm">
                        {new Date(selectedTimelineMarket.close_time).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Early Close Warning */}
                  {selectedTimelineMarket.can_close_early && (
                    <div className="relative flex items-start gap-4">
                      <div>
                        <div className="text-yellow-400 text-xs uppercase tracking-wide mb-1">⚠️ Can Close Early</div>
                        {selectedTimelineMarket.early_close_condition && (
                          <div className="text-white/60 text-sm leading-relaxed max-w-xl">
                            {selectedTimelineMarket.early_close_condition}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Activity Section - x402 gated */}
        {markets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="space-y-4"
          >
            <X402ProtectedContent
              contentType="activity"
              contentId={ticker}
              title="Recent Activity"
              message="Unlock Activity"
              blurAmount="blur-md"
              onUnlock={(data) => setUnlockedActivityData(data as { trades?: Trade[] })}
              lockedPreview={
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-white/5"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                            yes
                          </span>
                          <span className="text-white/70 text-xs">Sample Trade</span>
                        </div>
                        <div className="text-white/40 text-xs">Loading...</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium text-sm">-- @ --¢</div>
                      </div>
                    </div>
                  ))}
                </div>
              }
            >
              {(data) => {
                const activityData = data as { trades?: Trade[] };
                const trades = activityData?.trades || recentTrades;
                
                if (trades.length === 0) {
                  return (
                    <p className="text-white/40 text-sm text-center py-8">
                      No recent trades available.
                    </p>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {trades.slice(0, 20).map((trade) => {
                      const market = markets.find(m => m.ticker === trade.ticker);
                      const marketLabel = market?.custom_strike
                        ? Object.values(market.custom_strike)[0]
                        : market?.subtitle || market?.title || trade.ticker;
                      
                      return (
                        <div
                          key={trade.trade_id}
                          className="flex items-center justify-between py-2 border-b border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                                  trade.taker_side === 'yes'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {trade.taker_side}
                              </span>
                              <span className="text-white/70 text-xs truncate">
                                {String(marketLabel)}
                              </span>
                            </div>
                            <div className="text-white/40 text-xs">
                              {new Date(trade.created_time).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium text-sm">
                              {trade.count} @ {trade.price}¢
                            </div>
                            <div className="text-white/50 text-xs">
                              ${(trade.count * trade.price / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            </X402ProtectedContent>
          </motion.div>
        )}
      </div>
    </div>
  );
}
