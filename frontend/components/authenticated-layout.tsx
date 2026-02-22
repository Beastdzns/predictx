'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMonadWallet } from '@/lib/use-privy-monad';
import { setX402Wallet, clearX402Wallet } from '@/lib/x402-server-payment';

interface Props {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, authenticated, login } = usePrivy();
  const [isChecking, setIsChecking] = useState(true);

  // Get Monad wallet for x402 registration
  const { wallet: embeddedWallet, address: walletAddress, hasWallet, getProvider } = useMonadWallet();

  useEffect(() => {
    if (ready) {
      setIsChecking(false);
    }
  }, [ready]);

  // Register x402 wallet globally when authenticated
  useEffect(() => {
    const registerX402 = async () => {
      if (authenticated && hasWallet && walletAddress && embeddedWallet) {
        try {
          const provider = await getProvider();
          if (provider) {
            setX402Wallet(provider, walletAddress as `0x${string}`);
            console.log('[AuthLayout] x402 wallet registered:', walletAddress);
          }
        } catch (e) {
          console.error('[AuthLayout] Failed to register x402 wallet:', e);
        }
      } else if (!authenticated) {
        clearX402Wallet();
      }
    };

    registerX402();
  }, [authenticated, hasWallet, walletAddress, embeddedWallet, getProvider]);

  if (!ready || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">
          Authentication Required
        </h2>
        <p className="text-white/70 mb-6 text-center">
          Please log in to access this page
        </p>
        <button
          onClick={() => login()}
          className="px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all"
        >
          Log In
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
