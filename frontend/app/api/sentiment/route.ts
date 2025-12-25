import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, markets, recentTrades } = body;

    // Prepare data for Gemini
    const prompt = `You are a financial market analyst specializing in prediction markets. Analyze the following event and its markets to provide sentiment analysis and investment recommendations.

EVENT DATA:
Title: ${event.title}
Category: ${event.category}
Subtitle: ${event.sub_title || 'N/A'}

MARKETS DATA (${markets.length} markets):
${markets.map((m: any, idx: number) => {
  const displayName = m.custom_strike 
    ? String(Object.values(m.custom_strike)[0])
    : m.subtitle || 'N/A';
  
  return `
Market ${idx + 1}:
- Title: ${m.title}
- Strike/Subtitle: ${displayName}
- YES Price: ${m.yes_bid || m.last_price || 50}¢
- NO Price: ${100 - (m.yes_bid || m.last_price || 50)}¢
- Volume: ${m.volume || 0}
- Status: ${m.status}
- Close Time: ${m.close_time}
`;
}).join('\n')}

RECENT TRADING ACTIVITY (${recentTrades.length} trades):
${recentTrades.slice(0, 10).map((t: any) => `
- ${t.taker_side.toUpperCase()} @ ${t.price}¢, ${t.count} shares, ${new Date(t.created_time).toLocaleString()}
`).join('\n')}

Based on this data, provide:
1. Overall market sentiment (bullish, bearish, neutral, volatile)
2. Key insights about the market trends (2-3 sentences)
3. Top 3 markets to invest in with recommended side (YES or NO) and confidence level

Return ONLY a valid JSON object in this EXACT format (no markdown, no code blocks):
{
  "sentiment": "bullish|bearish|neutral|volatile",
  "insights": "Your 2-3 sentence analysis here",
  "recommendations": [
    {
      "marketTitle": "Full market title",
      "customStrike": "Strike value or subtitle",
      "recommendedSide": "YES|NO",
      "confidence": "high|medium|low",
      "reason": "Brief reason for recommendation"
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Failed to fetch from Gemini API: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0]?.content?.parts[0]?.text || '';

    // Parse JSON from response
    let sentimentData;
    try {
      // Remove markdown code blocks if present
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      sentimentData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', generatedText);
      // Return default sentiment if parsing fails
      sentimentData = {
        sentiment: 'neutral',
        insights: 'Unable to analyze market sentiment at this time.',
        recommendations: [],
      };
    }

    return NextResponse.json(sentimentData);
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    return NextResponse.json(
      {
        sentiment: 'neutral',
        insights: 'Market sentiment analysis temporarily unavailable.',
        recommendations: [],
      },
      { status: 200 }
    );
  }
}
