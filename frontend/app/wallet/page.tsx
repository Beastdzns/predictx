'use client';

import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/authenticated-layout';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, http, formatEther } from 'viem';
import { mainnet } from 'viem/chains';
import { ReceiveDialog } from '@/components/wallet/receive-dialog';
import { SendDialog } from '@/components/wallet/send-dialog';
import { SignMessageDialog } from '@/components/wallet/sign-message-dialog';

export default function WalletPage() {
  const { exportWallet } = usePrivy();
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find(
    (wallet) => (wallet as any).walletClientType === 'privy'
  );

  const [balance, setBalance] = useState<string>('0');
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!embeddedWallet?.address) return;
      setIsLoadingBalance(true);
      try {
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(),
        });
        const bal = await publicClient.getBalance({
          address: embeddedWallet.address as `0x${string}`,
        });
        setBalance(formatEther(bal));
      } catch (e) {
        console.error('Failed to fetch balance', e);
      }
      setIsLoadingBalance(false);
    };

    fetchBalance();
  }, [embeddedWallet?.address]);

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen px-6 py-8 pb-24">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">Wallet</h1>
        <p className="text-gray-400 text-sm mb-8">
          Manage your embedded wallet and assets
        </p>

        {/* Balance Card */}
        {embeddedWallet && (
          <div className="bg-linear-to-br from-yellow-400 to-yellow-600 rounded-2xl p-6 mb-6 shadow-xl">
            <p className="text-black/70 text-sm font-medium mb-1">Total Balance</p>
            <p className="text-black text-4xl font-bold mb-4">
              {isLoadingBalance ? '...' : parseFloat(balance).toFixed(4)} ETH
            </p>
            <div className="bg-black/10 rounded-lg p-3">
              <p className="text-black/70 text-xs mb-1">Wallet Address</p>
              <p className="text-black font-mono text-xs break-all">
                {embeddedWallet.address}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <button
            onClick={() => setSendOpen(true)}
            disabled={!embeddedWallet}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-800 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
              ⬆️
            </div>
            <p className="text-white font-semibold text-sm">Send</p>
          </button>
          <button
            onClick={() => setReceiveOpen(true)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-800 transition-all group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
              ⬇️
            </div>
            <p className="text-white font-semibold text-sm">Receive</p>
          </button>
          <button
            onClick={() => setSignOpen(true)}
            disabled={!embeddedWallet}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-800 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
              ✍️
            </div>
            <p className="text-white font-semibold text-sm">Sign</p>
          </button>
        </div>

        {/* Assets Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Assets</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-linear-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">ETH</span>
                </div>
                <div>
                  <p className="text-white font-semibold">Ethereum</p>
                  <p className="text-gray-400 text-xs">ETH</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">
                  {isLoadingBalance ? '...' : parseFloat(balance).toFixed(4)}
                </p>
                <p className="text-gray-400 text-xs">ETH</p>
              </div>
            </div>
          </div>
        </section>

        {/* Transaction History */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">📜</div>
            <p className="text-gray-400 text-sm">No transactions yet</p>
            <p className="text-gray-500 text-xs mt-1">
              Your transaction history will appear here
            </p>
          </div>
        </section>

        {/* Advanced Options */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Advanced</h2>
          <button
            onClick={exportWallet}
            className="w-full bg-red-900/20 border border-red-500/30 rounded-xl p-4 hover:bg-red-900/30 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🔐</div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">Export Private Key</p>
                  <p className="text-red-400 text-xs">Use with extreme caution</p>
                </div>
              </div>
              <div className="text-gray-400 group-hover:text-white transition-colors">
                →
              </div>
            </div>
          </button>
        </section>
      </div>

      {/* Dialogs */}
      <ReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        embeddedWalletAddress={embeddedWallet?.address}
      />
      <SendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        embeddedWallet={embeddedWallet}
      />
      <SignMessageDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        embeddedWallet={embeddedWallet}
      />
    </AuthenticatedLayout>
  );
}
