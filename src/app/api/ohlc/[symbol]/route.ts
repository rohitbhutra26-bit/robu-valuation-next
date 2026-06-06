import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();
  const period = request.nextUrl.searchParams.get('period') || '2y';
  try {
    const res = await fetch(
      `${DATA_SERVER}/ohlc/${encodeURIComponent(symbol)}?period=${encodeURIComponent(period)}`,
      { next: { revalidate: 900 } } // cache 15 min — daily candles update once a day
    );
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.detail || 'OHLC data not found' },
      { status: res.status }
    );
  } catch {
    return NextResponse.json(
      { error: 'Data server unavailable' },
      { status: 503 }
    );
  }
}
