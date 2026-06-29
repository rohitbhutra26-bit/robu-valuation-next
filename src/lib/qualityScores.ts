// ─── Piotroski F-Score (quality of a business) ───────────────────────────────
// "Is this a fundamentally improving business?" 0–9 in the textbook; we compute
// the 8 criteria the data feed supports (the 9th — current ratio — needs current
// assets/liabilities Screener-v2 doesn't expose yet, so we score out of 8 and say so).
// Each point = one yes/no test comparing the latest full year to the prior one.
import { FinancialYear, Company } from '@/lib/types';
import { getBaselineFinancial } from '@/lib/forecastUtils';

export interface FScore {
  score: number;          // points earned
  max: number;            // points tested (8 with this feed)
  label: string;          // Strong / Healthy / Weak
  checks: { ok: boolean; text: string }[];
}

export function piotroskiFScore(company: Company, financials: FinancialYear[]): FScore | null {
  const { completeYears } = getBaselineFinancial(financials);
  if (completeYears.length < 2) return null;
  const t = completeYears[completeYears.length - 1];
  const p = completeYears[completeYears.length - 2];

  // Prefer real total assets (now parsed from the balance sheet); fall back to the
  // capital base (equity + debt) for older rows that predate the totalAssets field.
  const base = (f: FinancialYear) => (f.totalAssets && f.totalAssets > 0) ? f.totalAssets : (f.equity ?? 0) + (f.borrowings ?? 0);
  const roa  = (f: FinancialYear) => { const c = base(f); return c > 0 ? f.pat / c : NaN; };
  const turn = (f: FinancialYear) => { const c = base(f); return c > 0 ? f.revenue / c : NaN; };
  const de   = (f: FinancialYear) => ((f.equity ?? 0) > 0 ? (f.borrowings ?? 0) / (f.equity as number) : Infinity);

  const checks: { ok: boolean; text: string }[] = [
    { ok: t.pat > 0,                                   text: 'Profitable this year' },
    { ok: (t.ocf ?? 0) > 0,                            text: 'Generates operating cash' },
    { ok: (t.ocf ?? 0) > t.pat,                        text: 'Profit backed by cash (OCF > PAT)' },
    { ok: roa(t) > roa(p),                             text: 'Return on capital rising' },
    { ok: t.netMargin > p.netMargin,                   text: 'Net margin improving' },
    { ok: de(t) < de(p) - 0.02,                        text: 'Debt/equity falling (deleveraging)' },
    { ok: (t.shares ?? 0) <= (p.shares ?? 0) * 1.02,   text: 'No meaningful share dilution' },
    { ok: turn(t) > turn(p),                           text: 'Sweating its capital harder (turnover up)' },
  ];
  const score = checks.filter(c => c.ok).length;
  const max = checks.length;
  const label = score >= 6 ? 'Strong' : score >= 4 ? 'Healthy' : 'Weak';
  return { score, max, label, checks };
}
