/**
 * x402 Protocol Types
 */

// 402 Payment Required response
export interface PaymentRequiredResponse {
  status: 402;
  message: string;
  payment: {
    amount: string;           // Amount in octas
    recipient: string;        // Treasury address
    chain_id: number;         // Movement chain ID
    network: string;          // Network name
  };
  job_id: string;             // Unique job/request ID
  expires_at: string;         // ISO timestamp
  timeout_seconds: number;    // Seconds until expiry
}

// X-PAYMENT header payload
export interface XPaymentHeader {
  tx_hash: string;            // Transaction hash proving payment
  sender: string;             // Sender wallet address
  amount: string;             // Amount paid (octas)
  job_id: string;             // Job ID from 402 response
  timestamp: number;          // Unix timestamp
}

// Payment verification result
export interface PaymentVerification {
  verified: boolean;
  tx_hash?: string;
  sender?: string;
  amount?: string;
  error?: string;
}

// Pending job stored in memory
export interface PendingJob {
  job_id: string;
  content_type: string;       // 'market_data', 'chart', 'sentiment', etc.
  content_id: string;         // Market ID or other identifier
  price: string;              // Price in octas
  wallet_address: string;     // User's wallet that should pay
  created_at: Date;
  expires_at: Date;
  paid: boolean;
  tx_hash?: string;
}

// Content types and their prices
export const CONTENT_PRICES: Record<string, string> = {
  market_data: '100000',      // 0.001 MOVE
  chart: '200000',            // 0.002 MOVE
  sentiment: '300000',        // 0.003 MOVE
  orderbook: '150000',        // 0.0015 MOVE
  calculator: '100000',       // 0.001 MOVE
  activity: '150000',         // 0.0015 MOVE
  social_post: '500000',      // 0.005 MOVE
  social_view: '200000',      // 0.002 MOVE
  social_comment: '100000',   // 0.001 MOVE
};
