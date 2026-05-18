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
