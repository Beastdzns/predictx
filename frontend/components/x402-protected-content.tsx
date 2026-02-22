'use client';

/**
 * X402 Protected Content Component
 * 
 * This component implements true server-gated content using the x402 protocol:
 * 1. Renders a locked state with blur
 * 2. On unlock click, calls x402 API which returns 402
 * 3. Automatically sends payment and fetches content
 * 4. Renders the unlocked content from server
 * 
 * Unlike ProtectedContent, this doesn't use client-side flags -
 * the server controls access through the x402 payment protocol.
 */

import { ReactNode, useState, useCallback } from 'react';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { x402Fetch } from '@/lib/x402-fetch';
import { hasAppWallet, sendX402Payment, getX402Address } from '@/lib/x402-server-payment';

// Content type mappings
export type X402ContentType = 
  | 'market_data' 
  | 'chart' 
  | 'sentiment' 
  | 'orderbook' 
  | 'calculator' 
  | 'activity'
  | 'social_post'
  | 'social_view'
  | 'social_comment';

interface X402ProtectedContentProps {
  contentType: X402ContentType;
  contentId: string;
  title?: string;
  message?: string;
  blurAmount?: string;
  // Render props: render function receives the unlocked data
  children: (data: unknown, txHash?: string) => ReactNode;
  // Fallback content to show while locked (blurred)
  lockedPreview: ReactNode;
  // Optional: callback when content is unlocked
  onUnlock?: (data: unknown, txHash?: string) => void;
}

interface ContentState {
  status: 'locked' | 'loading' | 'unlocked' | 'error';
  data?: unknown;
  txHash?: string;
  error?: string;
}

export default function X402ProtectedContent({
  contentType,
  contentId,
  title,
  message = 'Pay to unlock',
  blurAmount = 'blur-md',
  children,
  lockedPreview,
  onUnlock,
}: X402ProtectedContentProps) {
  const [state, setState] = useState<ContentState>({ status: 'locked' });

  const handleUnlock = useCallback(async () => {
    // Check if wallet is configured
    if (!hasAppWallet()) {
      alert('Please set up your x402 payment wallet first. Go to Wallet page to configure.');
      return;
    }

    const walletAddress = getX402Address();
    if (!walletAddress) {
      alert('Wallet address not available. Please try again.');
      return;
    }

    setState({ status: 'loading' });

    try {
      const url = `/api/x402/content/${contentType}/${contentId}`;
      
      // Create payment function for x402Fetch
      const sendPayment = async (recipient: `0x${string}`, amountWei: bigint): Promise<string> => {
        return sendX402Payment(recipient, amountWei.toString());
      };

      const response = await x402Fetch<{ data: unknown }>(url, sendPayment, walletAddress);

      if (response.success && response.data) {
        const unlockedData = (response.data as { data?: unknown }).data || response.data;
        setState({
          status: 'unlocked',
          data: unlockedData,
          txHash: response.tx_hash,
        });
        onUnlock?.(unlockedData, response.tx_hash);
      } else {
        setState({
          status: 'error',
          error: response.error || 'Failed to unlock content',
        });
      }
    } catch (error) {
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [contentType, contentId, onUnlock]);

  // Locked state with blur
  if (state.status === 'locked') {
    return (
      <div className="space-y-3">
        {title && (
          <div className="flex items-center justify-between">
            <h3 className="text-yellow-400 font-semibold text-lg">{title}</h3>
            <button
              onClick={handleUnlock}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg text-sm"
            >
              <Lock className="w-4 h-4" />
              {message}
            </button>
          </div>
        )}

        <div className="relative">
          <div className={`${blurAmount} pointer-events-none select-none`}>
            {lockedPreview}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center"
          >
            {!title && (
              <button
                onClick={handleUnlock}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg"
              >
                <Lock className="w-5 h-5" />
                {message}
              </button>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // Loading state
  if (state.status === 'loading') {
    return (
      <div className="space-y-3">
        {title && (
          <h3 className="text-yellow-400 font-semibold text-lg">{title}</h3>
        )}
        <div className="flex flex-col items-center justify-center py-12 bg-zinc-900/50 rounded-lg border border-yellow-400/20">
          <Loader2 className="w-8 h-8 text-yellow-400 animate-spin mb-3" />
          <p className="text-white/70 text-sm">Processing x402 payment...</p>
          <p className="text-white/40 text-xs mt-1">Verifying on Movement blockchain</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.status === 'error') {
    return (
      <div className="space-y-3">
        {title && (
          <h3 className="text-yellow-400 font-semibold text-lg">{title}</h3>
        )}
        <div className="flex flex-col items-center justify-center py-8 bg-red-900/20 rounded-lg border border-red-500/30">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-red-400 text-sm font-medium">Payment Failed</p>
          <p className="text-white/50 text-xs mt-1">{state.error}</p>
          <button
            onClick={handleUnlock}
            className="mt-4 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-lg text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Unlocked state - render children with data
  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-yellow-400 font-semibold text-lg">{title}</h3>
          <div className="flex items-center gap-2 text-green-400 text-xs">
            <CheckCircle className="w-4 h-4" />
            <span>Unlocked via x402</span>
          </div>
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children(state.data, state.txHash)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook for x402 content fetching (alternative to component approach)
 */
export function useX402Content<T = unknown>(contentType: X402ContentType, contentId: string) {
  const [state, setState] = useState<{
    loading: boolean;
    data?: T;
    error?: string;
    txHash?: string;
    unlocked: boolean;
  }>({
    loading: false,
    unlocked: false,
  });

  const unlock = useCallback(async () => {
    if (!hasAppWallet()) {
      return { success: false, error: 'No wallet configured' };
    }

    const walletAddress = getX402Address();
    if (!walletAddress) {
      return { success: false, error: 'Wallet address not available' };
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const url = `/api/x402/content/${contentType}/${contentId}`;
      
      // Create payment function for x402Fetch
      const sendPayment = async (recipient: `0x${string}`, amountWei: bigint): Promise<string> => {
        return sendX402Payment(recipient, amountWei.toString());
      };

      const response = await x402Fetch<{ data: T }>(url, sendPayment, walletAddress);

      if (response.success && response.data) {
        const data = (response.data as { data?: T }).data as T;
        setState({
          loading: false,
          data,
          txHash: response.tx_hash,
          unlocked: true,
        });
        return { success: true, data, txHash: response.tx_hash };
      } else {
        setState({
          loading: false,
          error: response.error,
          unlocked: false,
        });
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setState({
        loading: false,
        error: errorMsg,
        unlocked: false,
      });
      return { success: false, error: errorMsg };
    }
  }, [contentType, contentId]);

  return { ...state, unlock };
}
