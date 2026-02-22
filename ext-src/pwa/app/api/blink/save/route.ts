import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BlinkCard from '@/models/BlinkCard';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const {
      linkId,
      requestedAmount,
      cardTitle,
      cardDescription,
      cardImageUrl,
      cardType,
      primaryColor,
      secondaryColor,
      textColor,
    } = body;

    // Validate required fields
    if (!linkId || !requestedAmount || !cardTitle || !cardDescription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create or update the blink card
    const blinkCard = await BlinkCard.findOneAndUpdate(
      { linkId },
      {
        linkId,
        requestedAmount,
        cardTitle,
        cardDescription,
        cardImageUrl: cardImageUrl || '',
        cardType: cardType || 'custom',
        primaryColor: primaryColor || '#7C3AED',
        secondaryColor: secondaryColor || '#14F195',
        textColor: textColor || '#FFFFFF',
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: blinkCard }, { status: 200 });
  } catch (error) {
    console.error('Error saving blink card:', error);
    return NextResponse.json(
      { error: 'Failed to save blink card' },
      { status: 500 }
    );
  }
}
