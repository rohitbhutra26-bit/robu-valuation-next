import { NextRequest, NextResponse } from 'next/server';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const DATA_SERVER =
  process.env.DATA_SERVER_URL || process.env.NEXT_PUBLIC_DATA_SERVER_URL || 'http://localhost:8000';

// ── Step 1: Ask Gemini to identify real industry peers ─────────────────────────
async function getAIPeers(
  symbol: string,
  name: string,
  sector: string,
  industry?: string,
): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const industryHint = industry ? ` (${industry})` : '';

  const prompt = `You are an Indian equity market expert.
List exactly 7 NSE-listed Indian companies that are the closest direct competitors or peers to ${name} (NSE: ${symbol}) in the ${sector}${industryHint} space.

Selection criteria:
- Same sub-industry or direct product/service competitors (not just same broad sector)
- Listed on NSE India (National Stock Exchange)
- Comparable in business model, not just sector classification
- Do NOT include ${symbol} itself
- Ranked by relevance (most comparable first)

Return ONLY a valid JSON array of NSE ticker symbols (no .NS suffix, no explanation):
["SYMBOL1", "SYMBOL2", "SYMBOL3", "SYMBOL4", "SYMBOL5", "SYMBOL6", "SYMBOL7"]`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 120 },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed)
      ? parsed
          .map((s: unknown) => (typeof s === 'string' ? s.toUpperCase().replace('.NS', '') : ''))
          .filter(Boolean)
          .slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

// ── Step 2: Fetch live company metrics from data server ────────────────────────
async function fetchCompany(symbol: string): Promise<Record<string, unknown> | null> {
  try {
    // Try v2 (Screener-backed) first, fall back to v1
    const res = await fetch(`${DATA_SERVER}/company-v2/${encodeURIComponent(symbol)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) return await res.json();

    const res1 = await fetch(`${DATA_SERVER}/company/${encodeURIComponent(symbol)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (res1.ok) return await res1.json();
    return null;
  } catch {
    return null;
  }
}

// ── Build peer row from raw company data ──────────────────────────────────────
function toPeerRow(raw: Record<string, unknown>, isSelf = false) {
  return {
    symbol:       String(raw.symbol ?? ''),
    name:         String(raw.name ?? ''),
    marketCap:    toNum(raw.marketCap),
    currentPrice: toNum(raw.currentPrice),
    pe:           toNum(raw.pe),
    pb:           toNum(raw.pb),
    evEbitda:     toNum(raw.evEbitda ?? raw.enterpriseToEbitda),
    revenueGrowth:toNum(raw.revenueGrowth ?? raw.earningsGrowth),
    netMargin:    toNum(raw.netMargin),
    roe:          toNum(raw.roe),
    de:           toNum(raw.debtToEquity),
    isSelf,
  };
}

function toNum(v: unknown): number | null {
  const n = Number(v);
  return isNaN(n) || v === null || v === undefined || v === '' ? null : n;
}

// ── Fallback: data server's legacy peer endpoint ──────────────────────────────
async function legacyPeers(symbol: string) {
  try {
    const res = await fetch(`${DATA_SERVER}/peers/${symbol}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────
export const revalidate = 1800; // 30-min CDN cache — peers don't change often

export async function GET(
  _req: NextRequest,
  { params }: { params: { symbol: string } },
) {
  const symbol = (params.symbol ?? '').toUpperCase();

  // Fetch the subject company first — we need name/sector for the AI prompt
  // AND to build its own row in the peer table
  const selfRaw = await fetchCompany(symbol);
  if (!selfRaw) {
    // Hard failure — can't even get the base company
    return NextResponse.json({ error: `Company ${symbol} not found` }, { status: 404 });
  }

  const name   = String(selfRaw.name   ?? symbol);
  const sector = String(selfRaw.sector ?? '');
  const industry = selfRaw.industry ? String(selfRaw.industry) : undefined;

  // Ask Gemini for peer symbols
  const peerSymbols = await getAIPeers(symbol, name, sector, industry);

  if (peerSymbols.length === 0) {
    // Gemini unavailable or no key — try legacy data server endpoint
    const legacy = await legacyPeers(symbol);
    if (legacy?.peers?.length) {
      return NextResponse.json({
        sector,
        source: 'legacy',
        peers: legacy.peers,
      });
    }
    // Complete fallback: just return the company itself with an explanation
    return NextResponse.json({
      sector,
      source: 'self-only',
      peers: [toPeerRow(selfRaw, true)],
    });
  }

  // Fetch all peer company data in parallel
  const peerRaws = await Promise.all(peerSymbols.map(s => fetchCompany(s)));

  // Build peer rows — skip symbols the data server doesn't know about
  const peers = [
    toPeerRow(selfRaw, true),
    ...peerRaws
      .map((raw, i) => raw ? toPeerRow({ ...raw, symbol: peerSymbols[i] }) : null)
      .filter((p): p is NonNullable<typeof p> => p !== null),
  ];

  // Sort: self first, then by market cap descending
  const selfRow = peers.filter(p => p.isSelf);
  const others  = peers.filter(p => !p.isSelf).sort((a, b) => {
    const ma = a.marketCap ?? 0;
    const mb = b.marketCap ?? 0;
    return mb - ma;
  });

  return NextResponse.json({
    sector,
    source: 'ai',
    peers: [...selfRow, ...others],
  });
}
