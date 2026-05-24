import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

export async function GET(
  _request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();
  try {
    const res = await fetch(`${DATA_SERVER}/quarterly/${symbol}`, { cache: 'no-store' });
    if (res.ok) return NextResponse.json(await res.json());
    return NextResponse.json({ error: 'Not found' }, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Data server unavailable' }, { status: 503 });
  }
}
