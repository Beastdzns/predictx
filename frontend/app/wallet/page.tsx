'use client';

import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/authenticated-layout';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, http, formatEther } from 'viem';
import { mainnet } from 'viem/chains';
import { ReceiveDialog } from '@/components/wallet/receive-dialog';
import { SendDialog } from '@/components/wallet/send-dialog';
import { SignMessageDialog } from '@/components/wallet/sign-message-dialog';
import { X402WalletSetup } from '@/components/wallet/x402-wallet-setup';
import { useX402Wallet } from '@/lib/use-x402-wallet';
import { Copy, ReceiptIcon, ArrowUpRight, ArrowDownLeft, Loader2, ExternalLink, Wallet2, CreditCard } from 'lucide-react';
import { movementBedrockConfig } from '@/lib/movement-bedrock-config';

interface Transaction {
  hash: string;
  type: string;
  success: boolean;
  timestamp: string;
  sender: string;
  gasUsed: string;
  version: string;
  payload?: {
    function?: string;
    arguments?: string[];
  };
  events?: Array<{
    type: string;
    data: Record<string, unknown>;
  }>;
}

type WalletView = 'main' | 'micropayments';

export default function WalletPage() {
  const { exportWallet } = usePrivy();
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find(
    (wallet) => (wallet as any).walletClientType === 'privy'
  );

  // x402 Micropayments Wallet
  const { 
    wallet: x402Wallet, 
    balance: x402Balance, 
    isLoading: x402Loading, 
    error: x402Error,
    hasWallet: hasX402Wallet,
    isReady: x402Ready,
    createWallet: createX402Wallet, 
    refreshBalance: refreshX402Balance 
  } = useX402Wallet();

  const [activeView, setActiveView] = useState<WalletView>('main');
  const [balance, setBalance] = useState<string>('0');
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);
  const [x402Transactions, setX402Transactions] = useState<Transaction[]>([]);
  const [isLoadingX402Txns, setIsLoadingX402Txns] = useState(false);
  const [copiedX402, setCopiedX402] = useState(false);

  const copyToClipboard = () => {
    if (embeddedWallet?.address) {
      navigator.clipboard.writeText(embeddedWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyX402ToClipboard = () => {
    if (x402Wallet?.address) {
      navigator.clipboard.writeText(x402Wallet.address);
      setCopiedX402(true);
      setTimeout(() => setCopiedX402(false), 2000);
    }
  };

  // Auto-create x402 wallet when switching to micropayments view
  const [hasAttemptedCreate, setHasAttemptedCreate] = useState(false);
  
  useEffect(() => {
    if (activeView === 'micropayments' && !hasX402Wallet && !x402Loading && !hasAttemptedCreate) {
      setHasAttemptedCreate(true);
      createX402Wallet();
    }
  }, [activeView, hasX402Wallet, x402Loading, hasAttemptedCreate, createX402Wallet]);

  // Reset attempt flag when switching away from micropayments
  useEffect(() => {
    if (activeView !== 'micropayments') {
      setHasAttemptedCreate(false);
    }
  }, [activeView]);

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

  // Fetch transaction history from Movement Bedrock
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!embeddedWallet?.address) return;
      setIsLoadingTxns(true);
      try {
        // Normalize address (remove 0x prefix if present for API)
        const address = embeddedWallet.address.startsWith('0x') 
          ? embeddedWallet.address 
          : `0x${embeddedWallet.address}`;
        
        // Fetch from Movement Bedrock Testnet API
        const response = await fetch(
          `${movementBedrockConfig.rpcUrl}/accounts/${address}/transactions?limit=10`
        );
        
        if (response.ok) {
          const data = await response.json();
          // Transform API response to our Transaction format
          const txns: Transaction[] = data.map((tx: Record<string, unknown>) => ({
            hash: tx.hash as string,
            type: tx.type as string,
            success: tx.success as boolean,
            timestamp: tx.timestamp as string,
            sender: tx.sender as string,
            gasUsed: tx.gas_used as string,
            version: tx.version as string,
            payload: tx.payload as Transaction['payload'],
            events: tx.events as Transaction['events'],
          }));
          setTransactions(txns);
        } else {
          console.log('No transactions found or API error:', response.status);
        }
      } catch (e) {
        console.error('Failed to fetch transactions:', e);
      }
      setIsLoadingTxns(false);
    };

    fetchTransactions();
  }, [embeddedWallet?.address]);

  // Fetch x402 transaction history
  useEffect(() => {
    const fetchX402Transactions = async () => {
      if (!x402Wallet?.address) return;
      setIsLoadingX402Txns(true);
      try {
        const address = x402Wallet.address.startsWith('0x') 
          ? x402Wallet.address 
          : `0x${x402Wallet.address}`;
        
        const response = await fetch(
          `${movementBedrockConfig.rpcUrl}/accounts/${address}/transactions?limit=10`
        );
        
        if (response.ok) {
          const data = await response.json();
          const txns: Transaction[] = data.map((tx: Record<string, unknown>) => ({
            hash: tx.hash as string,
            type: tx.type as string,
            success: tx.success as boolean,
            timestamp: tx.timestamp as string,
            sender: tx.sender as string,
            gasUsed: tx.gas_used as string,
            version: tx.version as string,
            payload: tx.payload as Transaction['payload'],
            events: tx.events as Transaction['events'],
          }));
          setX402Transactions(txns);
        } else {
          console.log('No x402 transactions found or API error:', response.status);
        }
      } catch (e) {
        console.error('Failed to fetch x402 transactions:', e);
      }
      setIsLoadingX402Txns(false);
    };

    fetchX402Transactions();
  }, [x402Wallet?.address]);

  // Helper to format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) / 1000); // Movement uses microseconds
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Helper to get transaction description
  const getTxDescription = (tx: Transaction) => {
    if (tx.payload?.function) {
      const func = tx.payload.function;
      if (func.includes('coin::transfer') || func.includes('aptos_account::transfer')) {
        return 'Transfer';
      }
      if (func.includes('register')) {
        return 'Register Account';
      }
      // Extract function name
      const parts = func.split('::');
      return parts[parts.length - 1] || 'Contract Call';
    }
    return tx.type === 'user_transaction' ? 'Transaction' : tx.type;
  };

  // Helper to check if tx is outgoing
  const isOutgoing = (tx: Transaction) => {
    const senderNormalized = tx.sender?.toLowerCase().replace('0x', '');
    const walletNormalized = embeddedWallet?.address?.toLowerCase().replace('0x', '');
    return senderNormalized === walletNormalized;
  };

  return (
    <AuthenticatedLayout>
      <div className="px-6 pb-24">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">Wallet</h1>
        <p className="text-gray-400 text-sm mb-6">
          Manage your embedded wallet and assets
        </p>

        {/* Toggle Switch */}
        <div className="bg-zinc-900 border mx-auto border-yellow-500/30 rounded-xl p-1 mb-6 flex max-w-xs">
          <button
            onClick={() => setActiveView('main')}
            className={`flex-1 flex text-sm items-center justify-center gap-2 py-1 px-1 rounded-lg font-semibold transition-all ${
              activeView === 'main'
                ? 'bg-yellow-500 text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Wallet2 className="h-4 w-4" />
            Main Wallet
          </button>
          <button
            onClick={() => setActiveView('micropayments')}
            className={`flex-1 flex text-sm items-center justify-center gap-2 py-1 px-1 rounded-lg font-semibold transition-all ${
              activeView === 'micropayments'
                ? 'bg-yellow-500 text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Micropayments
          </button>
        </div>

        {/* Main Wallet View */}
        {activeView === 'main' && (
          <>
            {/* Balance Card */}
            {embeddedWallet && (
              <div className="bg-black border border-yellow-500/10 rounded-2xl p-6 mb-6 shadow-sm shadow-yellow-500/40 max-w-md">
                <h1 className="text-yellow-500 text-sm font-medium mb-4">Total Balance</h1>
                <h1 className="text-yellow-300 border border-yellow-500/30 rounded-lg bg-zinc-950 p-2 text-4xl font-bold mb-4 flex">
                  {isLoadingBalance ? '...' : parseFloat(balance).toFixed(4)} <span className='font-sans'><img src="/movement_logo.png" alt="" className='h-10 w-10 flex items-center justify-center'/></span>
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-black h-8 w-8 mb-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M7 17l0 .01" /><path d="M14 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M7 7l0 .01" /><path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M17 7l0 .01" /><path d="M14 14l3 0" /><path d="M20 14l0 .01" /><path d="M14 14l0 3" /><path d="M14 20l3 0" /><path d="M17 17l3 0" /><path d="M20 17l0 3" /></svg>
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
                    <img src="/movement_logo.png" alt="" className='w-10 h-10 rounded-full'/>
                    <div>
                      <p className="text-white font-semibold">Movement</p>
                      <p className="text-gray-400 text-xs">MOVE</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">
                      {isLoadingBalance ? '...' : parseFloat(balance).toFixed(4)}
                    </p>
                    <p className="text-gray-400 text-xs">MOVE</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Transaction History */}
            <section className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
              
              {isLoadingTxns ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                  <Loader2 className="mx-auto mb-4 h-10 w-10 text-yellow-400 animate-spin" />
                  <p className="text-gray-400 text-sm">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                  <ReceiptIcon className="mx-auto mb-4 h-10 w-10 text-yellow-400 opacity-70" />
                  <p className="text-gray-400 text-sm">No transactions yet</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Your transaction history will appear here
                  </p>
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                  {transactions.map((tx) => (
                    <div 
                      key={tx.hash} 
                      className="p-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            isOutgoing(tx) 
                              ? 'bg-red-500/10 text-red-400' 
                              : 'bg-green-500/10 text-green-400'
                          }`}>
                            {isOutgoing(tx) ? (
                              <ArrowUpRight className="h-5 w-5" />
                            ) : (
                              <ArrowDownLeft className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">
                              {getTxDescription(tx)}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {formatTime(tx.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            tx.success 
                              ? 'bg-green-500/10 text-green-400' 
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {tx.success ? 'Success' : 'Failed'}
                          </span>
                          <a
                            href={`${movementBedrockConfig.blockExplorer}/txn/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on Explorer"
                            className="text-yellow-400 hover:text-yellow-300 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                      <div className="mt-2 pl-12">
                        <p className="text-gray-500 text-xs font-mono truncate">
                          {tx.hash}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
          </>
        )}

        {/* Micropayments Wallet View */}
        {activeView === 'micropayments' && (
          <>
            {!hasX402Wallet ? (
              <>
                {x402Loading ? (
                  <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-6 text-center">
                    <Loader2 className="mx-auto mb-4 h-12 w-12 text-yellow-400 animate-spin" />
                    <h3 className="text-yellow-400 font-semibold mb-2">
                      Creating Your Micropayments Wallet...
                    </h3>
                    <p className="text-gray-300 text-sm mb-2">
                      Setting up your x402 wallet for secure micropayments.
                    </p>
                    <p className="text-gray-400 text-xs">
                      💰 Auto-funding from testnet faucet...
                    </p>
                  </div>
                ) : x402Error ? (
                  <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div className="flex-1">
                        <h3 className="text-red-400 font-semibold mb-2">Wallet Creation Failed</h3>
                        <p className="text-gray-300 text-sm mb-4">
                          {x402Error}
                        </p>
                        <div className="bg-zinc-900 rounded-lg p-3 mb-4">
                          <p className="text-xs text-gray-400 mb-2">
                            💡 <strong>Possible solutions:</strong>
                          </p>
                          <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                            <li>Make sure the backend server is running</li>
                            <li>Check if the API endpoint is accessible</li>
                            <li>Verify your network connection</li>
                          </ul>
                        </div>
                        <button
                          onClick={() => {
                            setHasAttemptedCreate(false);
                            createX402Wallet();
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                        >
                          🔄 Retry Creation
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                    <CreditCard className="mx-auto mb-4 h-12 w-12 text-yellow-400 opacity-70" />
                    <p className="text-gray-400 text-sm">
                      Initializing micropayments wallet...
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* x402 Balance Card */}
                <div className="bg-black border border-yellow-500/10 rounded-2xl p-6 mb-6 shadow-sm shadow-yellow-500/40 max-w-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-yellow-500" />
                      <h1 className="text-yellow-500 text-sm font-medium">Micropayments Balance</h1>
                    </div>
                    <button
                      onClick={refreshX402Balance}
                      disabled={x402Loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border border-yellow-500/50 rounded-lg hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh balance"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-yellow-400 h-4 w-4 ${x402Loading ? 'animate-spin' : ''}`}>
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                      </svg>
                      <span className="text-yellow-400 text-xs font-medium">
                        {x402Loading ? 'Refreshing...' : 'Refresh'}
                      </span>
                    </button>
                  </div>
                  <h1 className="text-yellow-300 border border-yellow-500/30 rounded-lg bg-zinc-950 p-2 text-4xl font-bold mb-4 flex">
                    {x402Loading ? '...' : parseFloat(x402Balance || '0').toFixed(8)} <span className='font-sans'><img src="/movement_logo.png" alt="" className='h-10 w-10 flex items-center justify-center'/></span>
                  </h1>
                  <div className="bg-zinc-950 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h1 className="text-yellow-500 text-xs">x402 Wallet Address</h1>
                      <button
                        onClick={copyX402ToClipboard}
                        className="px-3 py-1 bg-yellow-500/80 hover:bg-black/30 text-white rounded-md text-xs font-semibold transition-all"
                      >
                        {copiedX402 ? '✓' : <Copy className="inline-block mb-0.5 h-3 w-3" />}
                      </button>
                    </div>
                    <div className='bg-zinc-950 rounded-sm overflow-x-auto border border-yellow-400/30'>
                      <p className="text-white/40 p-2 font-mono text-xs">
                        {x402Wallet?.address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Get Testnet MOVE button - only show if wallet needs funding */}
                {!x402Ready && (
                  <div className="mb-6">
                    <a
                      href="https://faucet.movementnetwork.xyz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-yellow-400 border border-zinc-800 rounded-xl p-4 hover:bg-yellow-500 transition-all group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black h-5 w-5">
                        <path d="M7 10v12"/>
                        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
                      </svg>
                      <span className="text-black font-semibold text-sm">Get Testnet MOVE</span>
                    </a>
                  </div>
                )}

                {/* x402 Transaction History */}
                <section className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-4">Payment Activity</h2>
                  
                  {isLoadingX402Txns ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                      <Loader2 className="mx-auto mb-4 h-10 w-10 text-yellow-400 animate-spin" />
                      <p className="text-gray-400 text-sm">Loading payments...</p>
                    </div>
                  ) : x402Transactions.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                      <CreditCard className="mx-auto mb-4 h-10 w-10 text-yellow-400 opacity-70" />
                      <p className="text-gray-400 text-sm">No payments yet</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Your micropayment history will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                      {x402Transactions.map((tx) => {
                        const isX402Outgoing = tx.sender?.toLowerCase().replace('0x', '') === x402Wallet?.address?.toLowerCase().replace('0x', '');
                        return (
                          <div 
                            key={tx.hash} 
                            className="p-4 hover:bg-zinc-800/50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${
                                  isX402Outgoing
                                    ? 'bg-purple-500/10 text-purple-400' 
                                    : 'bg-green-500/10 text-green-400'
                                }`}>
                                  {isX402Outgoing ? (
                                    <CreditCard className="h-5 w-5" />
                                  ) : (
                                    <ArrowDownLeft className="h-5 w-5" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-white font-medium text-sm">
                                    {isX402Outgoing ? 'Micropayment' : getTxDescription(tx)}
                                  </p>
                                  <p className="text-gray-500 text-xs">
                                    {formatTime(tx.timestamp)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  tx.success 
                                    ? 'bg-green-500/10 text-green-400' 
                                    : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {tx.success ? 'Success' : 'Failed'}
                                </span>
                                <a
                                  href={`${movementBedrockConfig.blockExplorer}/txn/${tx.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View on Explorer"
                                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                            <div className="mt-2 pl-12">
                              <p className="text-gray-500 text-xs font-mono truncate">
                                {tx.hash}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
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
