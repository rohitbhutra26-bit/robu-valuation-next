import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

// Screener.in-backed financials — accurate BSE-filed data, ₹ Crore guaranteed.
// Falls back to Yahoo Finance inside the data server if Screener is unavailable.
export async function GET(_request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();

  try {
    const res = await fetch(
      `${DATA_SERVER}/financials-v2/${encodeURIComponent(symbol)}`,
      { next: { revalidate: 900 } }   // 15-min cache at edge
    );
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.detail || 'Financials not found' },
      { status: res.status }
    );
  } catch {
    return NextResponse.json(
      { error: 'Data server unavailable' },
      { status: 503 }
    );
  }
}
