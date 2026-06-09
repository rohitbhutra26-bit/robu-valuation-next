import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

// 5-year P/E & P/B valuation history ({ points, stats }) from the data server's
// /historical endpoint (Screener.in). Used by HistoricalValuationChart.
// NOTE: for price candles use /api/ohlc — not this route.
export async function GET(
  _request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();
  try {
    const res = await fetch(
      `${DATA_SERVER}/historical/${encodeURIComponent(symbol)}`,
      { next: { revalidate: 900 } } // 15-min cache; valuation history changes slowly
    );
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.detail || 'Historical valuation data not found' },
      { status: res.status }
    );
  } catch {
    return NextResponse.json({ error: 'Data server unavailable' }, { status: 503 });
  }
}
