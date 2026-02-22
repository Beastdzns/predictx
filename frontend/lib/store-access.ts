import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { formatEther } from 'viem';
import { sendX402Payment, hasAppWallet } from './x402-server-payment';
import { x402Config } from './monad-config';

// Helper to format wei price to human-readable MON
const formatPrice = (weiString: string): string => {
  const mon = formatEther(BigInt(weiString));
  return `${mon} MON`;
};

interface AccessControlState {
  // Market-specific access (tracked by market ticker or event ticker)
  marketAccess: Record<string, boolean>;
  chartAccess: Record<string, boolean>;
  sentimentAccess: Record<string, boolean>;
  orderbookAccess: Record<string, boolean>;
  tradeCalculatorAccess: Record<string, boolean>;
  activityAccess: Record<string, boolean>;
  
  // Social-specific access
  hasSocialPostAccess: boolean;
  hasSocialViewAccess: boolean;
  hasSocialCommentAccess: boolean;
  socialPostAccessTimestamp: number | null;
  socialViewAccessTimestamp: number | null;
  socialCommentAccessTimestamp: number | null;

  // Wallet reference for payments
  currentWallet: any | null;
  setCurrentWallet: (wallet: any) => void;

  // Market-specific request methods with payment (returns true if granted, false if denied)
  requestMarketAccess: (marketId: string) => Promise<boolean>;
  requestChartAccess: (marketId: string) => Promise<boolean>;
  requestSentimentAccess: (marketId: string) => Promise<boolean>;
  requestOrderbookAccess: (marketId: string) => Promise<boolean>;
  requestTradeCalculatorAccess: (marketId: string) => Promise<boolean>;
  requestActivityAccess: (marketId: string) => Promise<boolean>;

  // Social request methods with payment
  requestSocialPostAccess: () => Promise<boolean>;
  requestSocialViewAccess: () => Promise<boolean>;
  requestSocialCommentAccess: () => Promise<boolean>;
  checkAndResetExpiredSocialAccess: () => void;

  // Helper method to check expiration
  _checkSocialAccessExpired: (timestamp: number | null) => boolean;

  // Check methods
  hasMarketAccess: (marketId: string) => boolean;
  hasChartAccess: (marketId: string) => boolean;
  hasSentimentAccess: (marketId: string) => boolean;
  hasOrderbookAccess: (marketId: string) => boolean;
  hasTradeCalculatorAccess: (marketId: string) => boolean;
  hasActivityAccess: (marketId: string) => boolean;

  // Reset all access
  resetAccess: () => void;
}

export const useAccessControlStore = create<AccessControlState>()(
  persist(
    (set, get) => ({
      // Initial state - all locked
      marketAccess: {},
      chartAccess: {},
      sentimentAccess: {},
      orderbookAccess: {},
      tradeCalculatorAccess: {},
      activityAccess: {},
      hasSocialPostAccess: false,
      hasSocialViewAccess: false,
      hasSocialCommentAccess: false,
      socialPostAccessTimestamp: null,
      socialViewAccessTimestamp: null,
      socialCommentAccessTimestamp: null,
      currentWallet: null,

      // Set wallet for payments
      setCurrentWallet: (wallet: any) => {
        set({ currentWallet: wallet });
      },

      // Helper to check if access has expired (24 hours = 86400000 ms)
      _checkSocialAccessExpired: (timestamp: number | null): boolean => {
        if (!timestamp) return true;
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        return (now - timestamp) > twentyFourHours;
      },

      // Check methods
      hasMarketAccess: (marketId: string) => get().marketAccess[marketId] || false,
      hasChartAccess: (marketId: string) => get().chartAccess[marketId] || false,
      hasSentimentAccess: (marketId: string) => get().sentimentAccess[marketId] || false,
      hasOrderbookAccess: (marketId: string) => get().orderbookAccess[marketId] || false,
      hasTradeCalculatorAccess: (marketId: string) => get().tradeCalculatorAccess[marketId] || false,
      hasActivityAccess: (marketId: string) => get().activityAccess[marketId] || false,

      // Request methods with confirmation dialogs and payments
      requestMarketAccess: async (marketId: string) => {
        if (get().marketAccess[marketId]) return true;
        
        if (!hasAppWallet()) {
          alert('Wallet not ready. Please wait a moment and try again, or visit the Wallet page to check your balance.');
          return false;
        }

        const confirmed = window.confirm(
          '🔒 Access Market Data\n\n' +
          'This will unlock market probability, volume, and open interest data for this specific market.\n\n' +
          `Cost: ${formatPrice(x402Config.pricing.marketData)}\n\n` +
          'Do you want to proceed?'
        );
        
        if (!confirmed) return false;
        
        try {
          const txHash = await sendX402Payment(
            x402Config.recipientAddress,
            x402Config.pricing.marketData
          );
          console.log(`[x402] Market access unlocked. TX: ${txHash}`);
          
          set((state) => ({
            marketAccess: { ...state.marketAccess, [marketId]: true }
          }));
          return true;
        } catch (error) {
          console.error('[x402] Payment failed:', error);
          alert('Payment failed. Please try again.');
          return false;
        }
      },

      requestChartAccess: async (marketId: string) => {
        if (get().chartAccess[marketId]) return true;
        
        if (!hasAppWallet()) {
          alert('Wallet not ready. Please wait a moment and try again, or visit the Wallet page to check your balance.');
          return false;
        }

        const confirmed = window.confirm(
          '🔒 Access Market Charts\n\n' +
          'This will unlock historical price charts and market trends for this specific market.\n\n' +
          `Cost: ${formatPrice(x402Config.pricing.charts)}\n\n` +
          'Do you want to proceed?'
        );
        
        if (!confirmed) return false;
        
        try {
          const txHash = await sendX402Payment(
            x402Config.recipientAddress,
            x402Config.pricing.charts
          );
          console.log(`[x402] Chart access unlocked. TX: ${txHash}`);
          
          set((state) => ({
            chartAccess: { ...state.chartAccess, [marketId]: true }
          }));
          return true;
        } catch (error) {
          console.error('[x402] Payment failed:', error);
          alert('Payment failed. Please try again.');
          return false;
        }
      },

      requestSentimentAccess: async (marketId: string) => {
        if (get().sentimentAccess[marketId]) return true;
        
        if (!hasAppWallet()) {
          alert('Wallet not ready. Please wait a moment and try again, or visit the Wallet page to check your balance.');
          return false;
        }

        const confirmed = window.confirm(
          '🔒 Access Market Sentiment\n\n' +
          'This will unlock AI-powered sentiment analysis and recommendations for this event.\n\n' +
          `Cost: ${formatPrice(x402Config.pricing.sentiment)}\n\n` +
          'Do you want to proceed?'
        );
        
        if (!confirmed) return false;
        
        try {
          const txHash = await sendX402Payment(
            x402Config.recipientAddress,
            x402Config.pricing.sentiment
          );
          console.log(`[x402] Sentiment access unlocked. TX: ${txHash}`);
          
          set((state) => ({
            sentimentAccess: { ...state.sentimentAccess, [marketId]: true }
          }));
          return true;
        } catch (error) {
          console.error('[x402] Payment failed:', error);
          alert('Payment failed. Please try again.');
          return false;
        }
      },

      requestOrderbookAccess: async (marketId: string) => {
        if (get().orderbookAccess[marketId]) return true;
        
        if (!hasAppWallet()) {
          alert('Wallet not ready. Please wait a moment and try again, or visit the Wallet page to check your balance.');
          return false;
        }

        const confirmed = window.confirm(
          '🔒 Access Order Book\n\n' +
          'This will unlock real-time order book data showing all buy and sell orders for this market.\n\n' +
          `Cost: ${formatPrice(x402Config.pricing.orderbook)}\n\n` +
          'Do you want to proceed?'
        );
        
        if (!confirmed) return false;
        
        try {
          const txHash = await sendX402Payment(
            x402Config.recipientAddress,
            x402Config.pricing.orderbook
          );
          console.log(`[x402] Orderbook access unlocked. TX: ${txHash}`);
          
          set((state) => ({
            orderbookAccess: { ...state.orderbookAccess, [marketId]: true }
          }));
          return true;
        } catch (error) {
          console.error('[x402] Payment failed:', error);
          alert('Payment failed. Please try again.');
          return false;
        }
      },

      requestTradeCalculatorAccess: async (marketId: string) => {
        if (get().tradeCalculatorAccess[marketId]) return true;
        
        if (!hasAppWallet()) {
          alert('Wallet not ready. Please wait a moment and try again, or visit the Wallet page to check your balance.');
          return false;
        }

        const confirmed = window.confirm(
          '🔒 Access Trade Calculator\n\n' +
          'This will unlock the trading calculator to calculate potential profits for this market.\n\n' +
          `Cost: ${formatPrice(x402Config.pricing.calculator)}\n\n` +
          'Do you want to proceed?'
        );
        
        if (!confirmed) return false;
        
        try {
          const txHash = await sendX402Payment(
            x402Config.recipientAddress,
            x402Config.pricing.calculator
          );
          console.log(`[x402] Calculator access unlocked. TX: ${txHash}`);
          
          set((state) => ({
            tradeCalculatorAccess: { ...state.tradeCalculatorAccess, [marketId]: true }
          }));
          return true;
        } catch (error) {
          console.error('[x402] Payment failed:', error);
          alert('Payment failed. Please try again.');
          return false;
        }
      },

      requestActivityAccess: async (marketId: string) => {
        if (get().activityAccess[marketId]) return true;
        
        if (!hasAppWallet()) {
          alert('Wallet not ready. Please wait a moment and try again, or visit the Wallet page to check your balance.');
          return false;
        }

        const confirmed = window.confirm(
          '🔒 Access Recent Activity\n\n' +
          'This will unlock recent trades and market activity data for this market/event.\n\n' +
          `Cost: ${formatPrice(x402Config.pricing.activity)}\n\n` +
          'Do you want to proceed?'
        );
        
        if (!confirmed) return false;
        
        try {
          const txHash = await sendX402Payment(
            x402Config.recipientAddress,
            x402Config.pricing.activity
          );
          console.log(`[x402] Activity access unlocked. TX: ${txHash}`);
          
          set((state) => ({
            activityAccess: { ...state.activityAccess, [marketId]: true }
          }));
          return true;
        } catch (error) {
          console.error('[x402] Payment failed:', error);
          alert('Payment failed. Please try again.');
          return false;
        }
      },

      requestSocialPostAccess: async () => {
        const state = get();
        // Check if access has expired
        if (state.hasSocialPostAccess && !state._checkSocialAccessExpired(state.socialPostAccessTimestamp)) {
          return true;
        }
        
        if (!hasAppWallet()) {
          alert('Wallet not ready. Please wait a moment and try again, or visit the Wallet page to check your balance.');
          return false;
        }

        const confirmed = window.confirm(
          '📝 Post to Community\n\n' +
          'Do you want to create a new post?\n' +
          'Access will be valid for 24 hours.\n\n' +
          `Cost: ${formatPrice(x402Config.pricing.socialPost)}\n\n` +
          'Click OK to proceed.'
        );
        
        if (!confirmed) return false;
        
        try {
          const txHash = await sendX402Payment(
            x402Config.recipientAddress,
            x402Config.pricing.socialPost
          );
          console.log(`[x402] Social post access unlocked. TX: ${txHash}`);
          
          set({ hasSocialPostAccess: true, socialPostAccessTimestamp: Date.now() });
          return true;
        } catch (error) {
          console.error('[x402] Payment failed:', error);
          alert('Payment failed. Please try again.');
          return false;
        }
      },

      requestSocialViewAccess: async () => {
        const state = get();
        // Check if access has expired
        if (state.hasSocialViewAccess && !state._checkSocialAccessExpired(state.socialViewAccessTimestamp)) {
          return true;
        }
        
        if (!hasAppWallet()) {
          alert('Wallet not ready. Please wait a moment and try again, or visit the Wallet page to check your balance.');
          return false;
        }

        const confirmed = window.confirm(
          '🔓 Unlock Community Feed\n\n' +
          'This will reveal all posts and discussions.\n' +
          'Access will be valid for 24 hours.\n\n' +
          `Cost: ${formatPrice(x402Config.pricing.socialView)}\n\n` +
          'Do you want to proceed?'
        );
        
        if (!confirmed) return false;
        
        try {
          const txHash = await sendX402Payment(
            x402Config.recipientAddress,
            x402Config.pricing.socialView
          );
          console.log(`[x402] Social view access unlocked. TX: ${txHash}`);
          
          set({ hasSocialViewAccess: true, socialViewAccessTimestamp: Date.now() });
          return true;
        } catch (error) {
          console.error('[x402] Payment failed:', error);
          alert('Payment failed. Please try again.');
          return false;
        }
      },

      requestSocialCommentAccess: async () => {
        const state = get();
        // Check if access has expired
        if (state.hasSocialCommentAccess && !state._checkSocialAccessExpired(state.socialCommentAccessTimestamp)) {
          return true;
        }
        
        if (!hasAppWallet()) {
          alert('Wallet not ready. Please wait a moment and try again, or visit the Wallet page to check your balance.');
          return false;
        }

        const confirmed = window.confirm(
          '💬 Post Comment\n\n' +
          'Do you want to post this comment?\n' +
          'Access will be valid for 24 hours.\n\n' +
          `Cost: ${formatPrice(x402Config.pricing.socialComment)}\n\n` +
          'Click OK to proceed.'
        );
        
        if (!confirmed) return false;
        
        try {
          const txHash = await sendX402Payment(
            x402Config.recipientAddress,
            x402Config.pricing.socialComment
          );
          console.log(`[x402] Social comment access unlocked. TX: ${txHash}`);
          
          set({ hasSocialCommentAccess: true, socialCommentAccessTimestamp: Date.now() });
          return true;
        } catch (error) {
          console.error('[x402] Payment failed:', error);
          alert('Payment failed. Please try again.');
          return false;
        }
      },

      // Method to check and reset all expired social access
      checkAndResetExpiredSocialAccess: () => {
        const state = get();
        const updates: Partial<AccessControlState> = {};

        if (state.hasSocialPostAccess && state._checkSocialAccessExpired(state.socialPostAccessTimestamp)) {
          updates.hasSocialPostAccess = false;
          updates.socialPostAccessTimestamp = null;
        }
        if (state.hasSocialViewAccess && state._checkSocialAccessExpired(state.socialViewAccessTimestamp)) {
          updates.hasSocialViewAccess = false;
          updates.socialViewAccessTimestamp = null;
        }
        if (state.hasSocialCommentAccess && state._checkSocialAccessExpired(state.socialCommentAccessTimestamp)) {
          updates.hasSocialCommentAccess = false;
          updates.socialCommentAccessTimestamp = null;
        }

        if (Object.keys(updates).length > 0) {
          set(updates);
        }
      },

      resetAccess: () => {
        set({
          marketAccess: {},
          chartAccess: {},
          sentimentAccess: {},
          orderbookAccess: {},
          tradeCalculatorAccess: {},
          activityAccess: {},
          hasSocialPostAccess: false,
          hasSocialViewAccess: false,
          hasSocialCommentAccess: false,
          socialPostAccessTimestamp: null,
          socialViewAccessTimestamp: null,
          socialCommentAccessTimestamp: null,
        });
      },
    }),
    {
      name: 'access-control-storage',
    }
  )
);
