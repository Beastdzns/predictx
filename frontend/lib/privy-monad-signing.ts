/**
 * Privy Monad Chain Signing Utilities
 *
 * Sends EVM transactions on Monad Testnet using Privy embedded wallets.
 * Uses viem instead of Aptos SDK.
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, custom } from 'viem';
import { monadTestnet, monadTestnetConfig } from './monad-config';

// Public client for reading chain state
export const monadPublicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(monadTestnetConfig.rpcUrl),
});

/**
 * Send MON via an EIP-1193 provider (e.g. Privy's EVM wallet)
 */
export async function sendMonPayment(
    provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> },
    senderAddress: `0x${string}`,
    recipientAddress: `0x${string}`,
    amountWei: bigint
): Promise<`0x${string}`> {
    const walletClient = createWalletClient({
        account: senderAddress,
        chain: monadTestnet,
        transport: custom(provider),
    });

    const txHash = await walletClient.sendTransaction({
        to: recipientAddress,
        value: amountWei,
        account: senderAddress,
        chain: monadTestnet,
    });

    console.log(`[Privy-Monad] Transaction submitted: ${txHash}`);
    return txHash;
}

/**
 * Wait for a transaction to be mined and return success status
 */
export async function waitForMonTransaction(
    txHash: `0x${string}`,
    timeoutMs: number = 30000
): Promise<{ success: boolean; hash: `0x${string}` }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            const receipt = await monadPublicClient.getTransactionReceipt({ hash: txHash });
            if (receipt) {
                const success = receipt.status === 'success';
                console.log(`[Privy-Monad] Transaction ${success ? 'confirmed' : 'failed'}: ${txHash}`);
                return { success, hash: txHash };
            }
        } catch {
            // Not mined yet, wait and retry
        }
        await new Promise((r) => setTimeout(r, 2000));
    }

    console.error(`[Privy-Monad] Timeout waiting for: ${txHash}`);
    return { success: false, hash: txHash };
}

/**
 * Verify a submitted transaction by checking its receipt
 */
export async function verifyMonTransaction(txHash: `0x${string}`): Promise<{
    success: boolean;
    hash: `0x${string}`;
    from?: `0x${string}`;
    to?: `0x${string}` | null;
}> {
    try {
        const receipt = await monadPublicClient.getTransactionReceipt({ hash: txHash });
        return {
            success: receipt.status === 'success',
            hash: receipt.transactionHash,
            from: receipt.from,
            to: receipt.to,
        };
    } catch (error) {
        console.error('[Privy-Monad] Failed to verify transaction:', error);
        return { success: false, hash: txHash };
    }
}

/**
 * Get MON balance for an address
 */
export async function getMonBalance(address: `0x${string}`): Promise<{
    balanceWei: bigint;
    balanceMon: string;
}> {
    try {
        const balanceWei = await monadPublicClient.getBalance({ address });
        return {
            balanceWei,
            balanceMon: formatEther(balanceWei),
        };
    } catch (error) {
        console.error('[Privy-Monad] Failed to get balance:', error);
        return { balanceWei: BigInt(0), balanceMon: '0' };
    }
}
