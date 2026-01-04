/**
 * x402 Payment Wallet Setup Component
 * 
 * Displays wallet status and allows users to create/fund their x402 payment wallet
 */

'use client';

import { useState } from 'react';
import { useX402Wallet } from '@/lib/use-x402-wallet';

interface X402WalletSetupProps {
  compact?: boolean;
  onWalletReady?: () => void;
}

export function X402WalletSetup({ compact = false, onWalletReady }: X402WalletSetupProps) {
  const { 
    wallet, 
    balance, 
    isLoading, 
    error, 
    hasWallet, 
    isReady,
    createWallet, 
    refreshBalance 
  } = useX402Wallet();
  
  const [copied, setCopied] = useState(false);

  const handleCreateWallet = async () => {
    const success = await createWallet();
    if (success && onWalletReady) {
      onWalletReady();
    }
  };

  const handleCopyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // No wallet - show setup prompt
  if (!hasWallet) {
    if (compact) {
      return (
        <button
          onClick={handleCreateWallet}
          disabled={isLoading}
          className="flex items-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg text-sm transition-all"
        >
          {isLoading ? '⏳' : '💳'} 
          {isLoading ? 'Setting up...' : 'Setup x402 Wallet'}
        </button>
      );
    }

    return (
      <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💳</span>
          <div className="flex-1">
            <h3 className="text-yellow-400 font-semibold mb-1">Set Up x402 Payment Wallet</h3>
            <p className="text-gray-300 text-sm mb-3">
              Create a payment wallet to unlock premium content with micropayments.
              This wallet is managed securely by the app.
            </p>
            {error && (
              <p className="text-red-400 text-sm mb-2">❌ {error}</p>
            )}
            <button
              onClick={handleCreateWallet}
              disabled={isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-700 text-black px-4 py-2 rounded-lg font-semibold transition-all"
            >
              {isLoading ? '⏳ Creating Wallet...' : '🔐 Create Payment Wallet'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wallet exists but needs funding
  if (!isReady) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg text-sm">
          <span>⚠️ Fund wallet: {wallet?.address.slice(0, 6)}...</span>
          <button 
            onClick={handleCopyAddress}
            className="hover:text-orange-300"
          >
            📋
          </button>
        </div>
      );
    }

    return (
      <div className="bg-orange-900/30 border border-orange-500/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <h3 className="text-orange-400 font-semibold mb-1">Fund Your x402 Wallet</h3>
            <p className="text-gray-300 text-sm mb-3">
              Your payment wallet needs MOVE tokens for micropayments.
              Send testnet MOVE to the address below.
            </p>
            
            <div className="bg-zinc-800 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs">Wallet Address:</span>
                <button 
                  onClick={handleCopyAddress}
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <code className="text-yellow-400 text-xs break-all">{wallet?.address}</code>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Balance: <span className="text-white">{balance || '0'} MOVE</span>
              </span>
              <button 
                onClick={refreshBalance}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                🔄 Refresh
              </button>
            </div>
            
            <div className="mt-3 p-2 bg-zinc-900 rounded-lg">
              <p className="text-xs text-gray-400">
                💡 Get testnet MOVE from:{' '}
                <a 
                  href="https://faucet.movementnetwork.xyz/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Movement Faucet
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wallet ready
  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-sm">
        <span>✅ {balance} MOVE</span>
      </div>
    );
  }

  return (
    <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">✅</span>
        <div className="flex-1">
          <h3 className="text-green-400 font-semibold mb-1">x402 Wallet Ready</h3>
          <p className="text-gray-300 text-sm mb-2">
            Your payment wallet is set up and funded.
          </p>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Balance: <span className="text-green-400 font-semibold">{balance} MOVE</span>
            </span>
            <button 
              onClick={refreshBalance}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              🔄 Refresh
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            Address: {wallet?.address.slice(0, 12)}...{wallet?.address.slice(-8)}
            <button 
              onClick={handleCopyAddress}
              className="ml-2 text-blue-400 hover:text-blue-300"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
