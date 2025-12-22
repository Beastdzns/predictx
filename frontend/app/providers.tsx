'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import Appbar from '@/components/shared/appbar';
import Bottombar from '@/components/shared/bottombar';

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
        embeddedWallets: {
          createOnLogin: 'all-users',
        },
        appearance: {
          theme: 'dark',
          accentColor: '#facc15',
        },
        loginMethods: ['email', 'wallet', 'google', 'apple'],
        // Add portal configuration to prevent hydration errors
        _render: {
          inDialog: true,
        },
      }}
    >
      <div suppressHydrationWarning>
        <Appbar />
        <main className="pt-32 pb-24 scrollbar-hide">
          {children}
        </main>
        <Bottombar />
      </div>
    </PrivyProvider>
  );
}
