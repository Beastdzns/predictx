'use client';

import AuthenticatedLayout from '@/components/authenticated-layout';
import { usePrivy } from '@privy-io/react-auth';

export default function ProfilePage() {
  const { user, linkPhone, linkGoogle, linkEmail, linkWallet, linkTwitter, linkGithub, linkDiscord } = usePrivy();

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen px-6 py-8">
        <h1 className="text-3xl font-bold text-yellow-400 mb-4">
          Your Profile
        </h1>

        {/* User Object */}
        <section className="mt-8">
          <p className="text-md font-bold uppercase text-gray-400 mb-2">
            Your User Object
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Inspect your linked accounts and user data.
          </p>
          <textarea
            value={JSON.stringify(user, null, 2)}
            className="w-full h-64 rounded-lg bg-zinc-900 border border-zinc-800 p-4 font-mono text-xs text-white scrollbar-hide"
            readOnly
          />
        </section>

        {/* Account Linking */}
        <section className="mt-8">
          <p className="text-md font-bold uppercase text-gray-400 mb-2">
            Account Linking
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Link additional login methods to your account.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              className="rounded-md bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all"
              onClick={linkGoogle}
              disabled={!!user?.google}
            >
              {user?.google ? 'Google Linked ✓' : 'Link Google'}
            </button>
            <button
              className="rounded-md bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all"
              onClick={linkPhone}
              disabled={!!user?.phone}
            >
              {user?.phone ? 'Phone Linked ✓' : 'Link Phone'}
            </button>
            <button
              className="rounded-md bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all"
              onClick={linkEmail}
              disabled={!!user?.email}
            >
              {user?.email ? 'Email Linked ✓' : 'Link Email'}
            </button>
            <button
              className="rounded-md bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all"
              onClick={linkWallet}
              disabled={!!user?.wallet}
            >
              {user?.wallet ? 'External Wallet Linked ✓' : 'Link External Wallet'}
            </button>
            <button
              className="rounded-md bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all"
              onClick={linkTwitter}
              disabled={!!user?.twitter}
            >
              {user?.twitter ? 'Twitter Linked ✓' : 'Link Twitter'}
            </button>
            <button
              className="rounded-md bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all"
              onClick={linkGithub}
              disabled={!!user?.github}
            >
              {user?.github ? 'GitHub Linked ✓' : 'Link GitHub'}
            </button>
            <button
              className="rounded-md bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all"
              onClick={linkDiscord}
              disabled={!!user?.discord}
            >
              {user?.discord ? 'Discord Linked ✓' : 'Link Discord'}
            </button>
          </div>
        </section>
      </div>
    </AuthenticatedLayout>
  );
}
