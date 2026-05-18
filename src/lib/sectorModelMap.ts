/**
 * sectorModelMap.ts
 *
 * Maps each sector → the valuation model that institutional analysts actually use.
 *
 * Why this matters:
 *  - HDFC Bank valued on P/E is meaningless — banks are priced on P/B
 *  - Tata Steel on P/E is misleading — cyclicals use EV/EBITDA to strip out D&A
 *  - Kaynes Technology on P/E is fine — high-growth tech sometimes uses EV/Sales
 *
 * Every sector profile also carries the scenario deltas used by ScenarioCards.
 */

export type ValuationModel = 'pe' | 'ev_ebitda' | 'pb' | 'ev_sales';

export interface SectorProfile {
  model: ValuationModel;
  sectorLabel: string;
  exitMultipleLabel: string;     // "Exit P/E" | "Exit EV/EBITDA" | "Exit P/B" | "Exit EV/Sales"
  defaultExitMultiple: number;
  exitMultipleMin: number;
  exitMultipleMax: number;
  exitMultipleStep: number;
  multipleRationale: string;     // one-line "why this model"

  // Scenario deltas from base assumptions
  bearGrowthDelta: number;
  bearMarginDelta: number;
  bearMultipleDelta: number;
  bullGrowthDelta: number;
  bullMarginDelta: number;
  bullMultipleDelta: number;
}

// ─── Helper factories ────────────────────────────────────────────────────────

function peProfile(label: string, defaultPE: number): SectorProfile {
  return {
    model: 'pe',
    sectorLabel: label,
    exitMultipleLabel: 'Exit P/E',
    defaultExitMultiple: defaultPE,
    exitMultipleMin: 5,
    exitMultipleMax: 100,
    exitMultipleStep: 1,
    multipleRationale: 'Market prices this sector on earnings — P/E is the standard lens',
    bearGrowthDelta: -6,  bearMarginDelta: -3,  bearMultipleDelta: -7,
    bullGrowthDelta:  7,  bullMarginDelta:  3,  bullMultipleDelta: 10,
  };
}

function evEbitdaProfile(label: string, defaultMult: number, min: number, max: number): SectorProfile {
  return {
    model: 'ev_ebitda',
    sectorLabel: label,
    exitMultipleLabel: 'Exit EV/EBITDA',
    defaultExitMultiple: defaultMult,
    exitMultipleMin: min,
    exitMultipleMax: max,
    exitMultipleStep: 0.5,
    multipleRationale: 'Asset-heavy / cyclical sectors — EV/EBITDA removes D&A distortion',
    bearGrowthDelta: -8,  bearMarginDelta: -4,  bearMultipleDelta: -2.0,
    bullGrowthDelta:  9,  bullMarginDelta:  4,  bullMultipleDelta:  3.0,
  };
}

function pbProfile(label: string, defaultPB: number, max: number): SectorProfile {
  return {
    model: 'pb',
    sectorLabel: label,
    exitMultipleLabel: 'Exit P/B',
    defaultExitMultiple: defaultPB,
    exitMultipleMin: 0.3,
    exitMultipleMax: max,
    exitMultipleStep: 0.1,
    multipleRationale: 'Financials valued on Book Value — ROE drives P/B premium',
    // Wider deltas — bear/bull should feel meaningfully different
    bearGrowthDelta: -6,  bearMarginDelta: -2,  bearMultipleDelta: -1.0,
    bullGrowthDelta:  7,  bullMarginDelta:  2,  bullMultipleDelta:  1.5,
  };
}

// ─── The map ─────────────────────────────────────────────────────────────────

export const SECTOR_PROFILES: Record<string, SectorProfile> = {
  // ── PE-based ──
  'Information Technology': peProfile('IT / Software', 28),
  'Technology':             peProfile('IT / Software', 28),
  'FMCG':                   peProfile('FMCG', 52),
  'Pharmaceuticals':        peProfile('Pharma', 32),
  'Healthcare':             peProfile('Healthcare', 45),
  'Automobiles':            peProfile('Auto', 22),
  'Consumer':               peProfile('Consumer', 45),
  'Consumer Discretionary': peProfile('Consumer Discretionary', 45),
  'Cement':                 peProfile('Cement', 28),
  'Telecom':                peProfile('Telecom', 35),
  'Conglomerate':           peProfile('Conglomerate', 35),

  // ── EV/EBITDA-based ──
  'Metals':           evEbitdaProfile('Metals & Mining',    6,  2, 15),
  'Metals & Mining':  evEbitdaProfile('Metals & Mining',    6,  2, 15),
  'Mining':           evEbitdaProfile('Mining',             7,  2, 15),
  'Infrastructure':   evEbitdaProfile('Infrastructure',    14,  5, 30),
  'Energy':           evEbitdaProfile('Energy / O&G',       7,  3, 18),
  'Utilities':        evEbitdaProfile('Power / Utilities',  9,  4, 20),

  // ── P/B-based ──
  'Banking':           pbProfile('Banking',           2.2,  8),
  'Financial Services':pbProfile('Financial Services', 4.5, 12),
  'NBFC':              pbProfile('NBFC',               4.5, 12),
  'Insurance':         pbProfile('Insurance',          8,   20),

  // ── EV/Sales-based (high-growth tech) ──
  'Electronics': {
    model: 'ev_sales',
    sectorLabel: 'Electronics / EMS',
    exitMultipleLabel: 'Exit EV/Sales',
    defaultExitMultiple: 2.5,
    exitMultipleMin: 0.5,
    exitMultipleMax: 10,
    exitMultipleStep: 0.25,
    multipleRationale: 'High-growth EMS / electronics priced on revenue multiple',
    bearGrowthDelta: -6,  bearMarginDelta: -1,  bearMultipleDelta: -0.5,
    bullGrowthDelta:  8,  bullMarginDelta:  1,  bullMultipleDelta:  1.0,
  },
};

export const DEFAULT_SECTOR_PROFILE: SectorProfile = peProfile('Broad Market', 25);

export function getSectorProfile(sector: string): SectorProfile {
  return SECTOR_PROFILES[sector] ?? DEFAULT_SECTOR_PROFILE;
}

// ─── Dynamic scenario deltas ──────────────────────────────────────────────────
// Instead of fixed sector-wide deltas, use the company's own revenue sigma (σ).
//
// Think of it like this:
//   HDFC Bank's revenue almost never swings more than ±5% from expectations.
//   Tata Steel's revenue can swing ±25% in a bad year (commodity cycle).
//
// So Bear/Bull spreads should be WIDER for Tata Steel and TIGHTER for HDFC Bank.
// We use 1.5× the historical revenue sigma as the growth spread, and take
// the MAX of that vs the pre-set sector floor (so we never go narrower than intended).
export interface DynamicDeltas {
  bearGrowthDelta: number;
  bullGrowthDelta: number;
  bearMarginDelta: number;
  bullMarginDelta: number;
  bearMultipleDelta: number;
  bullMultipleDelta: number;
  isCompanySpecific: boolean; // true = derived from actual history, false = sector defaults used
}

export function getDynamicDeltas(profile: SectorProfile, sigma: number): DynamicDeltas {
  // sigma = standard deviation of the company's historical revenue growth (%)
  // Minimum sigma floor = 5 so very stable companies still get some spread
  const effectiveSigma = Math.max(sigma, 5);

  // 1.5σ is approximately a ±85% confidence interval on the growth estimate
  const growthSpread = Math.round(effectiveSigma * 1.5);

  // Take whichever is wider: company-specific spread OR sector-template floor
  const bearGrowth = -Math.max(growthSpread, Math.abs(profile.bearGrowthDelta));
  const bullGrowth =  Math.max(growthSpread, Math.abs(profile.bullGrowthDelta));

  return {
    bearGrowthDelta:   bearGrowth,
    bullGrowthDelta:   bullGrowth,
    bearMarginDelta:   profile.bearMarginDelta,   // margins use sector template (we don't have per-company margin sigma yet)
    bullMarginDelta:   profile.bullMarginDelta,
    bearMultipleDelta: profile.bearMultipleDelta,
    bullMultipleDelta: profile.bullMultipleDelta,
    isCompanySpecific: sigma >= 3,                // if sigma < 3 we used the floor anyway
  };
}
