/**
 * x402 EVM Payment Utilities for Monad Testnet
 * Replaces x402-move-payment.ts — uses viem instead of Aptos SDK
 */

import { monadTestnetConfig, x402Config } from './monad-config';
import { sendMonPayment, waitForMonTransaction } from './privy-monad-signing';

/**
 * Send a MON payment as an x402 unlock
 * @param provider - EIP-1193 provider from Privy embedded wallet
 * @param senderAddress - User's EVM address
 * @param contentType - Type of content being unlocked
 */
export async function sendUnlockPayment(
    provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> },
    senderAddress: `0x${string}`,
    contentType: keyof typeof x402Config.pricing,
    options?: { customRecipient?: `0x${string}`; customAmount?: string }
): Promise<string> {
    const recipient = (options?.customRecipient || x402Config.recipientAddress) as `0x${string}`;
    const amountWei = BigInt(options?.customAmount || x402Config.pricing[contentType]);

    console.log(`[x402] Unlocking "${contentType}": ${amountWei} wei to ${recipient}`);

    const txHash = await sendMonPayment(provider, senderAddress, recipient, amountWei);
    console.log(`[x402] Payment submitted: ${txHash}`);
    return txHash;
}

/**
 * Full orchestration: pay and wait for confirmation
 */
export async function payAndUnlock(
    provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> },
    senderAddress: `0x${string}`,
    contentType: keyof typeof x402Config.pricing
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
        const txHash = await sendUnlockPayment(provider, senderAddress, contentType);
        const result = await waitForMonTransaction(txHash as `0x${string}`);
        if (result.success) {
            return { success: true, txHash };
        }
        return { success: false, error: 'Transaction failed on-chain', txHash };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[x402] payAndUnlock failed:', msg);
        return { success: false, error: msg };
    }
}

/**
 * Create payment data for X-PAYMENT header
 */
export function createPaymentData(
    txHash: string,
    sender: string,
    amount: string,
    chainId: number = monadTestnetConfig.chainId
) {
    return { tx_hash: txHash, sender, amount, chainId };
}
