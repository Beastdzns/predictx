/**
 * x402 Fetch Client
 * 
 * A fetch wrapper that handles the x402 payment protocol:
 * 1. Makes initial request
 * 2. If 402 received, sends payment
 * 3. Retries with X-PAYMENT header
 */

import { sendX402Payment, getStoredAppWallet } from './x402-server-payment';

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
    amount: string;
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
 */
export async function x402Fetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<X402Response<T>> {
  const wallet = getStoredAppWallet();
  
  if (!wallet) {
    return {
      success: false,
      error: 'No payment wallet configured. Please set up your x402 wallet first.',
    };
  }

  // Add wallet address header
  const headers = new Headers(options?.headers);
  headers.set('x-wallet-address', wallet.address);
  headers.set('Content-Type', 'application/json');

  try {
    // First request - may return 402
    console.log(`[x402] Fetching: ${url}`);
    const response = await fetch(url, { ...options, headers });

    // If not 402, return response directly
    if (response.status !== 402) {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        return { success: false, error: error.error || `HTTP ${response.status}` };
      }
      const data = await response.json();
      return { success: true, data, paid: false };
    }

    // Handle 402 Payment Required
    console.log(`[x402] Received 402 Payment Required`);
    const paymentRequired: PaymentRequired = await response.json();
    
    console.log(`[x402] Payment details:`, paymentRequired);
    console.log(`[x402] Amount: ${paymentRequired.payment.amount} octas`);
    console.log(`[x402] Job ID: ${paymentRequired.job_id}`);

    // Send payment
    console.log(`[x402] Sending payment...`);
    const txHash = await sendX402Payment(
      paymentRequired.payment.recipient,
      paymentRequired.payment.amount
    );
    console.log(`[x402] Payment sent: ${txHash}`);

    // Create X-PAYMENT header
    const xPayment = {
      tx_hash: txHash,
      sender: wallet.address,
      amount: paymentRequired.payment.amount,
      job_id: paymentRequired.job_id,
      timestamp: Date.now(),
    };

    // Retry with X-PAYMENT header
    console.log(`[x402] Retrying with X-PAYMENT header...`);
    headers.set('x-payment', JSON.stringify(xPayment));

    const retryResponse = await fetch(url, { ...options, headers });

    if (!retryResponse.ok) {
      const error = await retryResponse.json().catch(() => ({ error: 'Payment verification failed' }));
      console.log('[x402] Retry failed:', error);
      return { 
        success: false, 
        error: error.details || error.error || 'Payment verification failed',
        tx_hash: txHash,
        paid: true,
      };
    }

    const data = await retryResponse.json();
    return { 
      success: true, 
      data,
      tx_hash: txHash,
      paid: true,
    };

  } catch (error) {
    console.error('[x402] Fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convenience methods for specific content types
 */
export const x402 = {
  /**
   * Fetch market data
   */
  async getMarketData(marketId: string) {
    return x402Fetch(`/api/x402/content/market_data/${marketId}`);
  },

  /**
   * Fetch chart data
   */
  async getChartData(marketId: string) {
    return x402Fetch(`/api/x402/content/chart/${marketId}`);
  },

  /**
   * Fetch sentiment analysis
   */
  async getSentiment(marketId: string) {
    return x402Fetch(`/api/x402/content/sentiment/${marketId}`);
  },

  /**
   * Fetch orderbook data
   */
  async getOrderbook(marketId: string) {
    return x402Fetch(`/api/x402/content/orderbook/${marketId}`);
  },

  /**
   * Fetch recent activity
   */
  async getActivity(marketId: string) {
    return x402Fetch(`/api/x402/content/activity/${marketId}`);
  },
};
