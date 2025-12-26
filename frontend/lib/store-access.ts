import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

  // Market-specific request methods (returns true if granted, false if denied)
  requestMarketAccess: (marketId: string) => boolean;
  requestChartAccess: (marketId: string) => boolean;
  requestSentimentAccess: (marketId: string) => boolean;
  requestOrderbookAccess: (marketId: string) => boolean;
  requestTradeCalculatorAccess: (marketId: string) => boolean;
  requestActivityAccess: (marketId: string) => boolean;

  // Social request methods
  requestSocialPostAccess: () => boolean;
  requestSocialViewAccess: () => boolean;
  requestSocialCommentAccess: () => boolean;
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

      // Request methods with confirmation dialogs
      requestMarketAccess: (marketId: string) => {
        if (get().marketAccess[marketId]) return true;
        const confirmed = window.confirm(
          '🔒 Access Market Data\n\n' +
          'This will unlock market probability, volume, and open interest data for this specific market.\n\n' +
          'Do you want to proceed?'
        );
        if (confirmed) {
          set((state) => ({
            marketAccess: { ...state.marketAccess, [marketId]: true }
          }));
        }
        return confirmed;
      },

      requestChartAccess: (marketId: string) => {
        if (get().chartAccess[marketId]) return true;
        const confirmed = window.confirm(
          '🔒 Access Market Charts\n\n' +
          'This will unlock historical price charts and market trends for this specific market.\n\n' +
          'Do you want to proceed?'
        );
        if (confirmed) {
          set((state) => ({
            chartAccess: { ...state.chartAccess, [marketId]: true }
          }));
        }
        return confirmed;
      },

      requestSentimentAccess: (marketId: string) => {
        if (get().sentimentAccess[marketId]) return true;
        const confirmed = window.confirm(
          '🔒 Access Market Sentiment\n\n' +
          'This will unlock AI-powered sentiment analysis and recommendations for this event.\n\n' +
          'Do you want to proceed?'
        );
        if (confirmed) {
          set((state) => ({
            sentimentAccess: { ...state.sentimentAccess, [marketId]: true }
          }));
        }
        return confirmed;
      },

      requestOrderbookAccess: (marketId: string) => {
        if (get().orderbookAccess[marketId]) return true;
        const confirmed = window.confirm(
          '🔒 Access Order Book\n\n' +
          'This will unlock real-time order book data showing all buy and sell orders for this market.\n\n' +
          'Do you want to proceed?'
        );
        if (confirmed) {
          set((state) => ({
            orderbookAccess: { ...state.orderbookAccess, [marketId]: true }
          }));
        }
        return confirmed;
      },

      requestTradeCalculatorAccess: (marketId: string) => {
        if (get().tradeCalculatorAccess[marketId]) return true;
        const confirmed = window.confirm(
          '🔒 Access Trade Calculator\n\n' +
          'This will unlock the trading calculator to calculate potential profits for this market.\n\n' +
          'Do you want to proceed?'
        );
        if (confirmed) {
          set((state) => ({
            tradeCalculatorAccess: { ...state.tradeCalculatorAccess, [marketId]: true }
          }));
        }
        return confirmed;
      },

      requestActivityAccess: (marketId: string) => {
        if (get().activityAccess[marketId]) return true;
        const confirmed = window.confirm(
          '🔒 Access Recent Activity\n\n' +
          'This will unlock recent trades and market activity data for this market/event.\n\n' +
          'Do you want to proceed?'
        );
        if (confirmed) {
          set((state) => ({
            activityAccess: { ...state.activityAccess, [marketId]: true }
          }));
        }
        return confirmed;
      },

      requestSocialPostAccess: () => {
        const state = get();
        // Check if access has expired
        if (state.hasSocialPostAccess && !state._checkSocialAccessExpired(state.socialPostAccessTimestamp)) {
          return true;
        }
        const confirmed = window.confirm(
          '📝 Post to Community\n\n' +
          'Do you want to create a new post?\n' +
          'Access will be valid for 24 hours.\n\n' +
          'Click OK to proceed.'
        );
        if (confirmed) {
          set({ hasSocialPostAccess: true, socialPostAccessTimestamp: Date.now() });
        }
        return confirmed;
      },

      requestSocialViewAccess: () => {
        const state = get();
        // Check if access has expired
        if (state.hasSocialViewAccess && !state._checkSocialAccessExpired(state.socialViewAccessTimestamp)) {
          return true;
        }
        const confirmed = window.confirm(
          '🔓 Unlock Community Feed\n\n' +
          'This will reveal all posts and discussions.\n' +
          'Access will be valid for 24 hours.\n\n' +
          'Do you want to proceed?'
        );
        if (confirmed) {
          set({ hasSocialViewAccess: true, socialViewAccessTimestamp: Date.now() });
        }
        return confirmed;
      },

      requestSocialCommentAccess: () => {
        const state = get();
        // Check if access has expired
        if (state.hasSocialCommentAccess && !state._checkSocialAccessExpired(state.socialCommentAccessTimestamp)) {
          return true;
        }
        const confirmed = window.confirm(
          '💬 Post Comment\n\n' +
          'Do you want to post this comment?\n' +
          'Access will be valid for 24 hours.\n\n' +
          'Click OK to proceed.'
        );
        if (confirmed) {
          set({ hasSocialCommentAccess: true, socialCommentAccessTimestamp: Date.now() });
        }
        return confirmed;
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
