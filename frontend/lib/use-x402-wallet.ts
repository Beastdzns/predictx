/**
 * React hook for managing the x402 app-owned payment wallet
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  AppOwnedWallet,
  getStoredAppWallet,
  createAppWallet,
  getAppWalletBalance,
} from './x402-server-payment';

interface UseX402WalletResult {
  // Wallet state
  wallet: AppOwnedWallet | null;
  balance: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Computed state
  hasWallet: boolean;
  isReady: boolean;
  
  // Actions
  createWallet: () => Promise<boolean>;
  refreshBalance: () => Promise<void>;
}

/**
 * Hook to manage the x402 app-owned wallet for micropayments
 */
export function useX402Wallet(): UseX402WalletResult {
  const { user, authenticated } = usePrivy();
  
  const [wallet, setWallet] = useState<AppOwnedWallet | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load wallet from localStorage on mount
  useEffect(() => {
    const stored = getStoredAppWallet();
    if (stored) {
      setWallet(stored);
    }
  }, []);

  // Refresh balance when wallet changes
  useEffect(() => {
    if (wallet) {
      getAppWalletBalance(wallet.address).then(setBalance).catch(console.error);
    }
  }, [wallet]);

  // Refresh balance function
  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    
    try {
      const bal = await getAppWalletBalance(wallet.address);
      setBalance(bal);
    } catch (e) {
      console.error('[x402] Failed to get balance:', e);
    }
  }, [wallet]);

  // Create a new wallet
  const createWallet = useCallback(async (): Promise<boolean> => {
    if (!authenticated || !user?.id) {
      setError('Please log in first');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newWallet = await createAppWallet(user.id);
      setWallet(newWallet);
      
      // Get initial balance
      const bal = await getAppWalletBalance(newWallet.address);
      setBalance(bal);
      
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create wallet';
      setError(msg);
      console.error('[x402] Wallet creation failed:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, user?.id]);

  return {
    wallet,
    balance,
    isLoading,
    error,
    hasWallet: wallet !== null,
    isReady: wallet !== null && balance !== null && parseFloat(balance) > 0,
    createWallet,
    refreshBalance,
  };
}
