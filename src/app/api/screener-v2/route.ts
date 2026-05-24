import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params = new URLSearchParams();
  const forward = [
    'min_roe','max_pe','min_net_margin','max_debt_equity',
    'min_market_cap','max_market_cap','min_rev_growth','min_roce',
    'sector','sort_by','order','limit',
  ];
  for (const k of forward) {
    const v = searchParams.get(k);
    if (v !== null) params.set(k, v);
  }

  try {
    const res = await fetch(`${DATA_SERVER}/screener-v2?${params}`, { cache: 'no-store' });
    if (res.ok) return NextResponse.json(await res.json());
    const text = await res.text();
    return NextResponse.json({ error: text || 'Screener unavailable' }, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Data server unavailable' }, { status: 503 });
  }
}
