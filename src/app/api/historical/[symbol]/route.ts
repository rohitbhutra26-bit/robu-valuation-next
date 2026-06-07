import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

// Historical OHLC candles — proxied from the data server's /ohlc/ endpoint.
// The data server uses Yahoo Finance with curl_cffi Chrome impersonation + 15-min cache.
// No external API key required.
export async function GET(
  _request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();

  try {
    const res = await fetch(
      `${DATA_SERVER}/ohlc/${encodeURIComponent(symbol)}?period=5y`,
      { next: { revalidate: 900 } }   // 15-min Next.js cache on top of data-server cache
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'NOT_FOUND', message: err.detail || `No historical data for ${symbol}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Data server returns { symbol, candles: [{time, open, high, low, close}], source }
    const candles: Array<{time:string;open:number;high:number;low:number;close:number;volume?:number}> =
      Array.isArray(data) ? data : (data.candles ?? []);

    if (candles.length < 20) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: `Not enough data for ${symbol}` },
        { status: 404 }
      );
    }

    // Sort ascending (data server already does this, but ensure)
    candles.sort((a, b) => a.time.localeCompare(b.time));

    return NextResponse.json(candles, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
    });

  } catch {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: `Could not fetch historical data for ${symbol}` },
      { status: 503 }
    );
  }
}
