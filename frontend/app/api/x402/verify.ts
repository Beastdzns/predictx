/**
 * x402 Protocol - Payment Verification
 * 
 * Verifies on-chain payments on Monad Testnet (EVM)
 */

import { monadTestnetConfig, x402Config } from '@/lib/monad-config';
import { PaymentVerification } from './types';

/**
 * Normalize EVM address to lowercase for comparison
 */
function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Wait for transaction receipt with retries
 */
async function waitForReceipt(txHash: string, maxWaitMs: number = 15000): Promise<{ receipt: unknown | null; tx: unknown | null }> {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds
  
  while (Date.now() - startTime < maxWaitMs) {
    // Try to get receipt
    const receiptResponse = await fetch(monadTestnetConfig.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
    });
    const receiptData = await receiptResponse.json();
    
    if (receiptData.result) {
      // Also fetch full tx details
      const txResponse = await fetch(monadTestnetConfig.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [txHash],
          id: 2,
        }),
      });
      const txData = await txResponse.json();
      return { receipt: receiptData.result, tx: txData.result };
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  // Final attempt to at least get the transaction
  const txResponse = await fetch(monadTestnetConfig.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionByHash',
      params: [txHash],
      id: 3,
    }),
  });
  const txData = await txResponse.json();
  return { receipt: null, tx: txData.result };
}

/**
 * Verify a payment transaction on-chain via Monad RPC
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
    console.log(`[x402] Expected amount: ${expectedAmount} wei`);
    
    // Wait for transaction receipt with polling
    const { receipt, tx } = await waitForReceipt(txHash, 15000);
    
    if (!receipt) {
      if (!tx) {
        return { verified: false, error: 'Transaction not found' };
      }
      // Transaction exists but not confirmed within timeout
      // For better UX, we can trust the pending transaction if it looks correct
      const pendingTx = tx as { from: string; to: string; value: string };
      const senderMatch = normalizeAddress(pendingTx.from) === normalizeAddress(expectedSender);
      const recipientMatch = normalizeAddress(pendingTx.to) === normalizeAddress(x402Config.recipientAddress);
      const actualValue = BigInt(pendingTx.value);
      const expectedValue = BigInt(expectedAmount);
      const amountOk = actualValue >= expectedValue;
      
      if (senderMatch && recipientMatch && amountOk) {
        console.log(`[x402] Transaction pending but looks valid, allowing...`);
        return { 
          verified: true, 
          tx_hash: txHash,
          sender: pendingTx.from,
          amount: actualValue.toString(),
        };
      }
      return { verified: false, error: 'Transaction pending and details do not match' };
    }

    const receiptTyped = receipt as { status: string; from?: string; to?: string };
    
    // Check if transaction succeeded (status 0x1)
    if (receiptTyped.status !== '0x1') {
      return { verified: false, error: 'Transaction failed on-chain' };
    }

    // Use transaction details for verification
    const txTyped = tx as { from: string; to: string; value: string } | null;
    if (!txTyped) {
      return { verified: false, error: 'Could not fetch transaction details' };
    }

    console.log(`[x402] TX From: ${txTyped.from}`);
    console.log(`[x402] TX To: ${txTyped.to}`);
    console.log(`[x402] TX Value: ${txTyped.value}`);

    // Verify recipient is our treasury
    const treasuryAddress = x402Config.recipientAddress;
    if (normalizeAddress(txTyped.to) !== normalizeAddress(treasuryAddress)) {
      return { 
        verified: false, 
        error: `Wrong recipient: ${txTyped.to}, expected: ${treasuryAddress}` 
      };
    }

    // Verify sender matches
    if (normalizeAddress(txTyped.from) !== normalizeAddress(expectedSender)) {
      return { 
        verified: false, 
        error: `Wrong sender: ${txTyped.from}, expected: ${expectedSender}` 
      };
    }

    // Verify amount (should be >= expected)
    const paidAmount = BigInt(txTyped.value);
    const requiredAmount = BigInt(expectedAmount);
    if (paidAmount < requiredAmount) {
      return { 
        verified: false, 
        error: `Insufficient payment: ${paidAmount.toString()}, expected: ${expectedAmount}` 
      };
    }

    console.log(`[x402] Payment verified: ${txHash}`);
    
    return {
      verified: true,
      tx_hash: txHash,
      sender: txTyped.from,
      amount: paidAmount.toString(),
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
    // First check receipt
    const receiptResponse = await fetch(monadTestnetConfig.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
    });

    const receiptData = await receiptResponse.json();
    
    if (receiptData.result) {
      return receiptData.result.status === '0x1' ? 'success' : 'failed';
    }

    // No receipt, check if tx exists (pending)
    const txResponse = await fetch(monadTestnetConfig.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 2,
      }),
    });

    const txData = await txResponse.json();
    
    if (txData.result) {
      return 'pending';
    }

    return 'not_found';
  } catch {
    return 'not_found';
  }
}
