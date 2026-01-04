/**
 * x402 Protocol - Payment Verification
 * 
 * Verifies on-chain payments on Movement Bedrock Testnet
 */

import { movementBedrockConfig } from '@/lib/movement-bedrock-config';
import { PaymentVerification } from './types';

const TREASURY_ADDRESS = '0x1c3aee2b139c069bac975c7f87c4dce8143285f1ec7df2889f5ae1c08ae1ba53';

/**
 * Normalize Aptos/Movement address to standard 64-char format (without 0x)
 * Addresses are 32 bytes = 64 hex chars, but leading zeros may be dropped
 */
function normalizeAddress(address: string): string {
  // Remove 0x prefix
  let hex = address.startsWith('0x') ? address.slice(2) : address;
  // Pad to 64 characters
  hex = hex.padStart(64, '0');
  return hex.toLowerCase();
}

/**
 * Verify a payment transaction on-chain
 */
export async function verifyPaymentOnChain(
  txHash: string,
  expectedSender: string,
  expectedAmount: string,
  maxAgeSeconds: number = 300 // 5 minutes
): Promise<PaymentVerification> {
  try {
    console.log(`[x402] Verifying payment: ${txHash}`);
    console.log(`[x402] Expected sender: ${expectedSender}`);
    console.log(`[x402] Expected amount: ${expectedAmount}`);
    
    // Fetch transaction from Movement RPC
    const response = await fetch(
      `${movementBedrockConfig.rpcUrl}/transactions/by_hash/${txHash}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { verified: false, error: 'Transaction not found' };
      }
      return { verified: false, error: `RPC error: ${response.status}` };
    }

    const tx = await response.json();
    console.log(`[x402] Transaction data:`, JSON.stringify(tx, null, 2).slice(0, 500));
    
    // Check if transaction is successful
    if (!tx.success) {
      return { verified: false, error: 'Transaction failed on-chain' };
    }

    // Check transaction type (should be aptos_account::transfer)
    const payload = tx.payload;
    console.log(`[x402] Payload function:`, payload?.function);
    
    if (!payload || payload.function !== '0x1::aptos_account::transfer') {
      return { verified: false, error: `Invalid transaction type: ${payload?.function}` };
    }

    // Extract sender, recipient, amount
    const sender = tx.sender;
    const recipient = payload.arguments?.[0];
    const amount = payload.arguments?.[1];
    
    console.log(`[x402] TX Sender: ${sender}`);
    console.log(`[x402] TX Recipient: ${recipient}`);
    console.log(`[x402] TX Amount: ${amount}`);

    // Verify recipient is our treasury (normalize addresses for comparison)
    const normalizedRecipient = normalizeAddress(recipient);
    const normalizedTreasury = normalizeAddress(TREASURY_ADDRESS);
    
    if (normalizedRecipient !== normalizedTreasury) {
      return { 
        verified: false, 
        error: `Wrong recipient: ${recipient}, expected: ${TREASURY_ADDRESS}` 
      };
    }

    // Verify sender matches (normalize addresses)
    const normalizedSender = normalizeAddress(sender);
    const normalizedExpected = normalizeAddress(expectedSender);
    
    console.log(`[x402] Normalized sender: ${normalizedSender}`);
    console.log(`[x402] Normalized expected: ${normalizedExpected}`);
    
    if (normalizedSender !== normalizedExpected) {
      return { 
        verified: false, 
        error: `Wrong sender: ${sender}, expected: ${expectedSender}` 
      };
    }

    // Verify amount (should be >= expected)
    const paidAmount = BigInt(amount);
    const requiredAmount = BigInt(expectedAmount);
    if (paidAmount < requiredAmount) {
      return { 
        verified: false, 
        error: `Insufficient payment: ${amount}, expected: ${expectedAmount}` 
      };
    }

    // Check transaction age (timestamp is in microseconds)
    const txTimestamp = Math.floor(parseInt(tx.timestamp) / 1000000);
    const now = Math.floor(Date.now() / 1000);
    const age = now - txTimestamp;
    
    console.log(`[x402] TX age: ${age}s (max: ${maxAgeSeconds}s)`);
    
    if (age > maxAgeSeconds) {
      return { 
        verified: false, 
        error: `Transaction too old: ${age}s, max: ${maxAgeSeconds}s` 
      };
    }

    console.log(`[x402] Payment verified: ${txHash}`);
    
    return {
      verified: true,
      tx_hash: txHash,
      sender: sender,
      amount: amount,
    };

  } catch (error) {
    console.error('[x402] Verification error:', error);
    return { 
      verified: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if a transaction exists and is pending/confirmed
 */
export async function checkTransactionStatus(txHash: string): Promise<'pending' | 'success' | 'failed' | 'not_found'> {
  try {
    const response = await fetch(
      `${movementBedrockConfig.rpcUrl}/transactions/by_hash/${txHash}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return 'not_found';
      }
      return 'not_found';
    }

    const tx = await response.json();
    
    if (tx.type === 'pending_transaction') {
      return 'pending';
    }
    
    return tx.success ? 'success' : 'failed';
  } catch {
    return 'not_found';
  }
}
