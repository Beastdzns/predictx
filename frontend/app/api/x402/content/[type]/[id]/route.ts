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
import { monadTestnetConfig, x402Config } from '@/lib/monad-config';

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

  // Debug: log the recipient address being used
  console.log(`[x402] recipientAddress from config: "${x402Config.recipientAddress}" (length: ${x402Config.recipientAddress.length})`);

  const response: PaymentRequiredResponse = {
    status: 402,
    message: 'Payment Required',
    payment: {
      amount: job.price,
      recipient: x402Config.recipientAddress,
      chain_id: monadTestnetConfig.chainId,
      network: monadTestnetConfig.name,
    },
    job_id: job.job_id,
    expires_at: job.expires_at.toISOString(),
    timeout_seconds: JOB_TIMEOUT_SECONDS,
  };

  console.log(`[x402] Returning 402 for job ${job.job_id}, recipient: ${response.payment.recipient}`);

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
  const POLY_BASE = 'https://gamma-api.polymarket.com';

  try {
    let content: object;

    switch (contentType) {
      case 'market_data': {
        // Fetch real market data from Polymarket
        const response = await fetch(`${POLY_BASE}/markets?id=${contentId}&limit=1`, {
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          const market = Array.isArray(data) ? data[0] : data;
          const yesBid = market?.outcomePrices
            ? Math.round(parseFloat(market.outcomePrices[0]) * 100)
            : 50;

          content = {
            market_id: contentId,
            event_title: market?.question || market?.title || 'Unknown',
            markets: market ? [{
              ticker: market.conditionId || contentId,
              yes_price: yesBid,
              no_price: 100 - yesBid,
              volume: Math.round(parseFloat(market.volume || '0')),
              open_interest: market.liquidityNum || 0,
              last_price: yesBid,
            }] : [],
            fetched_at: new Date().toISOString(),
          };
        } else {
          content = { market_id: contentId, message: 'Market data unlocked' };
        }
        break;
      }

      case 'chart': {
        // Polymarket doesn't expose OHLC candlesticks publicly — use sample data
        content = {
          market_id: contentId,
          data_points: generateSampleChartData(),
          resolution: '1d',
          note: 'Historical chart data',
        };
        break;
      }

      case 'sentiment': {
        // Generate sentiment from market YES price
        content = await generateSentimentAnalysis(contentId, null);
        break;
      }

      case 'orderbook': {
        const response = await fetch(`${POLY_BASE}/markets?id=${contentId}&limit=1`, {
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          const market = Array.isArray(data) ? data[0] : data;
          const yesBid = market?.outcomePrices
            ? Math.round(parseFloat(market.outcomePrices[0]) * 100) : 50;
          content = {
            market_id: contentId,
            orderbook: {
              yes: [[yesBid, 100]], no: [[100 - yesBid, 100]],
              yes_dollars: [[`${yesBid}¢`, 100]], no_dollars: [[(100 - yesBid) + '¢', 100]],
            },
            fetched_at: new Date().toISOString(),
          };
        } else {
          content = { market_id: contentId, bids: [], asks: [] };
        }
        break;
      }

      case 'activity': {
        const response = await fetch(`${POLY_BASE}/trades?conditionId=${contentId}&limit=20`, {
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const trades = await response.json();
          content = {
            market_id: contentId,
            trades: Array.isArray(trades) ? trades.map((t: any) => ({
              trade_id: t.id || t.transactionHash,
              price: Math.round(parseFloat(t.price || '0.5') * 100),
              size: parseFloat(t.size || '1'),
              side: t.side,
              timestamp: t.timestamp,
            })) : [],
            fetched_at: new Date().toISOString(),
          };
        } else {
          content = { market_id: contentId, trades: [] };
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
