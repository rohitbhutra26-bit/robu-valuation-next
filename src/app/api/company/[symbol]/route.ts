import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

export async function GET(_request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();

  try {
    const res = await fetch(
      `${DATA_SERVER}/company/${encodeURIComponent(symbol)}`,
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        ...data,
        changePercent: data.changePercent ?? data.changePct ?? 0,
      });
    }
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.detail || 'Company not found' },
      { status: res.status }
    );
  } catch {
    return NextResponse.json(
      { error: 'Data server not running. Start it with: bash start.sh' },
      { status: 503 }
    );
  }
}
