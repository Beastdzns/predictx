/**
 * x402 Server-Side Payment using Privy App-Owned Wallet
 * 
 * This module handles x402 micropayments using a Privy app-owned wallet
 * that can be signed server-side without user interaction.
 */

import { movementBedrockConfig } from './movement-bedrock-config';

// App-owned wallet stored in localStorage
const STORAGE_KEY = 'x402-app-wallet';

export interface AppOwnedWallet {
  walletId: string;
  address: string;
  publicKey: string;
}

/**
 * Get the stored app-owned wallet from localStorage
 */
export function getStoredAppWallet(): AppOwnedWallet | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('[x402] Failed to read stored wallet:', e);
  }
  return null;
}

/**
 * Store the app-owned wallet in localStorage
 */
export function storeAppWallet(wallet: AppOwnedWallet): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
    console.log('[x402] App wallet stored');
  } catch (e) {
    console.error('[x402] Failed to store wallet:', e);
  }
}

/**
 * Create a new app-owned wallet via the server
 * This wallet can be signed server-side for x402 payments
 */
export async function createAppWallet(userId: string): Promise<AppOwnedWallet> {
  console.log('[x402] Creating app-owned wallet for user:', userId);
  
  const response = await fetch('/api/movement/sign', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create app wallet');
  }

  const data = await response.json();
  
  if (!data.success || !data.walletId) {
    throw new Error('Invalid response from wallet creation');
  }

  const wallet: AppOwnedWallet = {
    walletId: data.walletId,
    address: data.address,
    publicKey: data.publicKey,
  };

  storeAppWallet(wallet);
  return wallet;
}

/**
 * Get the app wallet balance in MOVE
 */
export async function getAppWalletBalance(address: string): Promise<string> {
  try {
    const response = await fetch(
      `${movementBedrockConfig.rpcUrl}/accounts/${address}/resources`
    );

    if (!response.ok) {
      console.error('[x402] Failed to fetch balance:', response.status);
      return '0';
    }

    const resources = await response.json();
    const coinResource = resources.find(
      (r: { type: string }) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
    );

    if (coinResource) {
      const balanceOctas = BigInt(coinResource.data.coin.value);
      return (Number(balanceOctas) / 1e8).toFixed(8);
    }
    
    return '0';
  } catch (e) {
    console.error('[x402] Error getting balance:', e);
    return '0';
  }
}

/**
 * Send an x402 payment using the app-owned wallet (server-side signing)
 * Returns the transaction hash on success
 */
export async function sendX402Payment(
  recipientAddress: string,
  amountOctas: string
): Promise<string> {
  const wallet = getStoredAppWallet();
  
  if (!wallet) {
    throw new Error('No app wallet configured. Please set up an x402 wallet first.');
  }

  console.log(`[x402] Sending payment: ${amountOctas} octas to ${recipientAddress}`);
  console.log(`[x402] From wallet: ${wallet.address}`);

  const response = await fetch('/api/movement/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      senderAddress: wallet.address,
      recipientAddress,
      amountOctas,
      walletId: wallet.walletId,
      publicKey: wallet.publicKey,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Payment failed');
  }

  const data = await response.json();

  if (!data.success || !data.txHash) {
    throw new Error('Payment transaction failed');
  }

  console.log(`[x402] Payment successful: ${data.txHash}`);
  return data.txHash;
}

/**
 * Check if the app wallet has sufficient balance for a payment
 */
export async function hasEnoughBalance(amountOctas: string): Promise<boolean> {
  const wallet = getStoredAppWallet();
  if (!wallet) return false;

  const balance = await getAppWalletBalance(wallet.address);
  const balanceOctas = BigInt(Math.floor(parseFloat(balance) * 1e8));
  const required = BigInt(amountOctas);
  
  // Include buffer for gas (0.01 MOVE)
  const gasBuffer = BigInt(1000000);
  
  return balanceOctas >= (required + gasBuffer);
}

/**
 * Get the app wallet or throw if not configured
 */
export function requireAppWallet(): AppOwnedWallet {
  const wallet = getStoredAppWallet();
  if (!wallet) {
    throw new Error('x402 wallet not configured. Please set up your payment wallet first.');
  }
  return wallet;
}

/**
 * Check if an app wallet is configured
 */
export function hasAppWallet(): boolean {
  return getStoredAppWallet() !== null;
}
