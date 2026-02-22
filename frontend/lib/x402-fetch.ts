/**
 * x402 Fetch Client — Monad EVM Edition
 *
 * Handles the x402 payment protocol:
 * 1. Makes initial request
 * 2. If 402 received, sends MON payment via Privy EVM wallet
 * 3. Retries with X-PAYMENT header
 */

import { monadTestnetConfig } from './monad-config';

export interface X402Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  tx_hash?: string;
  paid?: boolean;
}

export interface PaymentRequired {
  status: 402;
  message: string;
  payment: {
    amount: string;  // in wei (18 decimals)
    recipient: string;
    chain_id: number;
    network: string;
  };
  job_id: string;
  expires_at: string;
  timeout_seconds: number;
}

/**
 * Fetch with automatic x402 payment handling
 * @param url - API endpoint
 * @param sendPayment - function that sends the MON payment and returns txHash
 * @param walletAddress - sender's EVM address
 * @param options - fetch options
 */
export async function x402Fetch<T = unknown>(
  url: string,
  sendPayment: (recipient: `0x${string}`, amountWei: bigint) => Promise<string>,
  walletAddress: string,
  options?: RequestInit
): Promise<X402Response<T>> {
  const headers = new Headers(options?.headers);
  headers.set('x-wallet-address', walletAddress);
  headers.set('Content-Type', 'application/json');

  try {
    console.log(`[x402] Fetching: ${url}`);
    const response = await fetch(url, { ...options, headers });

    if (response.status !== 402) {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        return { success: false, error: error.error || `HTTP ${response.status}` };
      }
      const data = await response.json();
      return { success: true, data, paid: false };
    }

    // Handle 402 Payment Required
    console.log(`[x402-fetch] Received 402 Payment Required`);
    const paymentRequired: PaymentRequired = await response.json();
    console.log(`[x402-fetch] Raw 402 response:`, JSON.stringify(paymentRequired, null, 2));
    console.log(`[x402-fetch] Amount: ${paymentRequired.payment.amount} wei | Job: ${paymentRequired.job_id}`);
    const recipient = paymentRequired.payment.recipient;
    console.log(`[x402-fetch] Recipient from 402: "${recipient}" (length: ${recipient?.length || 0})`);

    // Validate recipient is a proper 40-char EVM address (0x + 40 hex chars = 42 total)
    if (!recipient || typeof recipient !== 'string') {
      console.error(`[x402-fetch] FATAL: recipient is not a string:`, recipient);
      return { success: false, error: 'Server returned invalid recipient address (not a string)' };
    }
    if (recipient.length !== 42) {
      console.error(`[x402-fetch] FATAL: Invalid recipient address length: ${recipient.length}, expected 42`);
      console.error(`[x402-fetch] FATAL: Bad recipient value: "${recipient}"`);
      return { success: false, error: `Server returned invalid recipient address (${recipient.length} chars, expected 42)` };
    }
    if (!recipient.startsWith('0x')) {
      console.error(`[x402-fetch] FATAL: Recipient does not start with 0x: ${recipient}`);
      return { success: false, error: 'Server returned invalid recipient address (no 0x prefix)' };
    }

    // Send MON payment via wallet
    console.log(`[x402-fetch] About to send payment to: "${recipient}"`);
    const txHash = await sendPayment(
      recipient as `0x${string}`,
      BigInt(paymentRequired.payment.amount)
    );
    console.log(`[x402-fetch] Payment sent: ${txHash}`);

    // Build X-PAYMENT header
    const xPayment = {
      tx_hash: txHash,
      sender: walletAddress,
      amount: paymentRequired.payment.amount,
      chain_id: monadTestnetConfig.chainId,
      job_id: paymentRequired.job_id,
      timestamp: Date.now(),
    };

    headers.set('x-payment', JSON.stringify(xPayment));

    // Retry with payment proof
    console.log(`[x402] Retrying with X-PAYMENT header...`);
    const retryResponse = await fetch(url, { ...options, headers });

    if (!retryResponse.ok) {
      const error = await retryResponse.json().catch(() => ({ error: 'Payment verification failed' }));
      return {
        success: false,
        error: error.details || error.error || 'Payment verification failed',
        tx_hash: txHash,
        paid: true,
      };
    }

    const data = await retryResponse.json();
    return { success: true, data, tx_hash: txHash, paid: true };
  } catch (error) {
    console.error('[x402] Fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convenience namespace for typed content requests
 */
export const x402 = {
  async getMarketData(marketId: string, sendPayment: Parameters<typeof x402Fetch>[1], walletAddress: string) {
    return x402Fetch(`/api/x402/content/market_data/${marketId}`, sendPayment, walletAddress);
  },
  async getChartData(marketId: string, sendPayment: Parameters<typeof x402Fetch>[1], walletAddress: string) {
    return x402Fetch(`/api/x402/content/chart/${marketId}`, sendPayment, walletAddress);
  },
  async getSentiment(marketId: string, sendPayment: Parameters<typeof x402Fetch>[1], walletAddress: string) {
    return x402Fetch(`/api/x402/content/sentiment/${marketId}`, sendPayment, walletAddress);
  },
  async getOrderbook(marketId: string, sendPayment: Parameters<typeof x402Fetch>[1], walletAddress: string) {
    return x402Fetch(`/api/x402/content/orderbook/${marketId}`, sendPayment, walletAddress);
  },
  async getActivity(marketId: string, sendPayment: Parameters<typeof x402Fetch>[1], walletAddress: string) {
    return x402Fetch(`/api/x402/content/activity/${marketId}`, sendPayment, walletAddress);
  },
};
