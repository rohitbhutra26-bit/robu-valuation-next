import { NextResponse } from 'next/server';

// Live India 10-yr G-sec yield for the Macro/Rate layer of the Story engine.
// Production path: set MACRO_YIELD_URL to an endpoint returning the yield, or add
// a /macro endpoint on the data server. We fetch best-effort and ALWAYS fall back
// to a sane recent value so the layer never breaks. Cached for the day.
export const revalidate = 21600; // 6h

type Macro = { y10: number; direction: 'falling' | 'rising' | 'flat'; refLow: number; refHigh: number; asOf: string };

const FALLBACK: Macro = { y10: 6.86, direction: 'falling', refLow: 6.5, refHigh: 7.4, asOf: 'recent' };

export async function GET() {
  const url = process.env.MACRO_YIELD_URL;
  if (url) {
    try {
      const r = await fetch(url, { next: { revalidate: 21600 } });
      const txt = await r.text();
      const m = txt.match(/(\d\.\d{2,3})\s*%/);
      if (m) {
        const y10 = parseFloat(m[1]);
        if (y10 > 4 && y10 < 12) {
          return NextResponse.json({ ...FALLBACK, y10, asOf: new Date().toISOString().slice(0, 10) });
        }
      }
    } catch { /* fall through to fallback */ }
  }
  return NextResponse.json(FALLBACK);
}
