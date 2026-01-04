/**
 * React Hooks for Privy Movement Chain Wallet Integration
 * 
 * Provides hooks for:
 * - Creating Movement/Aptos wallets using Privy's extended chains
 * - Accessing and using Movement embedded wallets
 * - Signing Move transactions
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import {
  signAndSubmitMoveTransfer,
  waitForExecution,
  verifyTransaction,
  getAccountBalance,
} from './privy-movement-signing';
import { movementBedrockConfig, x402Config } from './movement-bedrock-config';

/**
 * Extended wallet type for Aptos/Movement
 */
/**
 * Transaction payload for Aptos/Movement
 */
export interface MoveTransactionPayload {
  transaction: unknown;
  options?: Record<string, unknown>;
}

/**
 * Extended wallet type for Aptos/Movement
 */
export interface MovementWallet {
  address: string;
  publicKey?: string;
  walletClientType: string;
  chainType?: 'aptos' | string;
  getAccounts?: () => Promise<Array<{ address: string; publicKey: string }>>;
  signMessage?: (message: string) => Promise<{ signature: string } | string>;
  signAndSubmitTransaction?: (payload: MoveTransactionPayload) => Promise<{ hash: string } | string>;
}

/**
 * Hook to access Movement embedded wallet from Privy
 */
export function useMovementWallet() {
  const { wallets } = useWallets();
  const { ready, authenticated } = usePrivy();

  // Find the Aptos embedded wallet (Movement uses Aptos SDK)
  const movementWallet = useMemo(() => {
    if (!wallets) return null;
    
    // Privy Aptos embedded wallets have walletClientType = 'privy'
    // and are on the Aptos chain type
    const aptosWallet = wallets.find((wallet) => {
      const w = wallet as unknown as Record<string, unknown>;
      return (
        w.walletClientType === 'privy' &&
        (w.chainType === 'aptos' || 
         // Fallback: check if it has Aptos-like methods
         typeof w.signAndSubmitTransaction === 'function')
      );
    });

    return aptosWallet as unknown as MovementWallet | null;
  }, [wallets]);

  // Get wallet address
  const address = movementWallet?.address || null;

  // Get wallet public key (synchronously from wallet if available)
  const publicKey = movementWallet?.publicKey || null;

  return {
    wallet: movementWallet,
    address,
    publicKey,
    isReady: ready,
    isAuthenticated: authenticated,
    hasWallet: !!movementWallet,
  };
}

/**
 * Hook for Movement chain transactions
 */
export function useMovementTransaction() {
  const { wallet, address, hasWallet } = useMovementWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  /**
   * Send MOVE tokens
   */
  const sendMove = useCallback(async (
    recipientAddress: string,
    amountOctas: bigint | string
  ): Promise<string> => {
    if (!wallet) {
      throw new Error('No Movement wallet connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const amount = typeof amountOctas === 'string' 
        ? BigInt(amountOctas) 
        : amountOctas;

      const txHash = await signAndSubmitMoveTransfer(
        wallet,
        recipientAddress,
        amount
      );

      setLastTxHash(txHash);
      return txHash;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  /**
   * Send MOVE with confirmation wait
   */
  const sendMoveAndWait = useCallback(async (
    recipientAddress: string,
    amountOctas: bigint | string,
    options?: { timeoutSecs?: number }
  ): Promise<{ hash: string; success: boolean }> => {
    const txHash = await sendMove(recipientAddress, amountOctas);
    
    const result = await waitForExecution(txHash, options);
    
    return {
      hash: txHash,
      success: result.success,
    };
  }, [sendMove]);

  /**
   * Verify a transaction
   */
  const verify = useCallback(async (txHash: string) => {
    return verifyTransaction(txHash);
  }, []);

  /**
   * Get current wallet balance
   */
  const getBalance = useCallback(async () => {
    if (!address) return null;
    return getAccountBalance(address);
  }, [address]);

  return {
    sendMove,
    sendMoveAndWait,
    verify,
    getBalance,
    isLoading,
    error,
    lastTxHash,
    hasWallet,
    walletAddress: address,
  };
}

/**
 * Hook for x402 payments on Movement chain
 */
export function useX402MovePayment() {
  const { sendMoveAndWait, isLoading, error, walletAddress } = useMovementTransaction();
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'building' | 'signing' | 'confirming' | 'success' | 'failed'
  >('idle');

  /**
   * Make an x402 payment to unlock content
   */
  const makePayment = useCallback(async (
    contentType: keyof typeof x402Config.pricing,
    options?: { 
      customRecipient?: string;
      customAmount?: string;
    }
  ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!walletAddress) {
      return { success: false, error: 'No wallet connected' };
    }

    const recipientAddress = options?.customRecipient || x402Config.recipientAddress;
    const amountOctas = options?.customAmount || x402Config.pricing[contentType];

    if (!amountOctas) {
      return { success: false, error: `Unknown content type: ${contentType}` };
    }

    try {
      setPaymentStatus('building');
      console.log(`[x402] Starting payment for ${contentType}`);
      console.log(`[x402] Amount: ${amountOctas} octas`);
      console.log(`[x402] Recipient: ${recipientAddress}`);

      setPaymentStatus('signing');
      const result = await sendMoveAndWait(recipientAddress, amountOctas, {
        timeoutSecs: 30,
      });

      if (result.success) {
        setPaymentStatus('success');
        console.log(`[x402] Payment successful: ${result.hash}`);
        return { success: true, txHash: result.hash };
      } else {
        setPaymentStatus('failed');
        return { success: false, error: 'Transaction failed on-chain' };
      }
    } catch (err) {
      setPaymentStatus('failed');
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[x402] Payment failed:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [walletAddress, sendMoveAndWait]);

  /**
   * Reset payment status
   */
  const resetStatus = useCallback(() => {
    setPaymentStatus('idle');
  }, []);

  return {
    makePayment,
    paymentStatus,
    resetStatus,
    isLoading,
    error,
    walletAddress,
    config: x402Config,
    networkConfig: movementBedrockConfig,
  };
}

/**
 * Hook for creating Movement wallets (Tier 2 extended chains)
 * 
 * Note: This requires @privy-io/react-auth to be configured with Aptos support.
 * For Movement Bedrock Testnet, Aptos embedded wallets are used as they are
 * compatible with the Movement chain's Move VM.
 * 
 * Usage:
 * ```tsx
 * import { useCreateMovementWallet } from '@/lib/use-privy-movement';
 * 
 * const { createWallet, isCreating, error } = useCreateMovementWallet();
 * 
 * // Create a new wallet
 * const { wallet, user } = await createWallet();
 * ```
 */
export function useCreateMovementWallet() {
  const { user } = usePrivy();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Note: For Tier 2 extended chains like Aptos/Movement, you would use:
  // import { useCreateWallet } from '@privy-io/react-auth/extended-chains';
  // const { createWallet: privyCreateWallet } = useCreateWallet();
  //
  // Then call: await privyCreateWallet({ chainType: 'aptos' });
  //
  // Since Movement uses Aptos SDK, the 'aptos' chain type works.
  // 
  // However, with current Privy config (embeddedWallets.aptos.createOnLogin: 'all-users'),
  // wallets are created automatically on login.

  const createWallet = useCallback(async () => {
    setIsCreating(true);
    setError(null);

    try {
      // For most setups, Aptos wallets are auto-created on login
      // This is a placeholder for explicit wallet creation via extended-chains hook
      
      // If using @privy-io/react-auth/extended-chains:
      // const { createWallet } = useCreateWallet();
      // const result = await createWallet({ chainType: 'aptos' });
      // return result;

      throw new Error(
        'Movement wallet creation is automatic with current configuration. ' +
        'To manually create wallets, configure useCreateWallet from ' +
        '@privy-io/react-auth/extended-chains with chainType: "aptos"'
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createWallet,
    isCreating,
    error,
    user,
  };
}
