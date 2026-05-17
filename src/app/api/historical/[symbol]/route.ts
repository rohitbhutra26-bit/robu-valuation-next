import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

export async function GET(
  _request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();
  try {
    const res = await fetch(
      `${DATA_SERVER}/historical/${encodeURIComponent(symbol)}`,
      { next: { revalidate: 900 } }   // cache 15 min — historical data doesn't change often
    );
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.detail || 'Historical data not found' },
      { status: res.status }
    );
  } catch {
    return NextResponse.json(
      { error: 'Data server unavailable' },
      { status: 503 }
    );
  }
}
