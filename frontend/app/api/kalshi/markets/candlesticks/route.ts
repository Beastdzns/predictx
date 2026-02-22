import { NextRequest, NextResponse } from 'next/server';

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();

  searchParams.forEach((value, key) => {
    params.append(key, value);
  });

  try {
    const response = await fetch(
      `${KALSHI_API_BASE}/markets/candlesticks?${params.toString()}`,
      {
        headers: { "Accept": "application/json" },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kalshi API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch candlesticks from Kalshi API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching candlesticks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
