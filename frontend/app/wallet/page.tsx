'use client';

import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/authenticated-layout';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, http, formatEther } from 'viem';
import { mainnet } from 'viem/chains';
import { ReceiveDialog } from '@/components/wallet/receive-dialog';
import { SendDialog } from '@/components/wallet/send-dialog';
import { SignMessageDialog } from '@/components/wallet/sign-message-dialog';
import { Copy, ReceiptIcon } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (embeddedWallet?.address) {
      navigator.clipboard.writeText(embeddedWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
      <div className="px-6 pb-24">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">Wallet</h1>
        <p className="text-gray-400 text-sm mb-8">
          Manage your embedded wallet and assets
        </p>

        {/* Balance Card */}
        {embeddedWallet && (
          <div className="bg-black border border-yellow-500/10 rounded-2xl p-6 mb-6 shadow-sm shadow-yellow-500/40 max-w-md">
            <h1 className="text-yellow-500 text-sm font-medium mb-4">Total Balance</h1>
            <h1 className="text-yellow-300 border border-yellow-500/30 rounded-lg bg-zinc-950 p-2 text-4xl font-bold mb-4 flex">
              {isLoadingBalance ? '...' : parseFloat(balance).toFixed(4)} <span className='font-sans'><img src="/eth.png" alt="" className='h-10 w-10 flex items-center justify-center'/></span>
            </h1>
            <div className="bg-zinc-950 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-yellow-500 text-xs">Wallet Address</h1>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1 bg-yellow-500/80 hover:bg-black/30 text-white rounded-md text-xs font-semibold transition-all"
                >
                  {copied ? '✓' : <Copy className="inline-block mb-0.5 h-3 w-3" />}
                </button>
              </div>
              <div className='bg-zinc-950 rounded-sm overflow-x-auto border border-yellow-400/30'>
                <p className="text-white/40 p-2 font-mono text-xs">
                  {embeddedWallet.address}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <button
            onClick={() => setSendOpen(true)}
            disabled={!embeddedWallet}
            className="bg-zinc-950 border border-yellow-500 rounded-xl p-4 hover:bg-zinc-800 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-yellow-400 h-7 w-7 mb-2"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 14l11 -11" /><path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" /></svg>
            <p className="text-yellow-400 font-semibold text-sm">Send</p>
          </button>
          <button
            onClick={() => setReceiveOpen(true)}
            className="bg-yellow-400 border border-zinc-800 rounded-xl p-4 hover:bg-yellow-500 transition-all group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mx-auto text-black h-8 w-8 mb-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M17 2a3 3 0 0 1 3 3v16a1 1 0 0 1 -1.555 .832l-2.318 -1.545l-1.42 1.42a1 1 0 0 1 -1.32 .083l-.094 -.083l-1.293 -1.292l-1.293 1.292a1 1 0 0 1 -1.32 .083l-.094 -.083l-1.421 -1.42l-2.317 1.545l-.019 .012l-.054 .03l-.028 .017l-.054 .023l-.05 .023l-.049 .015l-.06 .019l-.052 .009l-.057 .011l-.084 .006l-.026 .003h-.022l-.049 -.003h-.039l-.013 -.003h-.016l-.041 -.008l-.038 -.005l-.015 -.005l-.018 -.002l-.034 -.011l-.04 -.01l-.019 -.007l-.015 -.004l-.029 -.013l-.04 -.015l-.021 -.011l-.013 -.005l-.028 -.016l-.036 -.018l-.014 -.01l-.018 -.01l-.038 -.027l-.022 -.014l-.01 -.009l-.02 -.014l-.045 -.041l-.012 -.008l-.024 -.024l-.035 -.039l-.02 -.02l-.007 -.011l-.011 -.012l-.032 -.045l-.02 -.025l-.012 -.019l-.03 -.054l-.017 -.028l-.023 -.054l-.023 -.05a1 1 0 0 1 -.034 -.108l-.01 -.057l-.01 -.053l-.009 -.132v-16a3 3 0 0 1 3 -3zm-5 3a1 1 0 0 0 -1 1a3 3 0 1 0 0 6v2c-.403 .013 -.75 -.18 -.934 -.5a1 1 0 0 0 -1.732 1a3 3 0 0 0 2.505 1.5l.161 -.001a1 1 0 1 0 2 .001l.176 -.005a3 3 0 0 0 -.176 -5.995v-2c.403 -.013 .75 .18 .934 .5a1 1 0 0 0 1.732 -1a3 3 0 0 0 -2.505 -1.5h-.161a1 1 0 0 0 -1 -1m1 7a1 1 0 0 1 0 2zm-2 -4v2a1 1 0 0 1 0 -2" /></svg>
            <p className="text-black font-semibold text-sm">Receive</p>
          </button>
          <button
            onClick={() => setSignOpen(true)}
            disabled={!embeddedWallet}
            className="bg-zinc-950 border border-yellow-500 rounded-xl p-4 hover:bg-zinc-800 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="/sign.png" alt="" className='mx-auto h-8 w-9 mb-2' />
            <p className="text-yellow-400 font-semibold text-sm">Sign</p>
          </button>
        </div>

        {/* Assets Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Assets</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/eth.png" alt="" className='w-10 h-10 rounded-full'/>
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
            <ReceiptIcon className="mx-auto mb-4 h-10 w-10 text-yellow-400 opacity-70" />
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
            className="w-full border border-yellow-400/30 rounded-xl p-4 hover:bg-red-900/30 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-yellow-400"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" /><path d="M12 11m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 12l0 2.5" /></svg>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">Export Private Key</p>
                  <p className="text-red-400 text-xs">Sensitive key. Don't share it outside app.</p>
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
