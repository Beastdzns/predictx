'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';
import Appbar from '@/components/shared/appbar';
import Bottombar from '@/components/shared/bottombar';
import { useWalletSync } from '@/lib/use-wallet-sync';

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEventPage = pathname?.startsWith('/events/');

  // Sync wallet with access control store
  useWalletSync();

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
        // Configure embedded wallets
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'all-users',
          },
        },
        appearance: {
          theme: 'dark',
          accentColor: '#facc15',
        },
        // Login methods
        loginMethods: ['email', 'wallet', 'google', 'discord', 'github', 'twitter', 'sms', 'passkey'],
        // Only show Aptos/Movement related options, hide EVM
        walletConnectCloudProjectId: undefined,
      }}
    >
      <LayoutWrapper>
        {children}
      </LayoutWrapper>
    </PrivyProvider>
  );
}
