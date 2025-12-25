'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface TradeInfoBoxProps {
  side: 'yes' | 'no';
  price: number;
  marketTitle: string;
}

export default function TradeInfoBox({ side, price, marketTitle }: TradeInfoBoxProps) {
  const [shares, setShares] = useState(10);
  
  const costPerShare = price;
  const totalCost = (shares * costPerShare) / 100;
  const potentialWin = shares * 1.00; // Each share pays $1 if correct
  const potentialProfit = potentialWin - totalCost;
  const winOdds = price; // Price represents the market's probability
  const impliedProbability = `${price}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border-2 p-6 ${
        side === 'yes'
          ? 'bg-green-500/5 border-green-500/30'
          : 'bg-red-500/5 border-red-500/30'
      }`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                side === 'yes'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {side}
            </div>
            <span className="text-white/60 text-sm">Trade Calculator</span>
          </div>
          <p className="text-white/40 text-xs line-clamp-1">{marketTitle}</p>
        </div>

        {/* Shares Input */}
        <div className="space-y-2">
          <label className="text-white/70 text-sm">Number of Shares</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={shares}
            onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-zinc-900 border border-white/10 rounded px-3 py-2 text-white text-lg font-mono focus:outline-none focus:border-yellow-400/50 transition-colors"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-white/10"></div>

        {/* Trade Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Price per Share</span>
            <span className="text-white font-mono">{price}¢</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Total Cost</span>
            <span className="text-white font-mono font-semibold">
              ${totalCost.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Market Probability</span>
            <span
              className={`font-mono font-semibold ${
                side === 'yes' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {impliedProbability}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10"></div>

        {/* Potential Outcomes */}
        <div className="space-y-3">
          <div className="text-white/70 text-sm font-semibold">If Correct</div>
          
          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">You Receive</span>
            <span className="text-green-400 font-mono font-bold text-lg">
              ${potentialWin.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Your Profit</span>
            <span className="text-green-400 font-mono font-bold text-xl">
              +${potentialProfit.toFixed(2)}
            </span>
          </div>
        </div>
        
        {/* Place Order Button */}
        <button
          className="w-40 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-6 rounded-lg transition-colors mx-auto block"
        >
          Place Order
        </button>

        {/* Loss Note */}
        <div
          className={`text-xs text-center py-2 rounded ${
            side === 'yes'
              ? 'bg-green-500/10 text-green-400/70'
              : 'bg-red-500/10 text-red-400/70'
          }`}
        >
          If incorrect, you lose your ${totalCost.toFixed(2)} investment
        </div>

      </div>
    </motion.div>
  );
}
