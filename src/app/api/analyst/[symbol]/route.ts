import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

// Proxy to the data server's /analyst endpoint (Profile tab). Slow-moving data → 1h cache.
export async function GET(
  _request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();
  try {
    const res = await fetch(`${DATA_SERVER}/analyst/${encodeURIComponent(symbol)}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) return NextResponse.json(await res.json(), { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' } });
    return NextResponse.json({ error: 'Not found' }, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Data server unavailable' }, { status: 503 });
  }
}
