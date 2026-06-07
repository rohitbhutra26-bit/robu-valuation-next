import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();

  // Try NSE (.NS) first, fallback to BSE (.BO)
  for (const suffix of ['.NS', '.BO']) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}${suffix}?interval=1d&range=5y`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        next: { revalidate: 900 }, // cache 15 min
      });

      if (!res.ok) continue;

      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) continue;

      const { timestamp, indicators } = result;
      const quote = indicators?.quote?.[0];
      if (!timestamp || !quote) continue;

      const candles = (timestamp as number[])
        .map((ts, i) => ({
          time:   new Date(ts * 1000).toISOString().slice(0, 10),
          open:   quote.open?.[i]   ?? null,
          high:   quote.high?.[i]   ?? null,
          low:    quote.low?.[i]    ?? null,
          close:  quote.close?.[i]  ?? null,
          volume: quote.volume?.[i] ?? 0,
        }))
        .filter(c =>
          c.open  != null && c.high != null &&
          c.low   != null && c.close != null &&
          c.open  > 0     && c.high > 0 &&
          c.low   > 0     && c.close > 0
        );

      if (candles.length < 20) continue;

      return NextResponse.json(candles);
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { error: `No historical data found for ${symbol}` },
    { status: 404 }
  );
}
