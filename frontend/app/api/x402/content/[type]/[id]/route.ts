/**
 * x402 Protocol - Content Endpoint
 * 
 * This endpoint demonstrates the full x402 flow:
 * 1. Request without payment → 402 Payment Required
 * 2. Request with X-PAYMENT header → Verify payment, return content
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaymentRequiredResponse, CONTENT_PRICES } from '../../../types';
import type { XPaymentHeader } from '../../../types';
import { createPendingJob, getPendingJob, markJobPaid, findPaidJob } from '../../../store';
import { verifyPaymentOnChain } from '../../../verify';
import { movementBedrockConfig, x402Config } from '@/lib/movement-bedrock-config';

const JOB_TIMEOUT_SECONDS = 300;

/**
 * GET /api/x402/content/[type]/[id]
 * 
 * Returns 402 Payment Required unless valid X-PAYMENT header is provided
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type: contentType, id: contentId } = await params;
  const walletAddress = request.headers.get('x-wallet-address') || '';
  const xPaymentHeader = request.headers.get('x-payment');

  console.log(`[x402] Request for ${contentType}/${contentId}`);
  console.log(`[x402] Wallet: ${walletAddress}`);
  console.log(`[x402] X-PAYMENT: ${xPaymentHeader ? 'present' : 'missing'}`);

  // Validate content type
  if (!CONTENT_PRICES[contentType]) {
    return NextResponse.json(
      { error: `Unknown content type: ${contentType}` },
      { status: 400 }
    );
  }

  // Validate wallet address
  if (!walletAddress || !walletAddress.startsWith('0x')) {
    return NextResponse.json(
      { error: 'Missing or invalid x-wallet-address header' },
      { status: 400 }
    );
  }

  // Check if already paid
  const existingPaid = findPaidJob(contentType, contentId, walletAddress);
  if (existingPaid) {
    console.log(`[x402] Found existing paid job: ${existingPaid.job_id}`);
    return returnContent(contentType, contentId);
  }

  // If no X-PAYMENT header, return 402
  if (!xPaymentHeader) {
    return return402(contentType, contentId, walletAddress);
  }

  // Parse X-PAYMENT header
  let payment: XPaymentHeader;
  try {
    payment = JSON.parse(xPaymentHeader);
  } catch {
    return NextResponse.json(
      { error: 'Invalid X-PAYMENT header format' },
      { status: 400 }
    );
  }

  // Get the pending job
  const job = getPendingJob(payment.job_id);
  if (!job) {
    console.log(`[x402] Job not found or expired: ${payment.job_id}`);
    // Job expired, create new one
    return return402(contentType, contentId, walletAddress);
  }

  // Verify payment on-chain
  console.log(`[x402] Verifying payment for job ${job.job_id}`);
  console.log(`[x402] TX Hash: ${payment.tx_hash}`);
  console.log(`[x402] Wallet: ${walletAddress}`);
  console.log(`[x402] Price: ${job.price}`);
  
  const verification = await verifyPaymentOnChain(
    payment.tx_hash,
    walletAddress,
    job.price
  );

  if (!verification.verified) {
    console.log(`[x402] Payment verification failed: ${verification.error}`);
    return NextResponse.json(
      { 
        error: 'Payment verification failed',
        details: verification.error,
        tx_hash: payment.tx_hash,
      },
      { status: 402 }
    );
  }

  // Mark job as paid
  markJobPaid(job.job_id, payment.tx_hash);

  console.log(`[x402] Payment verified! Returning content.`);

  // Return the content
  return returnContent(contentType, contentId);
}

/**
 * Return 402 Payment Required response
 */
function return402(
  contentType: string,
  contentId: string,
  walletAddress: string
): NextResponse {
  // Create pending job
  const job = createPendingJob(contentType, contentId, walletAddress);

  const response: PaymentRequiredResponse = {
    status: 402,
    message: 'Payment Required',
    payment: {
      amount: job.price,
      recipient: x402Config.recipientAddress,
      chain_id: movementBedrockConfig.chainId,
      network: movementBedrockConfig.name,
    },
    job_id: job.job_id,
    expires_at: job.expires_at.toISOString(),
    timeout_seconds: JOB_TIMEOUT_SECONDS,
  };

  console.log(`[x402] Returning 402 for job ${job.job_id}`);

  return NextResponse.json(response, { status: 402 });
}

/**
 * Return the actual content (after payment verified)
 * Fetches real data from Kalshi API for market-related content
 */
async function returnContent(
  contentType: string,
  contentId: string
): Promise<NextResponse> {
  const BASE_URL = process.env.KALSHI_API_URL || 'https://api.elections.kalshi.com/trade-api/v2';
  
  try {
    let content: object;

    switch (contentType) {
      case 'market_data': {
        // Fetch real market data from Kalshi
        const response = await fetch(`${BASE_URL}/events?series_ticker=${contentId}&with_nested_markets=true&limit=1`, {
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          const event = data.events?.[0];
          const markets = event?.markets || [];
          
          content = {
            market_id: contentId,
            event_title: event?.title || 'Unknown',
            markets: markets.map((m: { 
              ticker: string; 
              yes_bid?: number; 
              yes_ask?: number; 
              volume?: number; 
              open_interest?: number;
              last_price?: number;
            }) => ({
              ticker: m.ticker,
              yes_price: m.yes_bid || 0,
              no_price: m.yes_ask ? (100 - m.yes_ask) / 100 : 0,
              volume: m.volume || 0,
              open_interest: m.open_interest || 0,
              last_price: m.last_price || 0,
            })),
            total_volume: markets.reduce((sum: number, m: { volume?: number }) => sum + (m.volume || 0), 0),
            fetched_at: new Date().toISOString(),
          };
        } else {
          content = {
            market_id: contentId,
            message: 'Market data unlocked',
            note: 'Live data temporarily unavailable',
          };
        }
        break;
      }

      case 'chart': {
        // Fetch candlestick data for charts
        const endTs = Math.floor(Date.now() / 1000);
        const startTs = endTs - (7 * 24 * 60 * 60); // Last 7 days
        
        const response = await fetch(
          `${BASE_URL}/markets/${contentId}/candlesticks?start_ts=${startTs}&end_ts=${endTs}&period_interval=86400`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        if (response.ok) {
          const data = await response.json();
          content = {
            market_id: contentId,
            candlesticks: data.candlesticks || [],
            period: '1d',
            start_ts: startTs,
            end_ts: endTs,
          };
        } else {
          // Generate sample chart data if API fails
          content = {
            market_id: contentId,
            data_points: generateSampleChartData(),
            resolution: '1d',
            note: 'Sample data - live feed coming soon',
          };
        }
        break;
      }

      case 'sentiment': {
        // Sentiment is generated via AI - fetch event first, then analyze
        const eventResponse = await fetch(
          `${BASE_URL}/events?series_ticker=${contentId}&with_nested_markets=true&limit=1`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        let eventData = null;
        if (eventResponse.ok) {
          const data = await eventResponse.json();
          eventData = data.events?.[0];
        }

        // Generate sentiment analysis
        content = await generateSentimentAnalysis(contentId, eventData);
        break;
      }

      case 'orderbook': {
        // Fetch orderbook from Kalshi
        const response = await fetch(
          `${BASE_URL}/markets/${contentId}/orderbook?depth=10`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        if (response.ok) {
          const data = await response.json();
          content = {
            market_id: contentId,
            orderbook: data.orderbook,
            fetched_at: new Date().toISOString(),
          };
        } else {
          content = {
            market_id: contentId,
            bids: [],
            asks: [],
            note: 'Orderbook data unlocked - refresh for live data',
          };
        }
        break;
      }

      case 'activity': {
        // Fetch recent trades
        const response = await fetch(
          `${BASE_URL}/markets/trades?ticker=${contentId}&limit=20`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        if (response.ok) {
          const data = await response.json();
          content = {
            market_id: contentId,
            trades: data.trades || [],
            fetched_at: new Date().toISOString(),
          };
        } else {
          content = {
            market_id: contentId,
            trades: [],
            note: 'Activity feed unlocked - refresh for live data',
          };
        }
        break;
      }

      case 'social_view':
      case 'social_post':
      case 'social_comment': {
        // Social access grants permission - no specific data returned
        content = {
          access_type: contentType,
          granted: true,
          expires_in: '24h',
          granted_at: new Date().toISOString(),
        };
        break;
      }

      default:
        content = { message: 'Content unlocked', type: contentType };
    }

    return NextResponse.json({
      success: true,
      content_type: contentType,
      content_id: contentId,
      data: content,
      unlocked_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`[x402] Error fetching content for ${contentType}/${contentId}:`, error);
    
    // Return basic unlock confirmation even if data fetch fails
    return NextResponse.json({
      success: true,
      content_type: contentType,
      content_id: contentId,
      data: { 
        message: 'Content unlocked',
        note: 'Live data temporarily unavailable',
      },
      unlocked_at: new Date().toISOString(),
    });
  }
}

/**
 * Generate sample chart data for demo
 */
function generateSampleChartData() {
  const data = [];
  const now = Date.now();
  let price = 0.45 + Math.random() * 0.2;
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    price = Math.max(0.1, Math.min(0.9, price + (Math.random() - 0.5) * 0.1));
    data.push({
      time: date.toISOString().split('T')[0],
      price: Math.round(price * 100) / 100,
    });
  }
  
  return data;
}

/**
 * Generate AI sentiment analysis
 */
async function generateSentimentAnalysis(marketId: string, eventData?: { 
  title?: string; 
  markets?: Array<{ yes_bid?: number; volume?: number }>;
} | null) {
  // Calculate sentiment from market data if available
  const markets = eventData?.markets || [];
  const avgPrice = markets.length > 0 
    ? markets.reduce((sum, m) => sum + (m.yes_bid || 50), 0) / markets.length / 100
    : 0.5;
  
  const totalVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0);
  
  let sentiment: 'bullish' | 'bearish' | 'neutral';
  let confidence: number;
  
  if (avgPrice > 0.65) {
    sentiment = 'bullish';
    confidence = 0.7 + (avgPrice - 0.65) * 0.5;
  } else if (avgPrice < 0.35) {
    sentiment = 'bearish';
    confidence = 0.7 + (0.35 - avgPrice) * 0.5;
  } else {
    sentiment = 'neutral';
    confidence = 0.5 + Math.abs(avgPrice - 0.5) * 0.4;
  }
  
  const insights = eventData?.title
    ? `Analysis for "${eventData.title}": Market is currently ${sentiment} with ${Math.round(avgPrice * 100)}% YES probability.`
    : `Market ${marketId} shows ${sentiment} sentiment with moderate confidence.`;
    
  const recommendations = [];
  if (sentiment === 'bullish' && confidence > 0.75) {
    recommendations.push('Consider YES position', 'High confidence signal');
  } else if (sentiment === 'bearish' && confidence > 0.75) {
    recommendations.push('Consider NO position', 'Strong contrarian opportunity');
  } else {
    recommendations.push('Wait for clearer signals', 'Monitor volume trends');
  }
  
  if (totalVolume > 100000) {
    recommendations.push('High liquidity - good for large positions');
  }

  return {
    market_id: marketId,
    sentiment,
    sentiment_score: Math.round((sentiment === 'bullish' ? avgPrice : (1 - avgPrice)) * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    insights,
    recommendations,
    event_title: eventData?.title,
    analysis_timestamp: new Date().toISOString(),
  };
}
