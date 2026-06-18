import { NextResponse } from 'next/server';

// Live India 10-yr G-sec yield for the Story engine's Macro/Rate layer.
// Source of truth: the data server's /macro endpoint (FRED-backed, cached 12h).
// We pass it through and always fall back to a sane recent value so the layer
// never breaks. Cached at the edge for 6h.
export const revalidate = 21600;

const DATA_SERVER =
  process.env.DATA_SERVER_URL ||
  process.env.NEXT_PUBLIC_DATA_SERVER_URL ||
  'https://robu-data-server-production.up.railway.app';

const FALLBACK = { y10: 6.86, direction: 'falling', refLow: 6.5, refHigh: 7.4, asOf: 'recent', source: 'fallback' };

export async function GET() {
  try {
    const r = await fetch(`${DATA_SERVER}/macro`, { next: { revalidate: 21600 } });
    if (r.ok) {
      const d = await r.json();
      if (d && typeof d.y10 === 'number' && d.y10 > 4 && d.y10 < 12) return NextResponse.json(d);
    }
  } catch { /* fall through */ }
  return NextResponse.json(FALLBACK);
}
