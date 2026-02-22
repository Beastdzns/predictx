'use client';

/**
 * React hook for managing the x402 payment flow with Privy EVM wallet on Monad
 * Replaces use-x402-wallet.ts — uses Privy EVM embedded wallet instead of app-owned wallet
 */

import { useCallback } from 'react';
import { useMonadWallet, useX402MonPayment } from './use-privy-monad';
import { x402Fetch } from './x402-fetch';
import { sendMonPayment } from './privy-monad-signing';

/**
 * Unified hook for x402 content unlocking on Monad
 */
export function useX402Wallet() {
  const { address, hasWallet, getProvider, switchToMonad } = useMonadWallet();
  const {
    makePayment,
    paymentStatus,
    resetStatus,
    isLoading,
    error,
  } = useX402MonPayment();

  /**
   * Fetch x402-gated content — auto-handles 402 → pay → retry
   */
  const fetchGated = useCallback(
    async <T = unknown>(url: string): Promise<{ success: boolean; data?: T; error?: string; paid?: boolean }> => {
      if (!address) return { success: false, error: 'No wallet connected' };

      try {
        await switchToMonad();
        const provider = await getProvider();

        const sendPaymentFn = async (recipient: `0x${string}`, amountWei: bigint) => {
          return sendMonPayment(provider, address, recipient, amountWei);
        };

        return x402Fetch<T>(url, sendPaymentFn, address);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    },
    [address, getProvider, switchToMonad]
  );

  return {
    // State
    walletAddress: address,
    hasWallet,
    isLoading,
    error,
    paymentStatus,

    // Direct content-type payment
    makePayment,
    resetStatus,

    // Generic gated fetch
    fetchGated,
  };
}
