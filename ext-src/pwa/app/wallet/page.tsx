'use client';

import { useAppStore } from '@/lib/store';
import { Shield, Copy, Check, Activity, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PhantomCard } from '@/components/PhantomCard';
import { IconSend } from '@tabler/icons-react';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  mint?: string;
}

interface WalletActivity {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'stake';
  amount: number;
  token: string;
  timestamp: string;
  signature: string;
}

export default function Wallet() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const showCardDetails = useAppStore((state) => state.showCardDetails);
  const toggleCardDetails = useAppStore((state) => state.toggleCardDetails);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'activity'>('assets');
  const [solBalance, setSolBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState<WalletActivity[]>([]);

  // Fetch SOL balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey && connected) {
        setLoading(true);
        try {
          const balance = await connection.getBalance(publicKey);
          setSolBalance(balance / LAMPORTS_PER_SOL);

          // Fetch recent transactions
          const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
          const activities: WalletActivity[] = signatures.map((sig, index) => ({
            id: sig.signature,
            type: index % 2 === 0 ? 'receive' : 'send',
            amount: Math.random() * 0.5,
            token: 'SOL',
            timestamp: new Date(sig.blockTime! * 1000).toLocaleDateString(),
            signature: sig.signature.slice(0, 8) + '...' + sig.signature.slice(-8),
          }));
          setRecentActivity(activities);
        } catch (error) {
          console.error('Error fetching balance:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchBalance();
  }, [publicKey, connected, connection]);

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Mock SOL price - in production, fetch from an API
  const solPrice = 142.27;
  const totalValue = solBalance * solPrice;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white pb-28"
    >
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 mb-4">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-neon-green">$</span>
              <h1 className="text-xl font-bold text-black dark:text-white">Wallet</h1>
            </div>
            <WalletMultiButton style={{ fontSize: '11px', height: 'auto' }} />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col px-6">
        {/* Total Balance Card */}
        <div className="mb-6">
          <div className="bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Total Portfolio Value</div>
            <div className="text-4xl font-bold text-black dark:text-white mb-1">
              {loading ? (
                <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              ) : (
                `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            {/* Solana Wallet Connection Status */}
            {connected && publicKey && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-neon-green" />
                  <span className="text-xs font-bold text-black dark:text-white">Solana Wallet Connected</span>
                </div>
                <div className="flex items-center gap-2 px-2">
                  <div
                    className="text-xs font-mono text-black dark:text-white bg-neutral-200 dark:bg-gray-800 py-0.5 px-2 rounded-xl overflow-x-auto w-64 hide-scrollbar"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none"
                    }}
                  >

                    {publicKey.toBase58()}
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {copied ? <Check size={16} className="text-neon-green" /> : <Copy size={16} className="text-gray-500 dark:text-gray-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Tabs */}
        <div className="mb-4">
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('assets')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'assets'
                ? 'bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
            >
              Assets
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'activity'
                ? 'bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
            >
              Activity
            </button>
          </div>
        </div>

        {/* Assets View */}
        {activeTab === 'assets' && (
          <div className="mb-6">
            <h2 className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold mb-3 px-2">Your Assets</h2>
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                          <div>
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-1"></div>
                            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-1"></div>
                          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* SOL Balance */}
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-neon-green hover:bg-neon-green/5 dark:hover:bg-neon-green/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src="https://cryptologos.cc/logos/solana-sol-logo.svg?v=040" alt="" className='h-8 w-8' />
                        <div>
                          <div className="font-bold text-black dark:text-white">SOL</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Solana</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-black dark:text-white">{solBalance.toFixed(4)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">${(solBalance * solPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </div>

                  {/* Empty state for other tokens */}
                  {solBalance > 0 && (
                    <div className="p-4 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400">No other tokens found</div>
                    </div>
                  )}

                  {solBalance === 0 && (
                    <div className="p-4 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400">No assets found in this wallet</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Activity View */}
        {activeTab === 'activity' && (
          <div className="mb-6">
            <h2 className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold mb-3 px-2">Recent Activity</h2>
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-2"></div>
                      <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-neon-green hover:bg-neon-green/5 dark:hover:bg-neon-green/10 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'receive' ? '' : ''
                          }`}>
                          {/* <Activity size={16} className={activity.type === 'receive' ? 'text-green-600' : 'text-gray-600'} /> */}
                          {activity.type === 'receive' ? (
                            <IconSend size={24} className="text-slate-400 dark:text-slate-500 rotate-180" />
                          ) :
                            <IconSend size={24} className="text-green-600" />
                          }
                        </div>
                        <div>
                          <div className="font-bold text-black dark:text-white text-sm capitalize">{activity.type}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-sm ${activity.type === 'receive' ? 'text-green-600' : 'text-black dark:text-white'}`}>
                          {activity.type === 'receive' ? '+' : '-'}{activity.amount.toFixed(4)} {activity.token}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{activity.signature}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">No recent activity</div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </motion.div>
  );
}
