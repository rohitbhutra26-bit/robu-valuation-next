// Single source of truth for the cheap / fair / expensive classification.
// Every card (VerdictCard, ValuationEngine, SensitivityMatrix, ThreeLens, SummaryRail)
// MUST classify off this so the same stock never reads "cheap" on one card and "fair"
// on another.
//
// The verdict is ANNUALISED. A fair value is the price N years out (it bakes in N years
// of growth), so total upside must be turned into a per-year return (CAGR) before judging
// — otherwise +30% "over 5 years" (≈5%/yr, i.e. mediocre) would be mislabelled "very cheap".

// CAGR (%/yr) cutoffs — the implied annual return from today's price to fair value.
export const VERDICT_CAGR = {
  veryCheap: 16,   // >16%/yr implied return → genuinely under-priced
  cheap: 10,       // 10–16%/yr
  fair: -4,        // -4–10%/yr → roughly fairly priced (band straddles 0 = at fair value)
  expensive: -11,  // -11–-4%/yr
} as const;        // < -11%/yr → very expensive

// Legacy total-% cutoffs kept for any non-horizon use.
export const VERDICT_CUTOFFS = { veryCheap: 30, cheap: 12, expensive: -12, veryExpensive: -30 } as const;

export type VerdictKey = 'very-cheap' | 'cheap' | 'fair' | 'expensive' | 'very-expensive';
export type VerdictTone = 'gain' | 'warning' | 'loss';

// Convert a TOTAL upside-to-fair-value (%) over `years` into an annualised return (%/yr).
export function annualise(upsidePct: number, years: number): number {
  const y = Math.max(years || 5, 1);
  const r = 1 + upsidePct / 100;
  if (r <= 0) return -100;
  return (Math.pow(r, 1 / y) - 1) * 100;
}

export function verdictKey(upsidePct: number, years: number = 5): VerdictKey {
  const c = annualise(upsidePct, years);
  if (c >= VERDICT_CAGR.veryCheap) return 'very-cheap';
  if (c >= VERDICT_CAGR.cheap) return 'cheap';
  if (c >= VERDICT_CAGR.fair) return 'fair';
  if (c >= VERDICT_CAGR.expensive) return 'expensive';
  return 'very-expensive';
}

export function verdictTone(upsidePct: number, years: number = 5): VerdictTone {
  const k = verdictKey(upsidePct, years);
  if (k === 'very-cheap' || k === 'cheap') return 'gain';
  if (k === 'fair') return 'warning';
  return 'loss';
}
