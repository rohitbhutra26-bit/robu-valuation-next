import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

export async function GET(_request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();

  try {
    const res = await fetch(
      `${DATA_SERVER}/financials/${encodeURIComponent(symbol)}`,
      { next: { revalidate: 900 } }
    );
    if (res.ok) {
      return NextResponse.json(await res.json(), { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' } });
    }
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.detail || 'Financials not found' },
      { status: res.status }
    );
  } catch {
    return NextResponse.json(
      { error: 'Data server not running. Start it with: bash start.sh' },
      { status: 503 }
    );
  }
}
