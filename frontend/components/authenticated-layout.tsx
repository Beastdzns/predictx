'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, authenticated, login } = usePrivy();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (ready) {
      setIsChecking(false);
    }
  }, [ready]);

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
