/**
 * x402 Payment Module for Monad Testnet
 * 
 * Uses Privy embedded EVM wallet for micropayments.
 * No server-side signing needed - all transactions signed client-side.
 */

import { createPublicClient, http, formatEther, parseEther } from 'viem';
import { monadTestnet, monadTestnetConfig, x402Config } from './monad-config';

// Store the send function from Privy's useSendTransaction hook
// This allows headless signing without approval popups
type SendTransactionFn = (params: { to: `0x${string}`; value: bigint; chainId: number }) => Promise<{ transactionHash: `0x${string}` }>;

let x402SendTransaction: SendTransactionFn | null = null;
let x402WalletAddress: `0x${string}` | null = null;

export interface X402WalletInfo {
  address: string;
  balance: string;
}

/**
 * Set the x402 wallet with a sendTransaction function for headless signing
 * Call this from your React component with the sendTransaction from useSendTransaction hook
 */
export function setX402Wallet(
  sendTransaction: SendTransactionFn,
  address: `0x${string}`
): void {
  x402SendTransaction = sendTransaction;
  x402WalletAddress = address;
  console.log('[x402] Wallet configured with headless sendTransaction:', address);
}

/**
 * Clear the x402 wallet (on logout)
 */
export function clearX402Wallet(): void {
  x402SendTransaction = null;
  x402WalletAddress = null;
  console.log('[x402] Wallet cleared');
}

/**
 * Check if x402 wallet is configured
 */
export function hasAppWallet(): boolean {
  const hasWallet = typeof x402SendTransaction === 'function' && x402WalletAddress !== null;
  console.log('[x402] hasAppWallet check:', { 
    hasWallet, 
    address: x402WalletAddress,
    hasSendFn: typeof x402SendTransaction === 'function'
  });
  return hasWallet;
}

/**
 * Get the x402 wallet address
 */
export function getX402Address(): string | null {
  return x402WalletAddress;
}

/**
 * Get the stored app wallet (compatibility function)
 */
export function getStoredAppWallet(): X402WalletInfo | null {
  if (!x402WalletAddress) return null;
  return {
    address: x402WalletAddress,
    balance: '0', // Balance fetched separately
  };
}

/**
 * Get wallet balance in MON
 */
export async function getAppWalletBalance(address?: string): Promise<string> {
  const addr = address || x402WalletAddress;
  if (!addr) return '0';

  try {
    const publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(monadTestnetConfig.rpcUrl),
    });

    const balanceWei = await publicClient.getBalance({ address: addr as `0x${string}` });
    return formatEther(balanceWei);
  } catch (e) {
    console.error('[x402] Error getting balance:', e);
    return '0';
  }
}

/**
 * Send an x402 payment using the Privy embedded wallet
 * Tries wallet.sendTransaction() first (bypasses unified wallet check),
 * falls back to viem walletClient if not available.
 * Returns the transaction hash on success
 */
export async function sendX402Payment(
  recipientAddress: string,
  amountWei: string
): Promise<string> {
  if (!x402SendTransaction || !x402WalletAddress) {
    throw new Error('No x402 wallet configured. Please connect your wallet first.');
  }

  console.log(`[x402-server-payment] Sending payment: ${amountWei} wei`);
  console.log(`[x402-server-payment] Recipient: "${recipientAddress}" (length: ${recipientAddress?.length || 0})`);
  console.log(`[x402-server-payment] From wallet: "${x402WalletAddress}" (length: ${x402WalletAddress?.length || 0})`);
  
  // CRITICAL: Validate both addresses before building transaction
  if (!recipientAddress || recipientAddress.length !== 42) {
    throw new Error(`Invalid recipient address: "${recipientAddress}" (length: ${recipientAddress?.length || 0}, expected 42)`);
  }
  if (!x402WalletAddress || x402WalletAddress.length !== 42) {
    throw new Error(`Invalid sender address: "${x402WalletAddress}" (length: ${x402WalletAddress?.length || 0}, expected 42)`);
  }
  
  // Validate sendTransaction function is available
  if (!x402SendTransaction || typeof x402SendTransaction !== 'function') {
    throw new Error('x402 wallet not configured. Please ensure you are authenticated with Privy and your wallet is ready.');
  }

  try {
    console.log(`[x402-server-payment] Using headless sendTransaction...`);
    
    // Use the stored sendTransaction function from useSendTransaction hook
    // This signs headlessly without showing approval UI
    const result = await x402SendTransaction({
      to: recipientAddress as `0x${string}`,
      value: BigInt(amountWei),
      chainId: monadTestnetConfig.chainId,
    });
    
    console.log(`[x402] Payment successful (headless): ${result.transactionHash}`);
    return result.transactionHash;
  } catch (e) {
    console.error('[x402] Payment failed:', e);
    throw new Error(e instanceof Error ? e.message : 'Payment failed');
  }
}

/**
 * Check if the wallet has sufficient balance for a payment
 */
export async function hasEnoughBalance(amountWei: string): Promise<boolean> {
  if (!x402WalletAddress) return false;

  const balance = await getAppWalletBalance();
  const balanceWei = parseEther(balance);
  const required = BigInt(amountWei);

  // Include buffer for gas (0.001 MON)
  const gasBuffer = parseEther('0.001');

  return balanceWei >= (required + gasBuffer);
}

/**
 * Require wallet to be configured (throws if not)
 */
export function requireAppWallet(): X402WalletInfo {
  if (!x402WalletAddress) {
    throw new Error('x402 wallet not configured. Please connect your wallet first.');
  }
  return {
    address: x402WalletAddress,
    balance: '0',
  };
}
