'use client';

import { useEffect, useCallback } from 'react';
import { PrivyProvider, usePrivy, useSendTransaction } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';
import { monadTestnet } from '@/lib/monad-config';
import Appbar from '@/components/shared/appbar';
import Bottombar from '@/components/shared/bottombar';
import { useWalletSync } from '@/lib/use-wallet-sync';
import { useMonadWallet } from '@/lib/use-privy-monad';
import { setX402Wallet, clearX402Wallet } from '@/lib/x402-server-payment';

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEventPage = pathname?.startsWith('/events/');
  useWalletSync();

  // Register x402 wallet globally when authenticated
  const { authenticated } = usePrivy();
  const { address: walletAddress, hasWallet } = useMonadWallet();
  
  // Use Privy's sendTransaction hook for headless signing
  const { sendTransaction } = useSendTransaction();

  // Create a wrapper function that matches our expected signature
  const wrappedSendTransaction = useCallback(
    async (params: { to: `0x${string}`; value: bigint; chainId: number }) => {
      const result = await sendTransaction(
        {
          to: params.to,
          value: params.value,
          chainId: params.chainId,
        },
        {
          // Disable all wallet UIs for headless signing
          uiOptions: { showWalletUIs: false },
        }
      );
      console.log('[Providers] sendTransaction result:', result);
      // Privy returns { hash, transactionHash, or other variations }
      const txHash = (result as { transactionHash?: string; hash?: string }).transactionHash 
        || (result as { transactionHash?: string; hash?: string }).hash 
        || (typeof result === 'string' ? result : undefined);
      if (!txHash) {
        console.error('[Providers] No transaction hash in result:', result);
        throw new Error('Transaction submitted but no hash returned');
      }
      return { transactionHash: txHash as `0x${string}` };
    },
    [sendTransaction]
  );

  useEffect(() => {
    if (authenticated && hasWallet && walletAddress && typeof sendTransaction === 'function') {
      setX402Wallet(wrappedSendTransaction, walletAddress as `0x${string}`);
      console.log('[Providers] x402 wallet registered with headless sendTransaction:', walletAddress);
    } else if (!authenticated) {
      clearX402Wallet();
    } else {
      console.log('[Providers] Waiting for wallet to be ready...', {
        authenticated,
        hasWallet,
        walletAddress,
        sendTransactionReady: typeof sendTransaction === 'function'
      });
    }
  }, [authenticated, hasWallet, walletAddress, wrappedSendTransaction, sendTransaction]);

  return (
    <div suppressHydrationWarning>
      {!isEventPage && <Appbar />}
      <main className={`pb-24 scrollbar-hide ${!isEventPage ? 'pt-30' : ''}`}>
        {children}
      </main>
      <Bottombar />
    </div>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Configuration Error</h1>
          <p className="text-white/70">Please set NEXT_PUBLIC_PRIVY_APP_ID in .env.local</p>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // EVM embedded wallets — auto-create on login for Monad Testnet
        embeddedWallets: {
          ethereum: { createOnLogin: 'all-users' },
        },
        appearance: {
          theme: 'dark',
          accentColor: '#836ef9', // Monad purple
          showWalletLoginFirst: false,
        },
        loginMethods: ['email', 'wallet', 'google', 'discord', 'github', 'twitter', 'sms', 'passkey'],
        defaultChain: monadTestnet,   // from wagmi/chains — chainId 10143
        supportedChains: [monadTestnet],
      }}
    >
      <LayoutWrapper>
        {children}
      </LayoutWrapper>
    </PrivyProvider>
  );
}
