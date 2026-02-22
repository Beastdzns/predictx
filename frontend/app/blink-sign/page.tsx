'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePrivy, useSendTransaction, useCreateWallet } from '@privy-io/react-auth';
import { parseEther } from 'viem';

/**
 * Blink Signing Page
 * 
 * This page is opened as a popup by the browser extension.
 * It receives transaction params via URL, signs with Privy embedded wallet,
 * and sends the result back to the opener window.
 * 
 * URL params:
 * - marketId: prediction market ID
 * - side: 'yes' or 'no'
 * - amount: amount in MON
 * - contract: contract address
 * - returnOrigin: origin to postMessage result back to
 */

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || '0x0000000000000000000000000000000000000000';
const BUY_YES_SELECTOR = '0x061dd98d'; // buyYes(uint256)
const BUY_NO_SELECTOR = '0x58c36e5c'; // buyNo(uint256)

export default function BlinkSignPage() {
  const searchParams = useSearchParams();
  const { ready, authenticated, login, user } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { createWallet } = useCreateWallet();
  
  const [status, setStatus] = useState<'loading' | 'auth' | 'creating-wallet' | 'signing' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Loading...');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [attemptedWalletCreate, setAttemptedWalletCreate] = useState(false);

  // Parse params
  const marketId = searchParams.get('marketId');
  const side = searchParams.get('side') || 'yes';
  const amount = searchParams.get('amount') || '0.01';
  const returnOrigin = searchParams.get('returnOrigin') || '*';
  
  // Check for embedded wallet
  const embeddedWallet = user?.linkedAccounts?.find(
    (account): account is any => account.type === 'wallet' && account.walletClientType === 'privy'
  );
  const walletAddress = embeddedWallet?.address || user?.wallet?.address;

  const sendResultToOpener = useCallback((result: { success: boolean; txHash?: string; error?: string }) => {
    if (window.opener) {
      window.opener.postMessage({ type: 'BLINK_SIGN_RESULT', ...result }, returnOrigin);
      setTimeout(() => window.close(), 2000);
    }
  }, [returnOrigin]);

  const signTransaction = useCallback(async () => {
    if (!marketId) {
      setStatus('error');
      setMessage('Missing marketId');
      sendResultToOpener({ success: false, error: 'Missing marketId' });
      return;
    }

    try {
      setStatus('signing');
      setMessage(`Signing ${side.toUpperCase()} trade for ${amount} MON...`);

      const selector = side === 'yes' ? BUY_YES_SELECTOR : BUY_NO_SELECTOR;
      const idHex = BigInt(marketId).toString(16).padStart(64, '0');
      const data = (selector + idHex) as `0x${string}`;
      const value = parseEther(amount);

      const result = await sendTransaction(
        {
          to: CONTRACT_ADDRESS as `0x${string}`,
          data,
          value,
          chainId: 10143,
        },
        { uiOptions: { showWalletUIs: false } }
      );

      const hash = result?.hash || (result as any)?.transactionHash;
      
      if (hash) {
        setStatus('success');
        setTxHash(hash);
        setMessage('Transaction sent!');
        sendResultToOpener({ success: true, txHash: hash });
      } else {
        throw new Error('No transaction hash returned');
      }
    } catch (err: any) {
      console.error('[BlinkSign] Error:', err);
      setStatus('error');
      setMessage(err.message || 'Transaction failed');
      sendResultToOpener({ success: false, error: err.message || 'Transaction failed' });
    }
  }, [marketId, side, amount, sendTransaction, sendResultToOpener]);

  // Create wallet if needed
  const handleCreateWallet = useCallback(async () => {
    try {
      setStatus('creating-wallet');
      setMessage('Creating your wallet...');
      setAttemptedWalletCreate(true);
      await createWallet();
      // After creating wallet, we'll re-trigger via useEffect
    } catch (err: any) {
      console.error('[BlinkSign] Wallet creation error:', err);
      // If wallet already exists, proceed anyway
      if (err.message?.includes('already has') || err.message?.includes('exists')) {
        signTransaction();
      } else {
        setStatus('error');
        setMessage('Failed to create wallet: ' + (err.message || 'Unknown error'));
      }
    }
  }, [createWallet, signTransaction]);

  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      setStatus('auth');
      setMessage('Please login to sign');
      return;
    }

    // Check if user has embedded wallet
    if (!walletAddress && !attemptedWalletCreate) {
      // Need to create embedded wallet
      handleCreateWallet();
      return;
    }

    if (!walletAddress) {
      setStatus('error');
      setMessage('No wallet found. Please create one first.');
      return;
    }

    // Auto-sign once authenticated with wallet
    if (status === 'loading' || status === 'creating-wallet') {
      signTransaction();
    }
  }, [ready, authenticated, walletAddress, attemptedWalletCreate, handleCreateWallet, signTransaction, status]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error('[BlinkSign] Login error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">⚡</div>
          <h1 className="text-xl font-bold text-white">PredictX Blink</h1>
          <p className="text-slate-400 text-sm">Signing transaction on Monad</p>
        </div>

        {/* Transaction Details */}
        {marketId && (
          <div className="bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-700">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Market</span>
                <p className="text-white font-medium">#{marketId}</p>
              </div>
              <div>
                <span className="text-slate-500">Side</span>
                <p className={`font-bold ${side === 'yes' ? 'text-green-400' : 'text-red-400'}`}>
                  {side === 'yes' ? '✅ YES' : '❌ NO'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Amount</span>
                <p className="text-white font-medium">{amount} MON</p>
              </div>
              {walletAddress && (
                <div>
                  <span className="text-slate-500">Wallet</span>
                  <p className="text-white font-mono text-xs truncate">{walletAddress}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="text-center">
          {status === 'loading' && (
            <div className="animate-pulse text-slate-400">{message}</div>
          )}
          
          {status === 'auth' && (
            <div>
              <p className="text-slate-400 mb-4">{message}</p>
              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Login with Privy
              </button>
            </div>
          )}
          
          {status === 'signing' && (
            <div className="flex items-center justify-center gap-3 text-purple-400">
              <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              {message}
            </div>
          )}

          {status === 'creating-wallet' && (
            <div className="flex items-center justify-center gap-3 text-blue-400">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              {message}
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-green-400">
              <div className="text-2xl mb-2">✅</div>
              <p className="font-medium">{message}</p>
              {txHash && (
                <a
                  href={`https://testnet.monadexplorer.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline text-sm mt-2 block"
                >
                  View on Explorer →
                </a>
              )}
              <p className="text-slate-500 text-sm mt-2">This window will close...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-red-400">
              <div className="text-2xl mb-2">❌</div>
              <p className="font-medium">{message}</p>
              <button
                onClick={() => signTransaction()}
                className="mt-4 text-sm text-purple-400 hover:text-purple-300 underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-700 text-center">
          <p className="text-slate-500 text-xs">
            Powered by PredictX · Monad Testnet
          </p>
        </div>
      </div>
    </div>
  );
}
