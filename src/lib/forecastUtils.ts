/**
 * forecastUtils.ts
 *
 * Pure math functions — one per valuation model.
 * No React, no UI. Easy to unit-test.
 *
 * Every function returns: { fairValue (₹/share), model (short label), desc (one-liner) }
 *
 * All monetary inputs are in ₹ Crore (the unit Yahoo Finance + our API returns).
 * Shares are in Crore shares.
 * So: fairValue = ₹ Crore / Crore shares = ₹ per share ✓
 */

import { Company, FinancialYear } from './types';
import { ValuationModel, SectorProfile } from './sectorModelMap';

// ─── Data Quality Validator ───────────────────────────────────────────────────
// Runs before any model. Catches bad data from Yahoo Finance so the model
// doesn't silently produce a garbage fair value.
//
// Returns:
//   score        — 0-100 (100 = pristine, <50 = treat output with caution)
//   issues       — list of specific problems found, shown to user
//   cleanedData  — winsorised financials safe to pass to models
//   dataSource   — 'yahoo' | 'screener' (so UI can show the source)

export type DataQualityLevel = 'High' | 'Medium' | 'Low';

export interface DataQualityIssue {
  field: string;
  severity: 'warning' | 'error';
  message: string;
  detail: string;
}

export interface DataQualityResult {
  score: number;           // 0–100
  level: DataQualityLevel;
  issues: DataQualityIssue[];
  cleanedFinancials: FinancialYear[]; // outliers winsorised, nulls handled
  revenueUnitSuspect: boolean;        // true = revenue might be in wrong unit
  epsReconciled: boolean;             // true = PAT/shares ≈ reported EPS
}

// Sector-specific net margin bounds — anything outside is a data error
const MARGIN_BOUNDS: Record<string, [number, number]> = {
  'Banking':           [-5,  30],
  'Financial Services':[-5,  35],
  'NBFC':              [-5,  35],
  'Insurance':         [-5,  25],
  'Information Technology': [5, 40],
  'Technology':        [5,  40],
  'FMCG':              [5,  30],
  'Pharmaceuticals':   [3,  35],
  'Healthcare':        [3,  30],
  'Metals':            [-10, 25],
  'Metals & Mining':   [-10, 25],
  'Energy':            [-5,  20],
  'Utilities':         [3,  25],
  'Infrastructure':    [3,  25],
  'Cement':            [3,  25],
  'Automobiles':       [1,  20],
  'Electronics':       [1,  20],
  'Telecom':           [-5,  20],
  'Private Sector Bank':     [-5,  45],
  'Public Sector Bank':      [-10, 45],
  'Non Banking Financial Company (NBFC)': [-5, 50],
  'Housing Finance Company': [-5,  45],
  'Life Insurance':          [-5,  25],
};

export function validateFinancials(
  financials: FinancialYear[],
  company: Company,
): DataQualityResult {
  const issues: DataQualityIssue[] = [];
  let score = 100;

  if (financials.length === 0) {
    return {
      score: 0, level: 'Low',
      issues: [{ field: 'financials', severity: 'error', message: 'No financial data', detail: 'Zero years of data returned from API' }],
      cleanedFinancials: [],
      revenueUnitSuspect: false,
      epsReconciled: false,
    };
  }

  const latest = financials[financials.length - 1];

  // ── CHECK 1: Revenue magnitude via P/S ratio ──────────────────────────────
  // marketCap is in ₹ Crore. Revenue should also be in ₹ Crore.
  // Most companies trade at 0.2x–30x revenue (P/S).
  // If P/S < 0.05 or > 200, revenue is almost certainly in the wrong unit.
  let revenueUnitSuspect = false;
  if (company.marketCap > 0 && latest.revenue > 0) {
    const impliedPS = company.marketCap / latest.revenue;
    if (impliedPS < 0.05 || impliedPS > 500) {
      revenueUnitSuspect = true;
      score -= 30;
      issues.push({
        field: 'revenue',
        severity: 'error',
        message: `Revenue unit suspect (P/S = ${impliedPS.toFixed(1)}x)`,
        detail: `Market cap ₹${(company.marketCap/1000).toFixed(0)}K Cr ÷ revenue ₹${latest.revenue.toFixed(0)} Cr = ${impliedPS.toFixed(1)}x P/S. Normal range: 0.1x–100x. Revenue may be in wrong unit (absolute ₹ instead of ₹ Crore).`,
      });
    }
  }

  // ── CHECK 2: EPS reconciliation ───────────────────────────────────────────
  // Our EPS from PAT/shares should match the reported EPS within 25%.
  // If not, shares count is wrong — P/E model will be totally off.
  let epsReconciled = true;
  if (latest.pat > 0 && latest.shares > 0 && latest.eps > 0) {
    const derivedEPS = latest.pat / latest.shares;
    const gap = Math.abs(derivedEPS - latest.eps) / latest.eps;
    if (gap > 0.30) {
      epsReconciled = false;
      score -= 20;
      issues.push({
        field: 'shares',
        severity: 'warning',
        message: `EPS mismatch: derived ₹${derivedEPS.toFixed(1)} vs reported ₹${latest.eps.toFixed(1)} (${(gap*100).toFixed(0)}% gap)`,
        detail: `PAT ₹${latest.pat.toFixed(0)} Cr ÷ ${latest.shares.toFixed(1)} Cr shares = ₹${derivedEPS.toFixed(1)} EPS. Yahoo reports ₹${latest.eps.toFixed(1)}. Possible cause: shares in wrong unit (millions vs crores).`,
      });
    }
  }

  // ── CHECK 3: Net margin bounds ────────────────────────────────────────────
  const bounds = MARGIN_BOUNDS[company.sector];
  if (bounds) {
    const [minM, maxM] = bounds;
    financials.forEach(f => {
      if (f.netMargin < minM - 5 || f.netMargin > maxM + 10) {
        score -= 5;
        issues.push({
          field: 'netMargin',
          severity: 'warning',
          message: `${f.year}: net margin ${f.netMargin.toFixed(1)}% outside expected range (${minM}%–${maxM}%)`,
          detail: `For ${company.sector}, net margin above ${maxM}% or below ${minM}% suggests a data error in PAT or revenue.`,
        });
      }
    });
  }

  // ── CHECK 4: Growth outlier detection + winsorising ───────────────────────
  // Cap any single year's growth at ±80% before it enters CAGR calculations.
  // Flag it to the user so they know the raw data was unusual.
  const cleanedFinancials = financials.map((f, i) => {
    if (i === 0) return f;
    const prev = financials[i - 1];
    if (prev.revenue <= 0 || f.revenue <= 0) return f;
    const rawGrowth = ((f.revenue / prev.revenue) - 1) * 100;
    if (Math.abs(rawGrowth) > 100) {
      score -= 8;
      issues.push({
        field: 'revenueGrowth',
        severity: 'warning',
        message: `${f.year}: ${rawGrowth > 0 ? '+' : ''}${rawGrowth.toFixed(0)}% revenue jump — likely acquisition or restatement`,
        detail: `Revenue went from ₹${prev.revenue.toFixed(0)} Cr to ₹${f.revenue.toFixed(0)} Cr. This year excluded from CAGR calculation to prevent distortion.`,
      });
      // Winsorise: replace extreme growth year with a revenue that implies 80% growth
      const cappedRevenue = prev.revenue * (rawGrowth > 0 ? 1.8 : 0.2);
      return { ...f, revenueGrowth: rawGrowth > 0 ? 80 : -80, revenue: cappedRevenue };
    }
    return f;
  });

  // ── CHECK 5: Sufficient history ───────────────────────────────────────────
  if (financials.length < 3) {
    score -= 15;
    issues.push({
      field: 'history',
      severity: 'warning',
      message: `Only ${financials.length} year(s) of data — CAGR unreliable`,
      detail: 'Fewer than 3 years makes historical growth rate calculations statistically meaningless. Treat model output as indicative only.',
    });
  }

  score = Math.max(0, Math.min(100, score));
  const level: DataQualityLevel = score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low';

  return { score, level, issues, cleanedFinancials, revenueUnitSuspect, epsReconciled };
}

// ─── Baseline fiscal year detector ───────────────────────────────────────────
// Every valuation model starts from: baseRevenue × (1 + g)^years.
// If "latest" is a partial year (e.g., only 9 months of FY2026), the base
// revenue is artificially low → projected fair value is understated.
//
// Detection rules (either triggers "partial"):
//   1. Year string contains the current calendar year  →  likely incomplete
//   2. Latest revenue < 70% of the previous year's revenue  →  partial data
//
// Returns the last COMPLETE fiscal year as `baseline`, plus:
//   avg3yrRevenue  — 3-year average from complete years (smoother base)
//   completeYears  — financials[] with any partial tail excluded
//
export interface BaselineResult {
  baseline:            FinancialYear;
  isPartialDetected:   boolean;
  yearLabel:           string;
  avg3yrRevenue:       number;       // 3-yr average revenue (₹ Cr) — complete years only
  completeYears:       FinancialYear[];
}

export function getBaselineFinancial(financials: FinancialYear[]): BaselineResult {
  if (financials.length === 0) {
    throw new Error('getBaselineFinancial: financials array is empty');
  }

  const currentCalYear = new Date().getFullYear();
  const latest = financials[financials.length - 1];
  const prev   = financials.length >= 2 ? financials[financials.length - 2] : null;

  // Rule 1: does the year label mention the current calendar year?
  const yearStr           = String(latest.year ?? '');
  const mentionsThisYear  = yearStr.includes(String(currentCalYear));

  // Rule 2: revenue dropped >30% vs prior year — suggests partial data
  const revenueLooksPartial =
    prev !== null && prev.revenue > 0 && latest.revenue < prev.revenue * 0.70;

  const isPartialDetected = mentionsThisYear || revenueLooksPartial;

  const completeYears = isPartialDetected ? financials.slice(0, -1) : financials;

  // Guard: if after trimming we have nothing, fall back to the full array
  const safeComplete = completeYears.length > 0 ? completeYears : financials;
  const baseline     = safeComplete[safeComplete.length - 1];

  // 3-year average revenue from complete years (smoother than a single point)
  const last3          = safeComplete.slice(-3);
  const avg3yrRevenue  = Math.round(
    last3.reduce((sum, f) => sum + f.revenue, 0) / last3.length,
  );

  return {
    baseline,
    isPartialDetected,
    yearLabel:    String(baseline.year ?? 'Latest FY'),
    avg3yrRevenue,
    completeYears: safeComplete,
  };
}

export interface ModelOutput {
  fairValue: number;
  model: string;
  desc: string;
}

// ─── Formatting helper (internal) ────────────────────────────────────────────
function fmtCr(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L Cr`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
}

// ─── Growth fade engine ───────────────────────────────────────────────────────
// No company grows at 25% forever. Every projection in this file fades the
// user's growth rate linearly toward TERMINAL_GROWTH (≈ India nominal GDP)
// over the forecast horizon. Year 1 = full rate, Year N = terminal rate.
// Never fades upward: a company growing slower than terminal stays at its own rate.
export const TERMINAL_GROWTH = 6; // % — long-run India nominal GDP proxy

export function fadePath(g: number, years: number, terminal: number = TERMINAL_GROWTH): number[] {
  const end = Math.min(terminal, g); // never inflate slow growers
  const rates: number[] = [];
  for (let y = 1; y <= years; y++) {
    const t = years <= 1 ? 0 : (y - 1) / (years - 1);
    rates.push(g * (1 - t) + end * t);
  }
  return rates;
}

// Total compounded multiple over the faded path: Π(1 + r/100)
export function fadeCompound(g: number, years: number, terminal: number = TERMINAL_GROWTH): number {
  return fadePath(g, years, terminal).reduce((acc, r) => acc * (1 + r / 100), 1);
}

// Label helper: "18%→6%" or just "5%" when no fade applies
function fadeLabel(g: number, years: number): string {
  const end = Math.min(TERMINAL_GROWTH, g);
  return end < g ? `${g.toFixed(0)}%→${end.toFixed(0)}% fade` : `${g.toFixed(0)}% flat`;
}

// ─── Net debt estimator ───────────────────────────────────────────────────────
// We approximate from D/E ratio and book value.
// Book Value ≈ Market Cap / P/B  (market-based book)
// Net Debt = D/E × Book Value
function estimateNetDebt(company: Company, baseline?: FinancialYear): number {
  // Prefer REAL balance-sheet borrowings over a market-cap-derived guess (which
  // moves with the share price). Cash isn't published separately, so gross
  // borrowings is a conservative net-debt proxy.
  if (baseline && (baseline.borrowings ?? 0) > 0) return baseline.borrowings as number;
  if (company.debtToEquity <= 0 || company.pb <= 0) return 0;
  const bookValue = company.marketCap / company.pb;
  return company.debtToEquity * bookValue;
}

// ─── 1. Forward P/E model ────────────────────────────────────────────────────
// Best for: FMCG, Pharma, IT, Consumer, Auto, Cement
export function peModel(
  financials: FinancialYear[],
  company: Company,
  growthRate: number,       // revenue CAGR %
  netMargin: number,        // net margin %
  exitPE: number,
  years: number,
): ModelOutput {
  // Use last COMPLETE fiscal year as base — avoids projecting from a partial year
  const { baseline } = getBaselineFinancial(financials);
  const shares = Math.max(baseline.shares ?? company.shares ?? 1, 0.001);
  const futureRevenue = baseline.revenue * fadeCompound(growthRate, years);
  const futurePAT    = futureRevenue * (netMargin / 100);
  const futureEPS    = futurePAT / shares;
  const fairValue    = futureEPS * exitPE;
  return {
    fairValue,
    model: 'Forward P/E',
    desc: `${fmtCr(futureRevenue)} revenue (${fadeLabel(growthRate, years)}) × ${netMargin.toFixed(1)}% margin ÷ ${shares.toFixed(1)}Cr shares × ${exitPE}x P/E`,
  };
}

// ─── 2. EV/EBITDA model ───────────────────────────────────────────────────────
// Best for: Metals, Infrastructure, Energy, Utilities
export function evEbitdaModel(
  financials: FinancialYear[],
  company: Company,
  growthRate: number,
  exitEVEBITDA: number,
  years: number,
): ModelOutput {
  const { baseline, completeYears } = getBaselineFinancial(financials);
  const shares     = Math.max(baseline.shares ?? company.shares ?? 1, 0.001);
  // Mid-cycle margin: MEDIAN EBITDA margin across recent complete years — so a peak (or
  // trough) year never over/under-states a cyclical business (metals, oil, autos).
  const _mgns = completeYears.map(f => f.ebitdaMargin).filter(m => m > 0 && m < 90).slice(-5).sort((a, b) => a - b);
  const ebitdaMgn  = _mgns.length > 0 ? _mgns[Math.floor((_mgns.length - 1) / 2)]
                   : (baseline.ebitdaMargin > 0 ? baseline.ebitdaMargin : 15);

  const futureRevenue = baseline.revenue * fadeCompound(growthRate, years);
  const futureEBITDA  = futureRevenue * (ebitdaMgn / 100);
  const futureEV      = futureEBITDA * exitEVEBITDA;

  const netDebt       = estimateNetDebt(company, baseline);
  const equityValue   = Math.max(futureEV - netDebt, 0);
  const fairValue     = equityValue / shares;

  return {
    fairValue,
    model: 'EV/EBITDA',
    desc: `EBITDA ${fmtCr(futureEBITDA)} × ${exitEVEBITDA}x − Net Debt ${fmtCr(netDebt)} ÷ ${shares.toFixed(1)}Cr shares`,
  };
}

// ─── 3. Price-to-Book model ───────────────────────────────────────────────────
// Best for: Banks, NBFCs, Insurance
// Banks grow book value at roughly: (ROE − dividend payout %) per year.
// We let the user control "growth rate" as a proxy for book value growth.
export function pbModel(
  financials: FinancialYear[],
  company: Company,
  bookGrowthRate: number,   // typically ~ROE or user override
  exitPB: number,
  years: number,
): ModelOutput {
  // Current BVPS: prefer balance sheet data if available, else derive from market P/B
  const { baseline } = getBaselineFinancial(financials);
  const sharesRaw = Math.max(baseline.shares ?? company.shares ?? 1, 0.001);

  // Book value per share: prefer real balance-sheet equity, then market P/B.
  // Do NOT fabricate a book value (the old currentPrice x 0.35 made negative-net-
  // worth firms look valuable).
  const bvFromBS    = baseline.equity && baseline.equity > 0 ? baseline.equity / sharesRaw : 0;
  const currentBVPS = bvFromBS > 0
    ? bvFromBS
    : company.pb > 0 ? company.currentPrice / company.pb : 0;

  if (currentBVPS <= 0) {
    return { fairValue: 0, model: 'Price / Book', desc: "Negative or unavailable book value - P/B doesn't apply" };
  }

  // Book value compounds at the bank's SUSTAINABLE rate (ROE × retention), NOT the
  // revenue-growth slider. Feeding revenue growth (e.g. 19% for a big bank) in here
  // over-stated fair P/B value and produced haywire upside (+200%+). Payout ≈ divYield × P/E.
  const pbPayout    = company.dividendYield > 0 && company.pe > 0
    ? Math.min((company.dividendYield / 100) * company.pe, 0.9) : 0.3;
  const pbSustain   = (company.roe > 0 ? company.roe : 12) * (1 - pbPayout);
  // Cap durable book growth at 12% — even top banks rarely compound book faster after
  // dilution/payout, and an uncapped rate double-counts ROE (already in the warranted P/B).
  const bookG       = Math.min(bookGrowthRate, pbSustain, 12);
  const futureBVPS  = currentBVPS * fadeCompound(bookG, years);

  // exitPB is the RE-RATING multiple — the premium the market will pay at exit.
  // This is INDEPENDENT of current pb, so changing the slider has full effect.
  const fairValue = futureBVPS * exitPB;

  return {
    fairValue,
    model: 'Price / Book',
    desc: `BVPS ₹${currentBVPS.toFixed(0)} × (1+${bookGrowthRate.toFixed(1)}%)^${years}Y × ${exitPB}x exit P/B`,
  };
}

// ─── 4. EV/Sales model ────────────────────────────────────────────────────────
// Best for: High-growth Electronics / EMS / early-stage tech
export function evSalesModel(
  financials: FinancialYear[],
  company: Company,
  growthRate: number,
  exitEVSales: number,
  years: number,
): ModelOutput {
  const { baseline } = getBaselineFinancial(financials);
  const shares  = Math.max(baseline.shares ?? company.shares ?? 1, 0.001);

  const futureRevenue = baseline.revenue * fadeCompound(growthRate, years);
  const futureEV      = futureRevenue * exitEVSales;
  const netDebt       = estimateNetDebt(company, baseline);
  const equityValue   = Math.max(futureEV - netDebt, 0);
  const fairValue     = equityValue / shares;

  return {
    fairValue,
    model: 'EV/Sales',
    desc: `Revenue ${fmtCr(futureRevenue)} × ${exitEVSales}x EV/Sales − Net Debt ${fmtCr(netDebt)} ÷ ${shares.toFixed(1)}Cr shares`,
  };
}

// ─── 5. PEG Ratio (cross-check, not sector-specific) ─────────────────────────
export function pegModel(financials: FinancialYear[], company: Company): {
  fairValue: number; model: string; desc: string; epsCAGR: number; currentPEG: number;
} {
  const validEPS = financials.filter(f => f.eps > 0);
  if (validEPS.length < 2) {
    return { fairValue: 0, model: 'PEG Ratio', desc: 'Insufficient EPS history', epsCAGR: 0, currentPEG: 0 };
  }
  const first  = validEPS[0];
  const last   = validEPS[validEPS.length - 1];
  const yrs    = Math.max(validEPS.length - 1, 1);
  const epsCAGR = (Math.pow(last.eps / first.eps, 1 / yrs) - 1) * 100;
  const fairPE  = Math.min(Math.max(epsCAGR, 12), 65);
  const fairValue  = last.eps * fairPE;
  const currentPEG = company.pe > 0 && epsCAGR > 0 ? company.pe / epsCAGR : 0;
  return {
    fairValue,
    model: 'PEG Ratio',
    desc: `EPS CAGR ${epsCAGR.toFixed(1)}% → Fair P/E ~${fairPE.toFixed(0)}x (PEG = 1)`,
    epsCAGR,
    currentPEG,
  };
}

// ─── 6. Earnings Yield (cross-check) ─────────────────────────────────────────
export const RISK_FREE_RATE = 6.8;
const EQUITY_RISK_PREMIUM  = 5.0; // Damodaran India ERP estimate

export function earningsYieldModel(financials: FinancialYear[], company: Company): {
  fairValue: number; model: string; desc: string; currentEY: number;
} {
  const validEPS  = financials.filter(f => f.eps > 0);
  const lastValid = validEPS[validEPS.length - 1];
  const eps       = lastValid?.eps ?? 0;
  const ERP       = 3.0;
  const reqYield  = ((RISK_FREE_RATE + ERP) / 100) / 1.3;
  const fairValue = eps > 0 ? eps / reqYield : 0;
  const currentEY = company.pe > 0 ? (1 / company.pe) * 100 : 0;
  return {
    fairValue,
    model: 'Earnings Yield',
    desc: `EPS ÷ ${(reqYield * 100).toFixed(1)}% required yield (G-Sec ${RISK_FREE_RATE}% + ERP ${ERP}%)`,
    currentEY,
  };
}

// ─── 7. Gordon Growth P/B (institutional bank model) ─────────────────────────
// Used by Goldman, JPMorgan, HSBC to value banks and NBFCs.
//
// Simple idea: a bank is worth more than its book value ONLY if its ROE > Cost of Equity.
// How much more? Exactly this formula:
//   Fair P/B = (ROE − g) / (Cost of Equity − g)
//
// Example — BAJFINANCE:
//   ROE = 22%, sustainable growth g = 14%, CoE = 6.8% + 5% × 1.1 = 12.3%
//   Fair P/B = (22 − 14) / (12.3 − 14) → g > CoE, clamp g to CoE − 1.5
//   g_safe = 10.8%, Fair P/B = (22 − 10.8) / (12.3 − 10.8) = 11.2 / 1.5 = 7.5x
//   (premium justified by exceptional ROE vs cost of capital)
export function gordonGrowthPB(
  company: Company,
  sustainableGrowthRate: number, // same number as user's growth rate slider
): {
  fairPB: number;
  fairValue: number;
  desc: string;
  isValid: boolean;
  coe: number;
} {
  const roe  = company.roe > 0 ? company.roe  : 12;
  const beta = company.beta && company.beta > 0 ? company.beta : 1.0;
  const coe  = RISK_FREE_RATE + EQUITY_RISK_PREMIUM * Math.max(beta, 0.6);

  // g must be < CoE or the Gordon formula blows up (bank growing faster than its cost of capital
  // forever is mathematically impossible — we clamp it)
  // A bank's sustainable book growth is ROE x retention, not its revenue growth.
  // Feeding the revenue slider in over-states g and forces the coe-1.5 clamp for
  // most banks. Cap at the ROE-implied ceiling. Payout ~= dividendYield x P/E.
  const payout      = company.dividendYield > 0 && company.pe > 0
    ? Math.min((company.dividendYield / 100) * company.pe, 0.9) : 0.3;
  const sustainable = roe * (1 - payout);
  const g = Math.min(sustainableGrowthRate, sustainable, coe - 1.5);

  if (coe <= g || roe <= 0) {
    return {
      fairPB: 0, fairValue: 0, isValid: false, coe,
      desc: 'g ≥ CoE — reduce growth assumption or model undefined',
    };
  }

  const fairPB = Math.max((roe - g) / (coe - g), 0.3);
  // Don't fabricate book value - if P/B is unavailable, the model can't apply.
  const currentBVPS = company.pb > 0 ? company.currentPrice / company.pb : 0;
  if (currentBVPS <= 0) {
    return { fairPB, fairValue: 0, isValid: false, coe, desc: 'Book value unavailable - P/B not applicable' };
  }
  const fairValue = currentBVPS * fairPB;

  return {
    fairPB,
    fairValue,
    isValid: fairValue > 0,
    coe,
    desc: `(ROE ${roe.toFixed(1)}% − g ${g.toFixed(1)}%) ÷ (CoE ${coe.toFixed(1)}% − g) = ${fairPB.toFixed(2)}x P/B`,
  };
}

// ─── 8. Revenue volatility (σ) ────────────────────────────────────────────────
// Returns the standard deviation of historical revenue growth rates.
// A company with σ = 3% (HDFC Bank) gets tight bear/bull spreads.
// A company with σ = 18% (Tata Steel) gets wide bear/bull spreads.
// This makes scenario deltas company-specific — not sector-template guesses.
export function revenueVolatility(financials: FinancialYear[]): number {
  const growthRates = financials
    .slice(1)
    .map((f, i) => {
      // Prefer pre-computed growth field; fall back to derive it ourselves
      if (f.revenueGrowth && Math.abs(f.revenueGrowth) < 100) return f.revenueGrowth;
      if (financials[i].revenue > 0) return ((f.revenue / financials[i].revenue) - 1) * 100;
      return null;
    })
    .filter((g): g is number => g !== null && Math.abs(g) < 100);

  if (growthRates.length < 2) return 8; // fallback: 8% sigma

  const mean     = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
  const variance = growthRates.map(g => Math.pow(g - mean, 2)).reduce((a, b) => a + b, 0) / growthRates.length;
  return Math.min(Math.sqrt(variance), 35); // cap at 35% so outlier years don't dominate
}

// ─── 9. Earnings quality score ────────────────────────────────────────────────
// Gives a 0–100 quality score based on:
//   - PAT consistency (how many years had positive profit?)
//   - EBITDA margin stability (stable margins = predictable business)
//   - Revenue growth recency (growing or decelerating lately?)
//
// The score maps to an exit-multiple adjustment:
//   High Quality (80+) → exit multiple × 1.10  (market pays up for quality)
//   Average   (60–79)  → exit multiple × 1.00  (no adjustment)
//   Below avg (40–59)  → exit multiple × 0.95
//   Low         (<40)  → exit multiple × 0.85  (distressed discount)
//
// Real-world analogy: Pidilite (high quality) deserves a higher P/E than Suzlon (low quality)
// even if both are growing at the same rate, because Pidilite's earnings are more reliable.
export function earningsQualityScore(financials: FinancialYear[]): {
  score: number;
  multiplier: number;
  label: 'High Quality' | 'Average Quality' | 'Below Average' | 'Low Quality';
  breakdown: string;
} {
  if (financials.length < 3) {
    return { score: 50, multiplier: 1.0, label: 'Average Quality', breakdown: 'Insufficient history' };
  }

  // 1. Profitability consistency (0–40 pts)
  const positiveYears = financials.filter(f => f.pat > 0).length;
  const consistencyPts = Math.round((positiveYears / financials.length) * 40);

  // 2. Margin stability: low variance in EBITDA margin = stable business (0–40 pts)
  const margins = financials.map(f => f.ebitdaMargin).filter(m => m > 0 && m < 100);
  let marginPts = 20; // neutral default if no margin data
  if (margins.length >= 2) {
    const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
    const variance  = margins.map(m => Math.pow(m - avgMargin, 2)).reduce((a, b) => a + b, 0) / margins.length;
    // σ² < 5 → full 40 pts; σ² 5-20 → 20-30 pts; > 20 → 0-20 pts
    marginPts = Math.max(0, Math.min(40, Math.round(40 - variance * 1.5)));
  }

  // 3. Recent revenue momentum (0–20 pts)
  const recentGrowths = financials.slice(-2).map(f => f.revenueGrowth ?? 0).filter(g => g !== 0);
  const avgRecent = recentGrowths.length > 0 ? recentGrowths.reduce((a, b) => a + b, 0) / recentGrowths.length : 0;
  const momentumPts = avgRecent > 15 ? 20 : avgRecent > 8 ? 14 : avgRecent > 3 ? 8 : avgRecent > 0 ? 4 : 0;

  const score = Math.min(100, consistencyPts + marginPts + momentumPts);
  const multiplier = score >= 80 ? 1.10 : score >= 60 ? 1.00 : score >= 40 ? 0.95 : 0.85;

  const label: 'High Quality' | 'Average Quality' | 'Below Average' | 'Low Quality' =
    score >= 80 ? 'High Quality' : score >= 60 ? 'Average Quality' : score >= 40 ? 'Below Average' : 'Low Quality';

  return {
    score,
    multiplier,
    label,
    breakdown: `Consistency ${consistencyPts}/40 · Margin stability ${marginPts}/40 · Momentum ${momentumPts}/20`,
  };
}

// ─── 10. Fade model ────────────────────────────────────────────────────────────
// The most realistic growth assumption an analyst can make.
//
// Concept: every company eventually slows to its industry's speed.
// A startup at 40% growth won't be at 40% forever — it "fades" to sector average.
//
// This function takes:
//   companyGrowth = what the company has been doing / guided
//   industryCagr  = India sector structural rate (from INDIA_SECTOR_CAGR table)
//   years         = forecast horizon
//
// Returns a SINGLE equivalent CAGR that already has the fade baked in.
// The user sees one number. The intelligence is invisible.
//
// Fade schedule (5-year example, companyGrowth=22%, industry=11%):
//   Y1: 22%  Y2: 22%  Y3: 16.5%  Y4: 13.75%  Y5: 11%
//   Equivalent CAGR ≈ 17.0%  (vs flat 22% = massively overestimates)
export function fadedGrowthCAGR(
  companyGrowth: number,
  industryCagr: number,
  years: number,
): number {
  if (years <= 0) return industryCagr;

  // Build year-by-year growth schedule
  const yearlyRates: number[] = [];
  for (let y = 1; y <= years; y++) {
    // Linear fade: year 1 = 100% company, year N = 100% industry
    const t = (y - 1) / Math.max(years - 1, 1); // 0 → 1 over forecast period
    const rate = companyGrowth * (1 - t) + industryCagr * t;
    yearlyRates.push(rate);
  }

  // Compound the year-by-year rates into one equivalent CAGR
  const totalMultiple = yearlyRates.reduce((acc, r) => acc * (1 + r / 100), 1);
  const equivalentCAGR = (Math.pow(totalMultiple, 1 / years) - 1) * 100;

  return Math.max(equivalentCAGR, 0);
}

// ─── 11. Auto-suggest assumptions ─────────────────────────────────────────────
// This is the "less input, more intelligence" engine.
// It reads company data + historical financials + India sector CAGR
// and returns a fully pre-filled set of assumptions.
//
// The user opens a stock → sliders are already set correctly.
// They only need to change them if they have a strong personal view.
//
// Priority order for growth rate:
//   1. earningsGrowth from Yahoo Finance (forward analyst estimate) — most current
//   2. Historical revenue CAGR from financials[] — actual track record
//   3. India sector CAGR — floor / fallback
//   Then: fade all of them toward India sector CAGR over the forecast period.
export interface SuggestedAssumptions {
  revenueGrowthRate: number;      // faded CAGR — THE smart number
  rawCompanyGrowth: number;       // undimmed source before fade
  industryCagr: number;           // sector long-run rate used
  netMarginAssumption: number;    // from recent actual margins
  exitMultiple: number;           // from sector profile default
  source: 'analyst_guidance' | 'historical_cagr' | 'industry_fallback';
  confidence: 'High' | 'Medium' | 'Low';
  rationale: string;              // one line explaining the number
  // ── Revenue base context ──────────────────────────────────────────────────
  baseYearLabel:          string;   // e.g. "Mar 2025"
  baseRevenue:            number;   // revenue of the base year (₹ Cr)
  avg3yrRevenue:          number;   // 3-year average revenue (₹ Cr)
  isPartialYearDetected:  boolean;  // true = latest year was excluded as partial
}

export function suggestAssumptions(
  company: Company,
  financials: FinancialYear[],
  industryCagr: number,
  profile: SectorProfile,
  years: number = 5,
): SuggestedAssumptions {
  // ── Detect partial year + get complete history ─────────────────────────────
  // Use completeYears for all growth and margin calculations so a partial
  // current-year entry (e.g., 9 months of FY2026) never distorts the model.
  const baselineResult = getBaselineFinancial(financials);
  const { completeYears, baseline, yearLabel, avg3yrRevenue, isPartialDetected } = baselineResult;

  // ── Step 1: Find the best growth estimate ─────────────────────────────────
  let rawCompanyGrowth: number;
  let source: SuggestedAssumptions['source'];
  let confidence: SuggestedAssumptions['confidence'];
  let rationale: string;

  // Priority 1: Forward analyst estimate from Yahoo Finance
  // Backend already converts to % (e.g. 18.0 for 18% growth) — do NOT multiply by 100 again
  const fwdGrowth = company.earningsGrowth ?? 0;
  if (fwdGrowth > 2 && fwdGrowth < 60) {
    rawCompanyGrowth = fwdGrowth;
    source = 'analyst_guidance';
    confidence = 'High';
    rationale = `Analyst consensus: ${fwdGrowth.toFixed(1)}% fwd growth — model fades it to ${TERMINAL_GROWTH}% by year N · Base: ${yearLabel}`;
  } else {
    // Priority 2: Historical revenue CAGR from COMPLETE years only
    const revenueGrowths = completeYears
      .slice(1)
      .map((f, i) => {
        if (f.revenueGrowth && Math.abs(f.revenueGrowth) < 80) return f.revenueGrowth;
        if (completeYears[i].revenue > 0) return ((f.revenue / completeYears[i].revenue) - 1) * 100;
        return null;
      })
      .filter((g): g is number => g !== null && g > -50 && g < 100);

    if (revenueGrowths.length >= 2) {
      // MEDIAN of recent annual growth — robust to a single one-off year in EITHER
      // direction (an acquisition spike, a covid rebound, a one-off dip) while keeping
      // genuinely sustained growth. The old >40% filter was too eager: it wrongly capped
      // real fast-growers (e.g. RateGain's +69%/+69% → 12%). Median quietly ignores a lone
      // outlier and trusts a repeated trend.
      const recent = revenueGrowths.slice(-3);
      const sorted = [...recent].sort((a, b) => a - b);
      rawCompanyGrowth = sorted[Math.floor((sorted.length - 1) / 2)];
      source = 'historical_cagr';
      confidence = recent.length >= 3 && rawCompanyGrowth > 5 ? 'Medium' : 'Low';
      rationale = `median recent revenue growth ${rawCompanyGrowth.toFixed(1)}% — fades to ${TERMINAL_GROWTH}% by year N · Base: ${yearLabel}`;
    } else {
      // Fallback: use industry rate directly
      rawCompanyGrowth = industryCagr;
      source = 'industry_fallback';
      confidence = 'Low';
      rationale = `Insufficient history — using ${industryCagr}% sector CAGR · Base: ${yearLabel}`;
    }
  }

  // ── Step 2: No pre-fade — the models themselves now fade growth toward
  // TERMINAL_GROWTH year by year (see fadePath). Pre-fading here would
  // double-discount growth. The slider shows the honest year-1 rate.
  const revenueGrowthRate = Math.min(Math.max(rawCompanyGrowth, 1), 60);

  // ── Step 3: Sustainable (mean-reverted) net margin ────────────────────────
  // A company earning an exceptional margin today rarely holds it — competition
  // compresses it toward its normal (Nissim–Penman). So we pull the recent margin
  // 40% toward the company's OWN long-run median, then cap at a sector-normal
  // ceiling. Self-calibrating: a genuine high-margin franchise (IT, FMCG) has a
  // high long-run median too → barely moves; a peak-margin cyclical fades down.
  const recentMargins = completeYears.slice(-3).map(f => f.netMargin).filter(m => m > 0 && m < 80);
  const allMargins    = completeYears.map(f => f.netMargin).filter(m => m > 0 && m < 80).sort((a, b) => a - b);
  let netMarginAssumption: number;
  if (recentMargins.length > 0) {
    const recent  = recentMargins.reduce((a, b) => a + b, 0) / recentMargins.length;
    const longRun = allMargins.length > 0 ? allMargins[Math.floor((allMargins.length - 1) / 2)] : recent;
    const reverted = recent - 0.4 * (recent - longRun);
    const ceiling  = (MARGIN_BOUNDS[company.sector]?.[1] ?? 40) + 5;
    netMarginAssumption = Math.min(Math.max(reverted, 1), ceiling);
  } else {
    netMarginAssumption = 10;
  }

  // Exit multiple: for banks/NBFCs derive a Gordon-growth fair P/B = (ROE−g)/(CoE−g),
  // so a high-ROE bank justifies a higher multiple and a low-ROE one a lower multiple —
  // instead of a flat sector number. Falls back to the sector default for everything else.
  // Exit multiple: financials use the backtested warranted-P/B engine (ROE vs cost of
  // capital, sector-calibrated, ROE mean-reverted); everything else uses the sector
  // default (cyclicals→EV/EBITDA, consumer→P/E, etc.).
  const exitMultiple = profile.model === 'pb'
    ? warrantedPB(company, profile)
    : profile.defaultExitMultiple;

  return {
    revenueGrowthRate:       Math.round(revenueGrowthRate * 10) / 10,
    rawCompanyGrowth:        Math.round(rawCompanyGrowth * 10) / 10,
    industryCagr,
    netMarginAssumption:     Math.round(netMarginAssumption * 10) / 10,
    exitMultiple,
    source,
    confidence,
    rationale,
    baseYearLabel:           yearLabel,
    baseRevenue:             baseline.revenue,
    avg3yrRevenue,
    isPartialYearDetected:   isPartialDetected,
  };
}

// ─── Warranted P/B (financials) — backtested ROE→P/B engine ─────────────────────
// Fair P/B = (ROE_eff − g) / (CoE − g), the Gordon-growth relationship, but with:
//   • ROE mean-reversion (Nissim–Penman): spot ROE pulled 35% toward the sector
//     reference ROE, then capped to [6, 22]% (ultra-high ROE rarely persists,
//     a depressed year shouldn't crater value).
//   • sector-specific CoE & durable growth (private banks vs PSU vs NBFC differ in
//     cost of capital and growth) — calibrated on a 15-bank basket so sector-average
//     fair P/B ≈ market.
//   • clamp to [0.5, sector cap].
export function warrantedPB(company: Company, profile: SectorProfile): number {
  const coe = profile.coe ?? 12.5;
  const g   = profile.durableG ?? 9;
  const ref = profile.refROE ?? 14;
  const cap = profile.exitMultipleMax;
  const roeEff = Math.min(Math.max((company.roe || 0) - 0.35 * ((company.roe || 0) - ref), 6), 22);
  const pb = coe > g ? Math.max((roeEff - g) / (coe - g), 0.3) : cap;
  return Math.round(Math.min(Math.max(pb, 0.5), cap) * 100) / 100;
}

// ─── Earnings Power Value — the no-growth intrinsic floor (Greenwald; RIM family) ──
// What today's normalized profit is worth as a perpetuity, crediting ZERO growth:
//   EPV = normalized EPS / cost of equity.
// price − EPV = the "growth premium" baked into the price. Below EPV → cheap on current
// earnings alone; far above → you're paying mostly for future growth. A clean decomposition
// that never contradicts the headline (it explains WHY the price is what it is).
export function earningsPowerValue(company: Company, financials: FinancialYear[]): {
  fairValue: number; growthPremiumPct: number; coe: number;
} {
  const beta = company.beta && company.beta > 0 ? company.beta : 1.0;
  const coe  = (RISK_FREE_RATE + EQUITY_RISK_PREMIUM * Math.max(beta, 0.6)) / 100;
  const eps  = financials.map(f => f.eps).filter(e => e > 0).slice(-5).sort((a, b) => a - b);
  const normEPS = eps.length ? eps[Math.floor((eps.length - 1) / 2)] : (company.eps ?? 0);
  if (normEPS <= 0 || coe <= 0) return { fairValue: 0, growthPremiumPct: 0, coe: coe * 100 };
  const fairValue = normEPS / coe;
  const growthPremiumPct = company.currentPrice > 0
    ? ((company.currentPrice - fairValue) / company.currentPrice) * 100 : 0;
  return { fairValue, growthPremiumPct, coe: coe * 100 };
}

// ─── Generic dispatcher ───────────────────────────────────────────────────────
export function runPrimaryModel(
  modelType: ValuationModel,
  financials: FinancialYear[],
  company: Company,
  growthRate: number,
  netMargin: number,
  exitMultiple: number,
  years: number,
): ModelOutput {
  switch (modelType) {
    case 'ev_ebitda':
      return evEbitdaModel(financials, company, growthRate, exitMultiple, years);
    case 'pb':
      return pbModel(financials, company, growthRate, exitMultiple, years);
    case 'ev_sales':
      return evSalesModel(financials, company, growthRate, exitMultiple, years);
    case 'pe':
    default:
      return peModel(financials, company, growthRate, netMargin, exitMultiple, years);
  }
}

// ─── Implied growth (reverse-solver) ─────────────────────────────────────────
// "What revenue CAGR does today's price already imply?"
// Solves for the year-1 growth rate (with fade applied — same math as the
// models) that makes the PE model output exactly today's price. Bisection:
// fadeCompound is monotonic in g, so 40 iterations nail it to ±0.01%.
export function impliedGrowthRate(
  financials: FinancialYear[],
  company: Company,
  netMargin: number,
  exitPE: number,
  years: number,
): number {
  const { baseline } = getBaselineFinancial(financials);
  const shares = Math.max(baseline.shares ?? company.shares ?? 1, 0.001);
  const margin = netMargin / 100;
  const price  = company.currentPrice;
  if (price <= 0 || margin <= 0 || exitPE <= 0 || baseline.revenue <= 0) return 0;

  const targetMultiple = (price * shares) / (exitPE * margin * baseline.revenue);

  // Search a band wide enough to express cheap stocks the market is pricing
  // for DECLINE (negative implied growth). The old floor of lo=0 plus an early
  // "return 0" bunched every value/cheap stock at a misleading flat 0%.
  let lo = -15, hi = 100;
  if (targetMultiple <= fadeCompound(lo, years)) return lo; // priced below -15% — clamp
  if (targetMultiple >= fadeCompound(hi, years)) return hi; // priced above 100% — clamp
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fadeCompound(mid, years) < targetMultiple) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ─── DCF Model ────────────────────────────────────────────────────────────────
// Uses OCF (Operating Cash Flow) as FCF proxy — discounted at WACC
// Terminal value = Year-N FCF × terminal multiple / (WACC - terminal growth)
export function dcfModel(
  financials: FinancialYear[],
  company: Company,
  growthRate: number,    // revenue/FCF growth % for projection years
  wacc: number,          // discount rate %
  terminalMultiple: number, // exit EV multiple
  years: number,
): ModelOutput {
  // Use OCF from last COMPLETE fiscal year, fallback to PAT if no OCF
  const { baseline, completeYears } = getBaselineFinancial(financials);
  const withOCF = completeYears.filter(f => f.ocf && f.ocf > 0);
  const baseFCF = withOCF.length > 0
    ? withOCF[withOCF.length - 1].ocf!
    : baseline.pat;

  if (baseFCF <= 0) {
    return { fairValue: 0, model: 'DCF', desc: 'Insufficient OCF data for DCF' };
  }

  const disc = wacc / 100;
  const shares = Math.max(baseline.shares ?? company.shares ?? 1, 0.001);

  // Project and discount each year's FCF along the FADED growth path
  // (year 1 grows at the full rate, fading to TERMINAL_GROWTH by year N)
  const path = fadePath(growthRate, years);
  let pvSum = 0;
  let fcf = baseFCF;
  for (let yr = 1; yr <= years; yr++) {
    fcf = fcf * (1 + path[yr - 1] / 100);
    pvSum += fcf / Math.pow(1 + disc, yr);
  }

  // Terminal value: faded Year-N FCF × terminal multiple, discounted back
  const terminalValue = (fcf * terminalMultiple) / Math.pow(1 + disc, years);

  const totalEV   = pvSum + terminalValue;
  const netDebt   = estimateNetDebt(company, baseline);
  const equityVal = Math.max(totalEV - netDebt, 0);
  const fairValue = equityVal / shares;

  return {
    fairValue,
    model: 'DCF',
    desc: `OCF ${fmtCr(baseFCF)} → ${years}Y, growth ${fadeLabel(growthRate, years)}, ${wacc}% WACC, ${terminalMultiple}x terminal`,
  };
}

// ─── Graham Number ────────────────────────────────────────────────────────────
// Benjamin Graham's formula: √(22.5 × EPS × Book Value Per Share)
// Classic value investing — buy below this, sell above
export function grahamNumber(
  financials: FinancialYear[],
  company: Company,
): ModelOutput {
  // Get latest valid EPS
  const validEPS = financials.filter(f => f.eps > 0);
  const eps = validEPS.length > 0
    ? validEPS[validEPS.length - 1].eps
    : (company.eps ?? 0);

  // Book Value Per Share = Price / PB ratio
  const bvps = company.pb > 0 ? company.currentPrice / company.pb : 0;

  if (eps <= 0 || bvps <= 0) {
    return { fairValue: 0, model: 'Graham Number', desc: 'Insufficient EPS or book value data' };
  }

  const fairValue = Math.sqrt(22.5 * eps * bvps);

  return {
    fairValue,
    model: 'Graham Number',
    desc: `√(22.5 × EPS ₹${eps.toFixed(1)} × BVPS ₹${bvps.toFixed(0)}) — Graham's classic formula`,
  };
}
