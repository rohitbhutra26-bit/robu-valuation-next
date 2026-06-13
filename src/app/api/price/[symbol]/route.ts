import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

// Lightweight fresh price quote — used by Portfolio & Watchlist so P&L is
// computed on the latest available price, not a stale cached company payload.
export async function GET(_request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();
  try {
    const res = await fetch(
      `${DATA_SERVER}/price/${encodeURIComponent(symbol)}`,
      { next: { revalidate: 60 } }   // 1-min cache — near-live quotes
    );
    if (res.ok) return NextResponse.json(await res.json());
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.detail || 'Price not found' }, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Data server unavailable' }, { status: 503 });
  }
}
