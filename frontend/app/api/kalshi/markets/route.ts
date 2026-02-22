import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params = new URLSearchParams();
  searchParams.forEach((value, key) => {
    params.append(key, value);
  });

  try {
    const response = await fetch(`${BASE_URL}/markets?${params.toString()}`, {
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch markets' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
