'use client';

/**
 * React Hooks for Privy Monad EVM Wallet Integration
 * Replaces use-privy-movement.ts — uses viem + EIP-1193 provider
 */

import { useState, useCallback, useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { getMonBalance, sendMonPayment, waitForMonTransaction, verifyMonTransaction } from './privy-monad-signing';
import { x402Config, monadTestnetConfig } from './monad-config';
import { payAndUnlock } from './x402-evm-payment';

/**
 * Hook to get the Privy EVM embedded wallet on Monad
 */
export function useMonadWallet() {
    const { wallets } = useWallets();
    const { ready, authenticated } = usePrivy();

    const monadWallet = useMemo(() => {
        if (!wallets || wallets.length === 0) return null;
        // Find Privy embedded wallet - it has walletClientType = 'privy'
        // For EVM wallets, address starts with 0x
        const privyWallet = wallets.find((w) => {
            const wallet = w as unknown as Record<string, unknown>;
            const isPrivyWallet = wallet.walletClientType === 'privy';
            const isEvmWallet = typeof w.address === 'string' && w.address.startsWith('0x');
            return isPrivyWallet && isEvmWallet;
        });
        
        if (privyWallet) {
            console.log('[Monad] Found Privy EVM wallet:', privyWallet.address);
        } else {
            console.log('[Monad] No Privy EVM wallet found. Available wallets:', 
                wallets.map(w => ({ address: w.address, type: (w as any).walletClientType })));
        }
        
        return privyWallet || null;
    }, [wallets]);

    const address = (monadWallet?.address || null) as `0x${string}` | null;

    /**
     * Switch wallet to Monad testnet chain
     */
    const switchToMonad = useCallback(async () => {
        if (!monadWallet) return;
        try {
            // @ts-expect-error - switchChain exists on Privy EVM wallets
            await monadWallet.switchChain(monadTestnetConfig.chainId);
        } catch (e) {
            console.error('[Monad] Failed to switch chain:', e);
        }
    }, [monadWallet]);

    /**
     * Get EIP-1193 provider from Privy wallet
     */
    const getProvider = useCallback(async () => {
        if (!monadWallet) throw new Error('No Monad wallet connected');
        // @ts-expect-error - getEthereumProvider exists on Privy EVM wallets
        return monadWallet.getEthereumProvider() as Promise<{
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        }>;
    }, [monadWallet]);

    return {
        wallet: monadWallet,
        address,
        isReady: ready,
        isAuthenticated: authenticated,
        hasWallet: !!monadWallet && authenticated,
        switchToMonad,
        getProvider,
    };
}

/**
 * Hook for sending MON transactions
 */
export function useMonadTransaction() {
    const { address, hasWallet, getProvider, switchToMonad } = useMonadWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastTxHash, setLastTxHash] = useState<string | null>(null);

    const sendMon = useCallback(
        async (recipientAddress: `0x${string}`, amountWei: bigint): Promise<string> => {
            if (!address) throw new Error('No Monad wallet connected');
            setIsLoading(true);
            setError(null);
            try {
                await switchToMonad();
                const provider = await getProvider();
                const txHash = await sendMonPayment(provider, address, recipientAddress, amountWei);
                setLastTxHash(txHash);
                return txHash;
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [address, getProvider, switchToMonad]
    );

    const sendMonAndWait = useCallback(
        async (recipientAddress: `0x${string}`, amountWei: bigint) => {
            const txHash = await sendMon(recipientAddress, amountWei);
            return waitForMonTransaction(txHash as `0x${string}`);
        },
        [sendMon]
    );

    const verify = useCallback(
        (txHash: `0x${string}`) => verifyMonTransaction(txHash),
        []
    );

    const getBalance = useCallback(async () => {
        if (!address) return null;
        return getMonBalance(address);
    }, [address]);

    return {
        sendMon,
        sendMonAndWait,
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
 * Hook for x402 micropayments on Monad
 */
export function useX402MonPayment() {
    const { address, getProvider, switchToMonad } = useMonadWallet();
    const [paymentStatus, setPaymentStatus] = useState<
        'idle' | 'building' | 'signing' | 'confirming' | 'success' | 'failed'
    >('idle');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const makePayment = useCallback(
        async (
            contentType: keyof typeof x402Config.pricing,
            options?: { customRecipient?: `0x${string}`; customAmount?: string }
        ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
            if (!address) return { success: false, error: 'No wallet connected' };

            setIsLoading(true);
            setError(null);
            setPaymentStatus('building');

            try {
                await switchToMonad();
                const provider = await getProvider();

                setPaymentStatus('signing');
                const result = await payAndUnlock(provider, address, contentType);

                if (result.success) {
                    setPaymentStatus('success');
                    return result;
                } else {
                    setPaymentStatus('failed');
                    setError(result.error || 'Payment failed');
                    return result;
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setPaymentStatus('failed');
                setError(msg);
                return { success: false, error: msg };
            } finally {
                setIsLoading(false);
            }
        },
        [address, getProvider, switchToMonad]
    );

    const resetStatus = useCallback(() => {
        setPaymentStatus('idle');
        setError(null);
    }, []);

    return {
        makePayment,
        paymentStatus,
        resetStatus,
        isLoading,
        error,
        walletAddress: address,
        config: x402Config,
        networkConfig: monadTestnetConfig,
    };
}
