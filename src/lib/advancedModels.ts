/**
 * advancedModels.ts
 *
 * Institutional-grade extensions to the valuation engine:
 *   1. monteCarloFairValue — 1,000-draw simulation over growth/margin/multiple
 *   2. redFlags            — balance-sheet reality gates (pledge, coverage, CFO/PAT, debt trend)
 *   3. reverseDcfVerdict   — market-implied growth vs what the company has delivered
 *
 * Pure math, no React. All ₹ values in Crore.
 */

import { Company, FinancialYear } from './types';
import { ValuationModel } from './sectorModelMap';
import {
  runPrimaryModel,
  revenueVolatility,
  impliedGrowthRate,
  getBaselineFinancial,
} from './forecastUtils';

// ─── Gaussian sampler (Box–Muller) ───────────────────────────────────────────
function gaussian(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

// ─── 1. Monte Carlo fair value ───────────────────────────────────────────────
// Instead of one fair value, run the sector model N times with randomly drawn
// inputs centred on the user's assumptions:
//   growth   ~ Normal(g, company's own historical revenue σ)
//   margin   ~ Normal(m, historical net-margin σ, min 1%)
//   multiple ~ Normal(exit, 12% of exit)
// Output: percentile band + probability the stock is worth more than its price.
export interface MonteCarloResult {
  p10: number; p25: number; p50: number; p75: number; p90: number;
  probUndervalued: number;   // % of draws where FV > current price
  draws: number;
  histogram: { from: number; to: number; count: number }[];
  sigmaUsed: number;
}

export function monteCarloFairValue(
  model: ValuationModel,
  financials: FinancialYear[],
  company: Company,
  growthRate: number,
  netMargin: number,
  exitMultiple: number,
  years: number,
  draws: number = 1000,
): MonteCarloResult | null {
  if (!financials.length || company.currentPrice <= 0) return null;

  const sigmaG = Math.max(revenueVolatility(financials), 2); // never zero spread

  // Historical net-margin σ
  const margins = financials.map(f => f.netMargin).filter(m => m > -50 && m < 80);
  let sigmaM = 1.5;
  if (margins.length >= 3) {
    const mean = margins.reduce((a, b) => a + b, 0) / margins.length;
    const variance = margins.reduce((a, b) => a + (b - mean) ** 2, 0) / margins.length;
    sigmaM = Math.min(Math.max(Math.sqrt(variance), 0.5), 8);
  }
  const sigmaX = Math.max(exitMultiple * 0.12, 0.2);

  const fvs: number[] = [];
  for (let i = 0; i < draws; i++) {
    const g = Math.max(gaussian(growthRate, sigmaG), -20);
    const m = Math.max(gaussian(netMargin, sigmaM), 0.5);
    const x = Math.max(gaussian(exitMultiple, sigmaX), exitMultiple * 0.3);
    try {
      const r = runPrimaryModel(model, financials, company, g, m, x, years);
      if (r.fairValue > 0 && isFinite(r.fairValue)) fvs.push(r.fairValue);
    } catch { /* skip bad draw */ }
  }
  if (fvs.length < 100) return null;

  fvs.sort((a, b) => a - b);
  const pct = (p: number) => fvs[Math.min(Math.floor((p / 100) * fvs.length), fvs.length - 1)];
  const undervalued = fvs.filter(v => v > company.currentPrice).length;

  // 12-bucket histogram between p2 and p98 (clip tails so the chart reads well)
  const lo = pct(2), hi = pct(98);
  const buckets = 12;
  const width = (hi - lo) / buckets || 1;
  const histogram = Array.from({ length: buckets }, (_, i) => ({
    from: lo + i * width,
    to: lo + (i + 1) * width,
    count: 0,
  }));
  fvs.forEach(v => {
    const idx = Math.min(Math.max(Math.floor((v - lo) / width), 0), buckets - 1);
    histogram[idx].count++;
  });

  return {
    p10: pct(10), p25: pct(25), p50: pct(50), p75: pct(75), p90: pct(90),
    probUndervalued: (undervalued / fvs.length) * 100,
    draws: fvs.length,
    histogram,
    sigmaUsed: sigmaG,
  };
}

// ─── 2. Red flags — balance-sheet reality gates ──────────────────────────────
// A stock can look 40% cheap and still be a trap. These gates catch the
// classic Indian-market traps: pledged promoter shares, profits that never
// turn into cash, debt growing faster than the business, weak coverage.
export type FlagStatus = 'pass' | 'warn' | 'fail' | 'na';

export interface RedFlag {
  name: string;
  status: FlagStatus;
  value: string;       // formatted headline number
  note: string;        // plain-English explanation
}

export interface RedFlagsResult {
  flags: RedFlag[];
  failCount: number;
  warnCount: number;
  verdict: string;
}

export function redFlags(
  financials: FinancialYear[],
  company: Company,
  model: ValuationModel,
): RedFlagsResult {
  const flags: RedFlag[] = [];
  const isBank = model === 'pb';

  // ── Gate 1: Promoter pledge ────────────────────────────────────────────────
  // null/undefined = the data source doesn't publish it for this stock — say so
  // honestly instead of pretending a clean 0%.
  const pledgeRaw = company.pledgedPct;
  if (pledgeRaw === undefined || pledgeRaw === null) {
    flags.push({ name: 'Promoter Pledge', status: 'na', value: '—',
      note: 'Pledge data not published for this stock. Check the shareholding pattern on NSE before a large position.' });
  } else {
  const pledge = pledgeRaw;
  flags.push(
    pledge > 20 ? { name: 'Promoter Pledge', status: 'fail', value: `${pledge.toFixed(1)}%`,
        note: 'Promoters pledged a big chunk of their shares as loan collateral. If the stock falls, lenders can dump those shares — a classic crash trigger.' }
    : pledge > 5 ? { name: 'Promoter Pledge', status: 'warn', value: `${pledge.toFixed(1)}%`,
        note: 'Some promoter shares are pledged. Worth watching — rising pledge is usually a stress signal.' }
    : { name: 'Promoter Pledge', status: 'pass', value: pledge > 0 ? `${pledge.toFixed(1)}%` : '0%',
        note: 'Little or no promoter shares pledged. Promoters are not borrowing against the company.' }
  );
  }

  // ── Gate 2: Interest coverage (skip for banks — interest IS their business) ─
  const latest = financials[financials.length - 1];
  if (isBank) {
    flags.push({ name: 'Interest Coverage', status: 'na', value: '—',
      note: 'Not meaningful for banks/NBFCs — lending costs are their core business.' });
  } else if (latest?.interest && latest.interest > 0 && latest.ebitda > 0) {
    const coverage = latest.ebitda / latest.interest;
    flags.push(
      coverage < 1.5 ? { name: 'Interest Coverage', status: 'fail', value: `${coverage.toFixed(1)}x`,
          note: 'Operating profit barely covers interest payments. One bad year and the company struggles to pay lenders.' }
      : coverage < 3 ? { name: 'Interest Coverage', status: 'warn', value: `${coverage.toFixed(1)}x`,
          note: 'Profit covers interest, but the cushion is thin. Watch debt levels.' }
      : { name: 'Interest Coverage', status: 'pass', value: `${coverage.toFixed(1)}x`,
          note: 'Operating profit comfortably covers interest payments.' }
    );
  } else {
    flags.push({ name: 'Interest Coverage', status: latest?.interest === 0 ? 'pass' : 'na',
      value: latest?.interest === 0 ? 'Debt-free' : '—',
      note: latest?.interest === 0 ? 'Little to no interest expense — effectively debt-free.' : 'Interest data not available yet.' });
  }

  // ── Gate 3: Cash conversion — CFO / PAT over last 3 years ───────────────────
  const recent = financials.slice(-3).filter(f => f.pat > 0 && f.ocf !== undefined);
  if (isBank) {
    flags.push({ name: 'Cash Conversion', status: 'na', value: '—',
      note: 'Not meaningful for banks — deposits distort operating cash flow.' });
  } else if (recent.length >= 2) {
    const sumPat = recent.reduce((a, f) => a + f.pat, 0);
    const sumOcf = recent.reduce((a, f) => a + (f.ocf ?? 0), 0);
    const ratio = sumPat > 0 ? sumOcf / sumPat : 0;
    flags.push(
      ratio < 0.3 ? { name: 'Cash Conversion', status: 'fail', value: `${(ratio * 100).toFixed(0)}%`,
          note: 'Reported profits are not turning into cash. Profits without cash are a major earnings-quality red flag.' }
      : ratio < 0.6 ? { name: 'Cash Conversion', status: 'warn', value: `${(ratio * 100).toFixed(0)}%`,
          note: 'Only part of reported profit becomes cash. Could be growing receivables — keep an eye on it.' }
      : { name: 'Cash Conversion', status: 'pass', value: `${(ratio * 100).toFixed(0)}%`,
          note: 'Profits convert well into actual cash — a sign of honest earnings.' }
    );
  } else {
    flags.push({ name: 'Cash Conversion', status: 'na', value: '—', note: 'Not enough cash-flow history.' });
  }

  // ── Gate 4: Debt growing faster than the business ────────────────────────────
  const withDebt = financials.filter(f => (f.borrowings ?? 0) > 0 && f.revenue > 0);
  if (isBank) {
    flags.push({ name: 'Debt Trend', status: 'na', value: '—',
      note: 'Not meaningful for banks — borrowing is how they fund lending.' });
  } else if (withDebt.length >= 3) {
    const first = withDebt[0], last = withDebt[withDebt.length - 1];
    const yrs = withDebt.length - 1;
    const debtCagr = (Math.pow(last.borrowings! / first.borrowings!, 1 / yrs) - 1) * 100;
    const revCagr  = (Math.pow(last.revenue / first.revenue, 1 / yrs) - 1) * 100;
    const excess = debtCagr - revCagr;
    flags.push(
      excess > 15 && company.debtToEquity > 1 ? { name: 'Debt Trend', status: 'fail',
          value: `Debt +${debtCagr.toFixed(0)}%/yr`,
          note: `Debt is growing much faster than sales (+${revCagr.toFixed(0)}%/yr). The business is being fuelled by borrowing, not earnings.` }
      : excess > 8 ? { name: 'Debt Trend', status: 'warn', value: `Debt +${debtCagr.toFixed(0)}%/yr`,
          note: `Debt growing faster than sales (+${revCagr.toFixed(0)}%/yr). Fine if funding expansion — bad if funding losses.` }
      : { name: 'Debt Trend', status: 'pass', value: debtCagr <= 0 ? 'Shrinking' : `+${debtCagr.toFixed(0)}%/yr`,
          note: 'Debt is stable or growing slower than the business.' }
    );
  } else if ((latest?.borrowings ?? 0) === 0 && financials.length >= 2) {
    flags.push({ name: 'Debt Trend', status: 'pass', value: 'No debt',
      note: 'No meaningful borrowings on the balance sheet.' });
  } else {
    flags.push({ name: 'Debt Trend', status: 'na', value: '—', note: 'Borrowings history not available yet.' });
  }

  const failCount = flags.filter(f => f.status === 'fail').length;
  const warnCount = flags.filter(f => f.status === 'warn').length;
  const verdict =
    failCount > 0 ? `${failCount} serious red flag${failCount > 1 ? 's' : ''} — cheap can still be a trap. Investigate before trusting the fair value.`
    : warnCount > 0 ? `${warnCount} item${warnCount > 1 ? 's' : ''} to watch — nothing fatal, but keep an eye on them.`
    : 'Balance sheet looks clean — the fair value estimate stands on solid ground.';

  return { flags, failCount, warnCount, verdict };
}

// ─── 3. Reverse DCF verdict ──────────────────────────────────────────────────
// "The market is pricing X% growth; the company has delivered Y%."
// The most honest single signal in equity valuation.
export interface ReverseDcfResult {
  impliedGrowth: number;     // % the current price assumes (year-1, faded path)
  deliveredGrowth: number;   // % historical revenue CAGR (complete years)
  historyYears: number;
  gap: number;               // implied − delivered
  verdict: 'undemanding' | 'reasonable' | 'demanding' | 'heroic';
  verdictText: string;
}

export function reverseDcfVerdict(
  financials: FinancialYear[],
  company: Company,
  netMargin: number,
  exitPE: number,
  years: number,
): ReverseDcfResult | null {
  if (financials.length < 3 || company.currentPrice <= 0) return null;

  const implied = impliedGrowthRate(financials, company, netMargin, exitPE, years);

  const { completeYears } = getBaselineFinancial(financials);
  const valid = completeYears.filter(f => f.revenue > 0);
  if (valid.length < 3) return null;
  const first = valid[0], last = valid[valid.length - 1];
  const yrs = valid.length - 1;
  const delivered = (Math.pow(last.revenue / first.revenue, 1 / yrs) - 1) * 100;

  const gap = implied - delivered;
  const verdict: ReverseDcfResult['verdict'] =
    gap <= -3 ? 'undemanding' :
    gap <= 3  ? 'reasonable'  :
    gap <= 10 ? 'demanding'   : 'heroic';

  const verdictText =
    verdict === 'undemanding'
      ? `The price assumes ${implied.toFixed(1)}% growth — the company has already been delivering ${delivered.toFixed(1)}%. The market is asking for LESS than its track record. That's a margin of safety.`
    : verdict === 'reasonable'
      ? `The price assumes ${implied.toFixed(1)}% growth, close to the ${delivered.toFixed(1)}% the company has delivered. Fairly priced — returns will follow business performance.`
    : verdict === 'demanding'
      ? `The price assumes ${implied.toFixed(1)}% growth, but the company has delivered ${delivered.toFixed(1)}%. It must accelerate just to justify today's price.`
      : `The price assumes ${implied.toFixed(1)}% growth vs ${delivered.toFixed(1)}% delivered. That gap is heroic — everything must go perfectly, and even then the upside is already paid for.`;

  return { impliedGrowth: implied, deliveredGrowth: delivered, historyYears: yrs, gap, verdict, verdictText };
}
