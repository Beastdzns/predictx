/**
 * x402 Protocol Types - Monad Testnet Edition
 */

import { x402Config, monadTestnetConfig } from '@/lib/monad-config';

// 402 Payment Required response
export interface PaymentRequiredResponse {
  status: 402;
  message: string;
  payment: {
    amount: string;           // Amount in wei (18 decimals)
    recipient: string;        // Treasury address
    chain_id: number;         // Monad chain ID (10143)
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
  amount: string;             // Amount paid (wei)
  chain_id: number;           // Chain ID
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
  price: string;              // Price in wei
  wallet_address: string;     // User's wallet that should pay
  created_at: Date;
  expires_at: Date;
  paid: boolean;
  tx_hash?: string;
}

// Content types and their prices (in wei, 18 decimals)
export const CONTENT_PRICES: Record<string, string> = {
  market_data:    x402Config.pricing.marketData,     // 0.001 MON
  chart:          x402Config.pricing.charts,          // 0.002 MON
  sentiment:      x402Config.pricing.sentiment,       // 0.003 MON
  orderbook:      x402Config.pricing.orderbook,       // 0.0015 MON
  calculator:     x402Config.pricing.calculator,      // 0.001 MON
  activity:       x402Config.pricing.activity,        // 0.0015 MON
  social_post:    x402Config.pricing.socialPost,      // 0.005 MON
  social_view:    x402Config.pricing.socialView,      // 0.002 MON
  social_comment: x402Config.pricing.socialComment,   // 0.001 MON
};
