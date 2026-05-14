import { NextRequest, NextResponse } from 'next/server';
import { getCompany } from '@/lib/mockData';
import { ValuationResult } from '@/lib/types';

const DATA_SERVER = 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const revenueGrowthRate = parseFloat(searchParams.get('revenueGrowthRate') || '15') / 100;
  const netMarginAssumption = parseFloat(searchParams.get('netMarginAssumption') || '20') / 100;
  const exitPE = parseFloat(searchParams.get('exitPE') || '25');
  const years = parseInt(searchParams.get('years') || '5', 10);

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
  }

  const sym = symbol.toUpperCase();

  // Attempt to get latest revenue, shares, and price from the live data server.
  // Valuation math stays in Next.js — only the raw data inputs come from Python.
  let latestRevenue: number | null = null;
  let shares: number | null = null;
  let currentPrice: number | null = null;

  try {
    // Fetch financials for revenue & shares
    const finRes = await fetch(
      `${DATA_SERVER}/financials/${encodeURIComponent(sym)}`,
      { cache: 'no-store' }
    );
    if (finRes.ok) {
      const finData: Array<{ revenue: number; shares?: number }> = await finRes.json();
      if (Array.isArray(finData) && finData.length > 0) {
        const latest = finData[finData.length - 1];
        latestRevenue = latest.revenue ?? null;
        shares = latest.shares ?? null;
      }
    }

    // Fetch company for current price & shares (shares in crores from Python server)
    const compRes = await fetch(
      `${DATA_SERVER}/company/${encodeURIComponent(sym)}`,
      { cache: 'no-store' }
    );
    if (compRes.ok) {
      const compData = await compRes.json();
      currentPrice = compData.currentPrice ?? null;
      // Use company shares if financials didn't provide them
      if (shares === null || shares === 0) {
        shares = compData.shares ?? null;
      }
    }
  } catch {
    // Server unreachable — fall through to mock below
  }

  // Fallback: mock data for any values not obtained from live server
  if (latestRevenue === null || currentPrice === null || shares === null) {
    const company = getCompany(sym);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    const latestFin = company.financials[company.financials.length - 1];
    if (latestRevenue === null) latestRevenue = latestFin.revenue;
    if (shares === null) shares = latestFin.shares;
    if (currentPrice === null) currentPrice = company.currentPrice;
  }

  // Guard: shares in crores from Python server, but mock data also stores shares in crores
  // (mock financials.shares field holds crore values like 6339, 371 — wait, mock stores raw
  //  share counts in crores? Let's check: RELIANCE shares: 6339 (crores), TCS: 371 (crores).
  //  Python server returns shares in crores too (divides by 1e7).
  //  The valuation math: futurePAT / shares gives per-share value.
  //  Both mock and live server use "crores" units for shares, so formula is consistent.)

  if (!latestRevenue || !shares || !currentPrice) {
    return NextResponse.json({ error: 'Insufficient data to compute valuation' }, { status: 500 });
  }

  const futureRevenue = latestRevenue * Math.pow(1 + revenueGrowthRate, years);
  const futurePAT = futureRevenue * netMarginAssumption;
  const futurePATPerShare = futurePAT / shares;
  const fairValue = futurePATPerShare * exitPE;
  const cagr = Math.pow(fairValue / currentPrice, 1 / years) - 1;
  const upside = (fairValue / currentPrice - 1) * 100;

  const result: ValuationResult = {
    futureRevenue,
    futurePAT,
    futurePATPerShare,
    fairValue,
    cagr,
    upside,
    currentPrice,
    years,
  };

  return NextResponse.json(result);
}
