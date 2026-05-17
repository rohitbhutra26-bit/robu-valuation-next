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
  const shares     = Math.max(company.shares ?? 1, 0.001);
  // Current BVPS = Price ÷ P/B
  const currentBVPS = company.pb > 0 ? company.currentPrice / company.pb : company.currentPrice * 0.4;
  const futureBVPS  = currentBVPS * Math.pow(1 + bookGrowthRate / 100, years);
  const fairValue   = futureBVPS * exitPB;

  return {
    fairValue,
    model: 'Price / Book',
    desc: `BVPS ₹${currentBVPS.toFixed(0)} growing ${bookGrowthRate.toFixed(1)}%/yr × ${exitPB}x P/B over ${years}Y`,
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
const RISK_FREE_RATE = 6.8;
export { RISK_FREE_RATE };

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
