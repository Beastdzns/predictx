// Hook to sync Privy wallet with access control store
'use client';

import { useEffect, useMemo } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useAccessControlStore } from './store-access';

export function useWalletSync() {
  const { wallets } = useWallets();
  const setCurrentWallet = useAccessControlStore((state) => state.setCurrentWallet);

  // Find Aptos/Movement wallet from wallets array
  const aptosWallet = useMemo(() => {
    return wallets.find((wallet) => {
      const w = wallet as unknown as Record<string, unknown>;
      return (
        w.walletClientType === 'privy' &&
        (w.chainType === 'aptos' || typeof w.signAndSubmitTransaction === 'function')
      );
    });
  }, [wallets]);

  useEffect(() => {
    // Privy Aptos embedded wallet
    if (aptosWallet) {
      console.log('[x402] Aptos wallet connected:', aptosWallet.address);
      setCurrentWallet(aptosWallet);
      return;
    }

    // Fallback to first embedded wallet from wallets array
    const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === 'privy');
    
    if (embeddedWallet) {
      console.log('[x402] Embedded wallet synced:', embeddedWallet.address);
      setCurrentWallet(embeddedWallet);
    } else if (wallets.length > 0) {
      // Last resort fallback
      console.log('[x402] Using first available wallet (fallback):', wallets[0].address);
      setCurrentWallet(wallets[0]);
    } else {
      setCurrentWallet(null);
    }
  }, [aptosWallet, wallets, setCurrentWallet]);
}
