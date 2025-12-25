'use client';

import { Market, EventMetadata, OrderbookResponse } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Clock, Users, ReceiptIcon, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { KalshiAPI } from '@/lib/api';
import SingleMarketChart from './single-market-chart';
import OrderbookYes from './orderbook-yes';
import OrderbookNo from './orderbook-no';
import MarketDetailDialog from './market-detail-dialog';

interface MarketCardProps {
    market: Market;
    index: number;
    metadata?: EventMetadata | null;
}

export default function MarketCard({ market, index, metadata }: MarketCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [viewMode, setViewMode] = useState<'chart' | 'yes' | 'no'>('chart');
    const [orderbook, setOrderbook] = useState<OrderbookResponse | null>(null);
    const [loadingOrderbook, setLoadingOrderbook] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');

    // Calculate price percentage
    const yesPrice = market.last_price || market.yes_bid || 50;
    const noPrice = 100 - yesPrice;

    // Fetch orderbook when expanded
    useEffect(() => {
        if (isExpanded && !orderbook && (viewMode === 'yes' || viewMode === 'no')) {
            setLoadingOrderbook(true);
            KalshiAPI.getOrderbook(market.ticker, 50)
                .then(data => setOrderbook(data))
                .catch(err => console.error('Error fetching orderbook:', err))
                .finally(() => setLoadingOrderbook(false));
        }
    }, [isExpanded, market.ticker, viewMode]);

    // Format close time
    const closeDate = new Date(market.close_time);
    const now = new Date();
    const daysUntilClose = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Format date for display
    const formatCloseDate = () => {
        const options: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            year: closeDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            hour: 'numeric',
            minute: '2-digit'
        };
        return closeDate.toLocaleDateString('en-US', options);
    };

    // Format volume
    const formatVolume = (volume?: number) => {
        if (!volume) return '$0';
        if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
        if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
        return `$${volume}`;
    };

    // Get market image from metadata
    const marketDetail = metadata?.market_details?.find(
        detail => detail.market_ticker === market.ticker
    );

    return (
        <>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.4,
                delay: index * 0.05,
                ease: [0.23, 1, 0.32, 1]
            }}
            className="group relative bg-zinc-900 rounded-xl border border-zinc-800 hover:border-yellow-400/30 transition-all overflow-hidden"
        >
            <div
                onClick={() => !isExpanded && setIsExpanded(true)}
                className={isExpanded ? "p-4" : "p-4 cursor-pointer"}
            >
                <div className="space-y-3">
                    {/* Title and Image */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                            {marketDetail?.image_url && (
                                <img
                                    src={marketDetail.image_url}
                                    alt={market.title}
                                    className="w-10 h-10 object-contain shrink-0"
                                />
                            )}
                            <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 flex-1">
                                {market.title}
                            </h3>
                        </div>
                        <motion.div
                            onClick={(e) => {
                                if (isExpanded) {
                                    e.stopPropagation();
                                    setIsExpanded(false);
                                }
                            }}
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className={isExpanded ? "cursor-pointer" : ""}
                        >
                            <ChevronDown className="w-5 h-5 text-white/40" />
                        </motion.div>
                    </div>

                    {/* Custom Strike */}
                    {market.custom_strike && Object.keys(market.custom_strike).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(market.custom_strike).map(([key, value]) => (
                                <span key={key} className="text-yellow-400 text-xs">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* YES/NO Buttons - Expandable */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* YES Section */}
                        <motion.div
                            animate={{
                                paddingTop: isExpanded ? '12px' : '8px',
                                paddingBottom: isExpanded ? '12px' : '8px'
                            }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className={`bg-green-500/10 border border-green-500/30 rounded-lg px-3 transition-colors ${
                                isExpanded ? 'cursor-pointer hover:bg-green-500/15' : ''
                            }`}
                            onClick={(e) => {
                                if (!isExpanded) return;
                                e.stopPropagation();
                                setSelectedSide('yes');
                                setDialogOpen(true);
                            }}
                        >
                            <div className={isExpanded ? "text-center" : "flex items-center justify-between gap-2"}>
                                <div className="text-green-400 text-xs font-semibold uppercase">YES</div>
                                <div className={`text-white font-bold ${isExpanded ? 'text-2xl mb-1' : 'text-lg'}`}>{yesPrice}%</div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden space-y-2 pt-2 border-t border-green-500/20"
                                        >
                                            <div className="text-white/40 text-xs">{yesPrice}¢ per share</div>

                                            {market.yes_sub_title && (
                                                <div className="px-2 py-1 rounded bg-zinc-950 border border-green-500/40">
                                                    <p className="text-green-400/90 text-xs leading-tight">{market.yes_sub_title}</p>
                                                </div>
                                            )}

                                            {market.yes_bid !== undefined && market.yes_ask !== undefined && (
                                                <div className="space-y-1">
                                                    <div className="text-green-400/60 text-[10px] uppercase">Bid/Ask</div>
                                                    <div className="flex items-center justify-center gap-1 text-xs">
                                                        <span className="px-2 py-0.5 bg-green-500/10 rounded text-green-400">{market.yes_bid}¢</span>
                                                        <span className="text-white/30">|</span>
                                                        <span className="px-2 py-0.5 bg-green-500/10 rounded text-green-400">{market.yes_ask}¢</span>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>

                        {/* NO Section */}
                        <motion.div
                            animate={{
                                paddingTop: isExpanded ? '12px' : '8px',
                                paddingBottom: isExpanded ? '12px' : '8px'
                            }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className={`bg-red-500/10 border border-red-500/30 rounded-lg px-3 transition-colors ${
                                isExpanded ? 'cursor-pointer hover:bg-red-500/15' : ''
                            }`}
                            onClick={(e) => {
                                if (!isExpanded) return;
                                e.stopPropagation();
                                setSelectedSide('no');
                                setDialogOpen(true);
                            }}
                        >
                            <div className={isExpanded ? "text-center" : "flex items-center justify-between gap-2"}>
                                <div className="text-red-400 text-xs font-semibold uppercase">NO</div>
                                <div className={`text-white font-bold ${isExpanded ? 'text-2xl mb-1' : 'text-lg'}`}>{noPrice}%</div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden space-y-2 pt-2 border-t border-red-500/20"
                                        >
                                            <div className="text-white/40 text-xs">{noPrice}¢ per share</div>

                                            {market.no_sub_title && (
                                                <div className="px-2 py-1 rounded bg-zinc-950 border border-red-500/40">
                                                    <p className="text-red-400/90 text-xs leading-tight">{market.no_sub_title}</p>
                                                </div>
                                            )}

                                            {market.no_bid !== undefined && market.no_ask !== undefined && (
                                                <div className="space-y-1">
                                                    <div className="text-red-400/60 text-[10px] uppercase">Bid/Ask</div>
                                                    <div className="flex items-center justify-center gap-1 text-xs">
                                                        <span className="px-2 py-0.5 bg-red-500/10 rounded text-red-400">{market.no_bid}¢</span>
                                                        <span className="text-white/30">|</span>
                                                        <span className="px-2 py-0.5 bg-red-500/10 rounded text-red-400">{market.no_ask}¢</span>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>

                    {/* Stats - Only shown when expanded */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden space-y-3 pt-3 border-t border-zinc-800"
                            >
                                {/* Toggle between Chart/YES/NO */}
                                <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewMode('chart');
                                        }}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'chart'
                                                ? 'bg-yellow-400 text-black'
                                                : 'text-white/60 hover:text-white'
                                            }`}
                                    >
                                        Probability
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewMode('yes');
                                        }}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'yes'
                                                ? 'bg-green-400 text-black'
                                                : 'text-white/60 hover:text-white'
                                            }`}
                                    >
                                        YES Book
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewMode('no');
                                        }}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'no'
                                                ? 'bg-red-400 text-black'
                                                : 'text-white/60 hover:text-white'
                                            }`}
                                    >
                                        NO Book
                                    </button>
                                </div>

                                {/* Content Area */}
                                <div className="min-h-50">
                                    {viewMode === 'chart' && (
                                        <SingleMarketChart market={market} />
                                    )}

                                    {viewMode === 'yes' && (
                                        <div>
                                            {loadingOrderbook ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            ) : orderbook?.orderbook?.yes ? (
                                                <OrderbookYes
                                                    yesOrders={orderbook.orderbook.yes}
                                                    noOrders={orderbook.orderbook.no}
                                                    lastPrice={yesPrice}
                                                />
                                            ) : (
                                                <div className="text-center py-12 text-white/40 text-sm">No YES orders</div>
                                            )}
                                        </div>
                                    )}

                                    {viewMode === 'no' && (
                                        <div>
                                            {loadingOrderbook ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            ) : orderbook?.orderbook?.no ? (
                                                <OrderbookNo
                                                    noOrders={orderbook.orderbook.no}
                                                    yesOrders={orderbook.orderbook.yes}
                                                    lastPrice={noPrice}
                                                />
                                            ) : (
                                                <div className="text-center py-12 text-white/40 text-sm">No NO orders</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Subtitle */}
                                <AnimatePresence>
                                    {isExpanded && market.subtitle && (
                                        <motion.p
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="text-white/50 text-sm overflow-hidden"
                                        >
                                            {market.subtitle}
                                        </motion.p>
                                    )}
                                </AnimatePresence>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col items-center gap-1 py-2 px-2 bg-zinc-800/50 rounded-lg">
                                        <span className="text-yellow-400/50 text-[10px] uppercase">Volume</span>
                                        <span className="text-white text-xs font-semibold">
                                            {formatVolume(market.volume || market.volume)}
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1 py-2 px-2 bg-zinc-800/50 rounded-lg">
                                        <span className="text-blue-400/50 text-[10px] uppercase">Open Int.</span>
                                        <span className="text-white text-xs font-semibold">
                                            {market.open_interest > 0 ? market.open_interest : '0'}
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1 py-2 px-2 bg-zinc-800/50 rounded-lg">
                                        <span className="text-green-400/50 text-[10px] uppercase">Interest</span>
                                        <span className="text-white text-xs font-semibold">
                                            {formatVolume(market.open_interest)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center text-white/50 text-xs">
                                    Closes: <span className="text-white/70 font-medium ml-1">{formatCloseDate()}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>

        {/* Market Detail Dialog */}
        <MarketDetailDialog
            market={market}
            metadata={metadata || null}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            initialSide={selectedSide}
        />
        </>
    );
}
