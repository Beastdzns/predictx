import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BlinkCard from '@/models/BlinkCard';

// CORS headers for extension access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    await dbConnect();

    const { linkId } = await params;

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const blinkCard = await BlinkCard.findOne({ linkId });

    if (!blinkCard) {
      return NextResponse.json(
        { error: 'Blink card not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: blinkCard },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error fetching blink card:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blink card' },
      { status: 500, headers: corsHeaders }
    );
  }
}
