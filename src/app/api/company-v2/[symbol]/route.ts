import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

// Screener.in-backed company data — accurate BSE-filed fundamentals overlaid on Yahoo live price.
// Falls back to Yahoo Finance inside the data server if Screener is unavailable.
export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();

  try {
    const res = await fetch(
      `${DATA_SERVER}/company-v2/${encodeURIComponent(symbol)}`,
      { next: { revalidate: 300 } }   // 5-min cache — live price + fundamentals
    );
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.detail || 'Company not found' },
      { status: res.status }
    );
  } catch {
    return NextResponse.json(
      { error: 'Data server unavailable' },
      { status: 503 }
    );
  }
}
