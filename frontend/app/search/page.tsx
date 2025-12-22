'use client';

import { useRouter } from 'next/navigation';

export default function SearchPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen px-6 py-8">
      <h1 className="text-3xl font-bold text-yellow-400 mb-4">
        Search Markets
      </h1>
      <p className="text-white/70 mb-8">
        Search functionality coming soon...
      </p>

      <div className="p-8 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
        <p className="text-gray-400">Search feature will be implemented here</p>
      </div>
    </div>
  );
}
