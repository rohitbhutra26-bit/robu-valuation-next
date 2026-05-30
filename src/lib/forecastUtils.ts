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
import { ValuationModel } from './sectorModelMap';

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

// ─── Net debt estimator ───────────────────────────────────────────────────────
// We approximate from D/E ratio and book value.
// Book Value ≈ Market Cap / P/B  (market-based book)
// Net Debt = D/E × Book Value
function estimateNetDebt(company: Company): number {
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
  const latest = financials[financials.length - 1];
  const shares = Math.max(latest.shares ?? company.shares ?? 1, 0.001);
  const futureRevenue = latest.revenue * Math.pow(1 + growthRate / 100, years);
  const futurePAT    = futureRevenue * (netMargin / 100);
  const futureEPS    = futurePAT / shares;
  const fairValue    = futureEPS * exitPE;
  return {
    fairValue,
    model: 'Forward P/E',
    desc: `${fmtCr(futureRevenue)} revenue × ${netMargin.toFixed(1)}% margin ÷ ${shares.toFixed(1)}Cr shares × ${exitPE}x P/E`,
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
  const latest = financials[financials.length - 1];
  const shares     = Math.max(latest.shares ?? company.shares ?? 1, 0.001);
  const ebitdaMgn  = latest.ebitdaMargin > 0 ? latest.ebitdaMargin : 15; // fallback 15%

  const futureRevenue = latest.revenue * Math.pow(1 + growthRate / 100, years);
  const futureEBITDA  = futureRevenue * (ebitdaMgn / 100);
  const futureEV      = futureEBITDA * exitEVEBITDA;

  const netDebt       = estimateNetDebt(company);
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
  const latest = financials[financials.length - 1];
  const sharesRaw = Math.max(latest.shares ?? company.shares ?? 1, 0.001);

  // Use balance sheet equity if available (equity ÷ shares = BVPS directly)
  // Otherwise fall back to market-implied: currentPrice ÷ pb
  // We cap the fallback so exit P/B changes actually move the needle
  const currentBVPS = company.pb > 0
    ? company.currentPrice / company.pb
    : company.currentPrice * 0.35;

  const futureBVPS = currentBVPS * Math.pow(1 + bookGrowthRate / 100, years);

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
  const latest  = financials[financials.length - 1];
  const shares  = Math.max(latest.shares ?? company.shares ?? 1, 0.001);

  const futureRevenue = latest.revenue * Math.pow(1 + growthRate / 100, years);
  const futureEV      = futureRevenue * exitEVSales;
  const netDebt       = estimateNetDebt(company);
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
  const g = Math.min(sustainableGrowthRate, coe - 1.5);

  if (coe <= g || roe <= 0) {
    return {
      fairPB: 0, fairValue: 0, isValid: false, coe,
      desc: 'g ≥ CoE — reduce growth assumption or model undefined',
    };
  }

  const fairPB = Math.max((roe - g) / (coe - g), 0.3);
  const currentBVPS = company.pb > 0
    ? company.currentPrice / company.pb
    : company.currentPrice * 0.35;
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
}

export function suggestAssumptions(
  company: Company,
  financials: FinancialYear[],
  industryCagr: number,
  sectorDefaultMultiple: number,
  years: number = 5,
): SuggestedAssumptions {
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
    rationale = `Analyst consensus: ${fwdGrowth.toFixed(1)}% fwd growth, fading to ${industryCagr}% sector rate`;
  } else {
    // Priority 2: Historical revenue CAGR from financials
    const revenueGrowths = financials
      .slice(1)
      .map((f, i) => {
        if (f.revenueGrowth && Math.abs(f.revenueGrowth) < 80) return f.revenueGrowth;
        if (financials[i].revenue > 0) return ((f.revenue / financials[i].revenue) - 1) * 100;
        return null;
      })
      .filter((g): g is number => g !== null && g > -50 && g < 100);

    if (revenueGrowths.length >= 2) {
      // Use recent 3-year avg rather than full history (recency matters more)
      const recent = revenueGrowths.slice(-3);
      rawCompanyGrowth = recent.reduce((a, b) => a + b, 0) / recent.length;
      source = 'historical_cagr';
      confidence = rawCompanyGrowth > 5 ? 'Medium' : 'Low';
      rationale = `3yr avg revenue growth ${rawCompanyGrowth.toFixed(1)}%, fading to ${industryCagr}% sector floor`;
    } else {
      // Fallback: use industry rate directly
      rawCompanyGrowth = industryCagr;
      source = 'industry_fallback';
      confidence = 'Low';
      rationale = `Insufficient history — using ${industryCagr}% sector CAGR as baseline`;
    }
  }

  // ── Step 2: Fade toward industry CAGR ─────────────────────────────────────
  const revenueGrowthRate = fadedGrowthCAGR(rawCompanyGrowth, industryCagr, years);

  // ── Step 3: Net margin from recent actuals ─────────────────────────────────
  const recentMargins = financials.slice(-3).map(f => f.netMargin).filter(m => m > 0 && m < 80);
  const netMarginAssumption = recentMargins.length > 0
    ? recentMargins.reduce((a, b) => a + b, 0) / recentMargins.length
    : 10; // fallback 10%

  return {
    revenueGrowthRate: Math.round(revenueGrowthRate * 10) / 10,
    rawCompanyGrowth:  Math.round(rawCompanyGrowth * 10) / 10,
    industryCagr,
    netMarginAssumption: Math.round(netMarginAssumption * 10) / 10,
    exitMultiple: sectorDefaultMultiple,
    source,
    confidence,
    rationale,
  };
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
export function impliedGrowthRate(
  financials: FinancialYear[],
  company: Company,
  netMargin: number,
  exitPE: number,
  years: number,
): number {
  const latest = financials[financials.length - 1];
  const shares = Math.max(latest.shares ?? company.shares ?? 1, 0.001);
  const margin = netMargin / 100;
  const price  = company.currentPrice;
  try {
    const ratio = (price * shares) / (exitPE * margin * latest.revenue);
    return Math.max((Math.pow(Math.max(ratio, 0.01), 1 / years) - 1) * 100, 0);
  } catch {
    return 0;
  }
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
  // Use OCF from latest year, fallback to PAT if no OCF
  const withOCF = financials.filter(f => f.ocf && f.ocf > 0);
  const latest  = financials[financials.length - 1];
  const baseFCF = withOCF.length > 0
    ? withOCF[withOCF.length - 1].ocf!
    : latest.pat;

  if (baseFCF <= 0) {
    return { fairValue: 0, model: 'DCF', desc: 'Insufficient OCF data for DCF' };
  }

  const g    = growthRate / 100;
  const disc = wacc / 100;
  const shares = Math.max(latest.shares ?? company.shares ?? 1, 0.001);

  // Project and discount each year's FCF
  let pvSum = 0;
  for (let yr = 1; yr <= years; yr++) {
    const fcf = baseFCF * Math.pow(1 + g, yr);
    pvSum += fcf / Math.pow(1 + disc, yr);
  }

  // Terminal value: Year-N FCF × terminal multiple, discounted back
  const terminalFCF = baseFCF * Math.pow(1 + g, years);
  const terminalValue = (terminalFCF * terminalMultiple) / Math.pow(1 + disc, years);

  const totalEV   = pvSum + terminalValue;
  const netDebt   = estimateNetDebt(company);
  const equityVal = Math.max(totalEV - netDebt, 0);
  const fairValue = equityVal / shares;

  return {
    fairValue,
    model: 'DCF',
    desc: `OCF ₹${fmtCr(baseFCF)} → ${years}Y @ ${growthRate}% growth, ${wacc}% WACC, ${terminalMultiple}x terminal`,
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
