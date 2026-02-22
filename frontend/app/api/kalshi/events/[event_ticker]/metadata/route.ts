import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ event_ticker: string }> }
) {
  const { event_ticker } = await params;
  try {
    const response = await fetch(`${BASE_URL}/events/${event_ticker}/metadata`, {
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch event metadata' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching event metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
