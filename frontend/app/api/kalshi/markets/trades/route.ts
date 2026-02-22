import { NextRequest, NextResponse } from 'next/server';

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const kalshiParams = new URLSearchParams();

  // Forward all query parameters
  searchParams.forEach((value, key) => {
    kalshiParams.append(key, value);
  });

  try {
    const response = await fetch(
      `${KALSHI_API_BASE}/markets/trades?${kalshiParams.toString()}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch trades from Kalshi API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
