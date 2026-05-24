import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams({
    min_roe:         searchParams.get('min_roe')         || '0',
    max_pe:          searchParams.get('max_pe')          || '9999',
    min_net_margin:  searchParams.get('min_net_margin')  || '-999',
    max_debt_equity: searchParams.get('max_debt_equity') || '9999',
    sector:          searchParams.get('sector')          || '',
    limit:           searchParams.get('limit')           || '30',
  });

  try {
    const res = await fetch(`${DATA_SERVER}/screener?${params}`, { cache: 'no-store' });
    if (res.ok) return NextResponse.json(await res.json());
    return NextResponse.json({ error: 'Screener unavailable' }, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Data server unavailable' }, { status: 503 });
  }
}
