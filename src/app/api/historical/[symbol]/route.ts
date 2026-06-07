import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const AV_KEY = process.env.ALPHA_VANTAGE_KEY;

export async function GET(
  _request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();

  if (!AV_KEY) {
    return NextResponse.json(
      { error: 'NO_KEY', message: 'Set ALPHA_VANTAGE_KEY in Railway environment variables. Free key at alphavantage.co' },
      { status: 503 }
    );
  }

  // Alpha Vantage: BSE format is SYMBOL.BSE, NSE is SYMBOL.NS
  // Try BSE first (more reliable for Indian stocks), then NS
  for (const suffix of ['.BSE', '.NS']) {
    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}${suffix}&outputsize=full&apikey=${AV_KEY}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });

      if (!res.ok) continue;

      const data = await res.json();

      // Rate limit hit
      if (data['Note'] || data['Information']) {
        return NextResponse.json(
          { error: 'RATE_LIMIT', message: 'Alpha Vantage rate limit — try again in a minute (free: 25/min, 500/day)' },
          { status: 429 }
        );
      }

      const ts = data['Time Series (Daily)'] as Record<string, Record<string, string>> | undefined;
      if (!ts || Object.keys(ts).length === 0) continue;

      // Convert to our candle format, sorted ascending by date
      const candles = Object.entries(ts)
        .map(([date, bar]) => ({
          time:   date,
          open:   parseFloat(bar['1. open']),
          high:   parseFloat(bar['2. high']),
          low:    parseFloat(bar['3. low']),
          close:  parseFloat(bar['4. close']),
          volume: parseFloat(bar['5. volume'] || '0'),
        }))
        .filter(c => c.open > 0 && c.close > 0)
        .sort((a, b) => a.time.localeCompare(b.time));

      if (candles.length < 20) continue;

      return NextResponse.json(candles, {
        headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
      });

    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { error: 'NOT_FOUND', message: `No historical data found for ${symbol}` },
    { status: 404 }
  );
}
