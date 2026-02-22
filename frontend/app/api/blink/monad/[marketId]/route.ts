/**
 * PredictX Blink API — Monad Testnet
 * Spec-compliant with official Monad Blinks guide:
 * https://docs.monad.xyz/guides/blinks-guide
 *
 * Uses @solana/actions types (they are chain-agnostic JSON schemas)
 * Uses wagmi serialize() for the transaction response format Blink clients expect
 */

import type { ActionGetResponse, ActionPostResponse } from '@solana/actions';
import { serialize } from 'wagmi';
import { parseEther } from 'viem';

// ── Constants ──────────────────────────────────────────────────────────────

// CAIP-2 identifier for Monad Testnet
const BLOCKCHAIN_ID = 'eip155:10143';

// Contract address — set via env after deployment
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS ||
    '0x0000000000000000000000000000000000000000') as `0x${string}`;

// Required headers for every Blink endpoint
const BLINK_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-blockchain-ids, x-action-version',
    'Content-Type': 'application/json',
    'x-blockchain-ids': BLOCKCHAIN_ID,
    'x-action-version': '2.0',
} as const;

// ABI selectors (keccak256 of function signatures)
const BUY_YES_SELECTOR = '0x061dd98d'; // buyYes(uint256)
const BUY_NO_SELECTOR = '0x58c36e5c'; // buyNo(uint256)

// ── OPTIONS (CORS preflight — REQUIRED or Blink won't render) ──────────────
export const OPTIONS = async () => {
    return new Response(null, { headers: BLINK_HEADERS });
};

// ── GET ────────────────────────────────────────────────────────────────────
// Returns Blink UI metadata for dial.to / Twitter Blink clients

// On-chain markets (synced with CreateMarkets.s.sol)
const DEMO_MARKETS: Record<string, { question: string; yesPct: number; noPct: number; poolMon: number; deadline: string }> = {
    '0': { question: 'Will Bitcoin hit $100K by April 2026?', yesPct: 50, noPct: 50, poolMon: 0.01, deadline: 'Apr 1, 2026' },
    '1': { question: 'Will Monad mainnet launch by Q2 2026?', yesPct: 50, noPct: 50, poolMon: 0.01, deadline: 'Jul 1, 2026' },
    '2': { question: 'Will ETH surpass $5K by end of 2026?', yesPct: 50, noPct: 50, poolMon: 0.01, deadline: 'Jan 1, 2027' },
    '3': { question: 'Will AI agents manage $1B in crypto by 2027?', yesPct: 50, noPct: 50, poolMon: 0.01, deadline: 'Jan 1, 2027' },
    '4': { question: 'Will Solana flip Ethereum by TVL in 2026?', yesPct: 50, noPct: 50, poolMon: 0.01, deadline: 'Jan 1, 2027' },
};

export const GET = async (
    req: Request,
    { params }: { params: Promise<{ marketId: string }> }
) => {
    const { marketId } = await params;
    const baseUrl = new URL(req.url).origin;

    // Try live on-chain read; fall back to demo data
    let title = `Prediction Market #${marketId}`;
    let description = 'Trade YES or NO on Monad Testnet · Powered by PredictX';
    let yesPct = 50;
    let noPct = 50;

    try {
        const onChain = await fetchMarketData(marketId);
        if (onChain) {
            title = onChain.question || title;
            yesPct = onChain.yesPct;
            noPct = onChain.noPct;
            description = `YES ${yesPct}% | NO ${noPct}% | Pool: ${onChain.poolMon} MON | Ends ${onChain.deadline}`;
        } else if (DEMO_MARKETS[marketId]) {
            // Use demo data for testing
            const demo = DEMO_MARKETS[marketId];
            title = demo.question;
            yesPct = demo.yesPct;
            noPct = demo.noPct;
            description = `YES ${yesPct}% | NO ${noPct}% | Pool: ${demo.poolMon} MON | Ends ${demo.deadline}`;
        }
    } catch {
        // Demo fallback
        if (DEMO_MARKETS[marketId]) {
            const demo = DEMO_MARKETS[marketId];
            title = demo.question;
            yesPct = demo.yesPct;
            noPct = demo.noPct;
            description = `YES ${yesPct}% | NO ${noPct}% | Pool: ${demo.poolMon} MON | Ends ${demo.deadline}`;
        }
    }

    const response: ActionGetResponse = {
        type: 'action',
        icon: `${baseUrl}/api/blink/monad/${marketId}/image`,
        label: 'Trade Prediction',
        title,
        description,
        links: {
            actions: [
                {
                    type: 'transaction',
                    label: `✅ Buy YES (${yesPct}%)`,
                    href: `${baseUrl}/api/blink/monad/${marketId}?side=yes&amount=0.01`,
                },
                {
                    type: 'transaction',
                    label: `❌ Buy NO (${noPct}%)`,
                    href: `${baseUrl}/api/blink/monad/${marketId}?side=no&amount=0.01`,
                },
                {
                    type: 'transaction',
                    label: 'Custom amount',
                    href: `${baseUrl}/api/blink/monad/${marketId}?side={side}&amount={amount}`,
                    parameters: [
                        { name: 'amount', label: 'Amount in MON', type: 'number', required: true },
                        {
                            name: 'side',
                            label: 'YES or NO',
                            type: 'select',
                            required: true,
                            options: [
                                { label: '✅ YES', value: 'yes' },
                                { label: '❌ NO', value: 'no' },
                            ],
                        },
                    ],
                },
            ],
        },
    };

    return new Response(JSON.stringify(response), { status: 200, headers: BLINK_HEADERS });
};

// ── POST ───────────────────────────────────────────────────────────────────
// Returns a serialized EVM transaction for the Blink client to sign + send

export const POST = async (
    req: Request,
    { params }: { params: Promise<{ marketId: string }> }
) => {
    try {
        const { marketId } = await params;
        const url = new URL(req.url);

        // Parse query params (amount + side)
        const side = url.searchParams.get('side') || 'yes';
        const amountStr = url.searchParams.get('amount') || '0.01';

        // Validate
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');
        const amountWei = parseEther(amountStr);

        // Build calldata: buyYes(uint256) or buyNo(uint256)
        const selector = side === 'yes' ? BUY_YES_SELECTOR : BUY_NO_SELECTOR;
        const idHex = BigInt(marketId).toString(16).padStart(64, '0');
        const data = (selector + idHex) as `0x${string}`;

        // Build transaction object
        const transaction = {
            to: CONTRACT_ADDRESS,
            data,
            value: amountWei.toString(), // string for serialize()
            chainId: 10143,
        };

        // Serialize using wagmi (required format for Blink clients)
        const transactionJson = serialize(transaction);

        const response: ActionPostResponse = {
            type: 'transaction',
            transaction: transactionJson,
            message: `${side.toUpperCase()} trade for ${amountStr} MON on market #${marketId}`,
        };

        return new Response(JSON.stringify(response), { status: 200, headers: BLINK_HEADERS });
    } catch (error) {
        console.error('[Blink POST] Error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
            { status: 500, headers: BLINK_HEADERS }
        );
    }
};

// ── On-chain data fetcher ──────────────────────────────────────────────────

async function fetchMarketData(marketId: string): Promise<{
    question: string;
    yesPct: number;
    noPct: number;
    poolMon: string;
    deadline: string;
} | null> {
    // TODO: use viem public client to call getMarket(marketId) on Monad RPC
    // Requires contract deployment — returns null until then
    return null;
}
