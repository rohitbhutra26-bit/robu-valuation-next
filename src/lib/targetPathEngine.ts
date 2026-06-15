/**
 * targetPathEngine.ts
 *
 * Reverse-valuation engine.
 * Instead of "what is this stock worth?" we ask:
 * "What has to be TRUE for this stock to reach ₹X?"
 *
 * Three independent solvers — fix two variables, solve for the third:
 *   1. Required Revenue CAGR (fix margin + multiple)
 *   2. Required Margin      (fix growth + multiple)
 *   3. Required Exit Multiple (fix growth + margin)
 *
 * Then each solved value is benchmarked against the company's own history
 * and the sector median to produce a plain-English feasibility verdict.
 */

import { Company, FinancialYear, ValuationAssumptions } from './types';
import { ValuationModel } from './sectorModelMap';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Feasibility = 'achievable' | 'ambitious' | 'difficult' | 'unrealistic';

export interface PathRequirement {
  value: number;                 // the required number
  label: string;                 // "Revenue CAGR" etc.
  unit: string;                  // "%" or "x"
  feasibility: Feasibility;
  context: string;               // "vs 3Y avg: 12%" — one liner benchmark
  explanation: string;           // plain-English sentence
}

export interface TargetPathResult {
  targetPrice: number;
  years: number;
  currentPrice: number;
  requiredReturn: number;        // % total return to reach target
  requiredCAGR: number;          // annualised

  growth:   PathRequirement;
  margin:   PathRequirement;
  multiple: PathRequirement;

  overall: Feasibility;
  summary: string;               // 2–3 sentence plain English verdict
}

// ─── Feasibility classifier ───────────────────────────────────────────────────

function classify(required: number, reference: number, thresholds: [number, number, number]): Feasibility {
  // thresholds = [achievable_limit, ambitious_limit, difficult_limit] as % above reference
  const pctAbove = reference > 0 ? (required - reference) / reference : required;
  if (pctAbove <= thresholds[0]) return 'achievable';
  if (pctAbove <= thresholds[1]) return 'ambitious';
  if (pctAbove <= thresholds[2]) return 'difficult';
  return 'unrealistic';
}

function worstOf(...fs: Feasibility[]): Feasibility {
  const rank: Record<Feasibility, number> = { achievable: 0, ambitious: 1, difficult: 2, unrealistic: 3 };
  return fs.reduce((worst, f) => rank[f] > rank[worst] ? f : worst, 'achievable');
}

// ─── Historical stats helpers ─────────────────────────────────────────────────

function historicalRevenueCAGR(financials: FinancialYear[]): number {
  if (financials.length < 2) return 0;
  const first = financials[0];
  const last  = financials[financials.length - 1];
  const n     = financials.length - 1;
  if (first.revenue <= 0) return 0;
  return (Math.pow(last.revenue / first.revenue, 1 / n) - 1) * 100;
}

function historicalMarginAvg(financials: FinancialYear[]): number {
  const valid = financials.filter(f => f.netMargin > 0);
  if (!valid.length) return 0;
  return valid.reduce((s, f) => s + f.netMargin, 0) / valid.length;
}

function estimateNetDebt(company: Company): number {
  if (company.debtToEquity <= 0 || company.pb <= 0) return 0;
  const bookValue = company.marketCap / company.pb;
  return company.debtToEquity * bookValue;
}

// ─── Per-model reverse solvers ────────────────────────────────────────────────

function solvePE(
  target: number, fixedMargin: number, fixedPE: number,
  revenue: number, shares: number, years: number,
): number {
  // target = (rev × (1+g)^n × margin/100 / shares) × PE  → solve g
  const ratio = (target * shares) / (fixedPE * (fixedMargin / 100) * revenue);
  if (ratio <= 0) return 0;
  return (Math.pow(ratio, 1 / years) - 1) * 100;
}

function solvePEMargin(
  target: number, fixedGrowth: number, fixedPE: number,
  revenue: number, shares: number, years: number,
): number {
  // margin = target × shares / (rev × (1+g)^n × PE) × 100
  const futureRev = revenue * Math.pow(1 + fixedGrowth / 100, years);
  if (futureRev <= 0 || fixedPE <= 0) return 0;
  return (target * shares / (futureRev * fixedPE)) * 100;
}

function solvePEMultiple(
  target: number, fixedGrowth: number, fixedMargin: number,
  revenue: number, shares: number, years: number,
): number {
  // PE = target × shares / (rev × (1+g)^n × margin/100)
  const futureRev = revenue * Math.pow(1 + fixedGrowth / 100, years);
  if (futureRev <= 0 || fixedMargin <= 0) return 0;
  return (target * shares) / (futureRev * (fixedMargin / 100));
}

function solveEVEBITDAGrowth(
  target: number, ebitdaMargin: number, fixedMult: number,
  revenue: number, shares: number, netDebt: number, years: number,
): number {
  // target = (rev×(1+g)^n × ebitdaMgn/100 × mult − netDebt) / shares
  // → rev×(1+g)^n = (target×shares + netDebt) / (ebitdaMgn/100 × mult)
  const numerator = target * shares + netDebt;
  const denominator = (ebitdaMargin / 100) * fixedMult;
  if (denominator <= 0) return 0;
  const ratio = numerator / denominator / revenue;
  if (ratio <= 0) return 0;
  return (Math.pow(ratio, 1 / years) - 1) * 100;
}

function solveEVEBITDAMultiple(
  target: number, fixedGrowth: number, ebitdaMargin: number,
  revenue: number, shares: number, netDebt: number, years: number,
): number {
  // mult = (target×shares + netDebt) / (futureRev × ebitdaMgn/100)
  const futureRev = revenue * Math.pow(1 + fixedGrowth / 100, years);
  const denom = futureRev * (ebitdaMargin / 100);
  if (denom <= 0) return 0;
  return (target * shares + netDebt) / denom;
}

function solvePBGrowth(
  target: number, fixedPB: number,
  currentBVPS: number, years: number,
): number {
  // target = currentBVPS × (1+g)^n × PB  → g = (target/PB/BVPS)^(1/n) - 1
  const ratio = target / fixedPB / currentBVPS;
  if (ratio <= 0) return 0;
  return (Math.pow(ratio, 1 / years) - 1) * 100;
}

function solvePBMultiple(
  target: number, fixedGrowth: number,
  currentBVPS: number, years: number,
): number {
  const futureBVPS = currentBVPS * Math.pow(1 + fixedGrowth / 100, years);
  if (futureBVPS <= 0) return 0;
  return target / futureBVPS;
}

// ─── Main function ────────────────────────────────────────────────────────────

export function computeTargetPath(
  targetPrice: number,
  model: ValuationModel,
  company: Company,
  financials: FinancialYear[],
  assumptions: ValuationAssumptions,
  sectorDefaultMultiple: number,
): TargetPathResult | null {
  if (!financials.length || targetPrice <= 0) return null;

  const latest = financials[financials.length - 1];
  const shares = Math.max(latest.shares ?? company.shares ?? 1, 0.001);
  const years  = assumptions.years;

  const histGrowth   = historicalRevenueCAGR(financials);
  const histMarginAvg = historicalMarginAvg(financials);
  const netDebt      = estimateNetDebt(company);
  const currentBVPS  = company.pb > 0 ? company.currentPrice / company.pb : company.currentPrice * 0.4;
  const ebitdaMargin = latest.ebitdaMargin > 0 ? latest.ebitdaMargin : 15;

  const totalReturn  = (targetPrice / company.currentPrice - 1) * 100;
  const requiredCAGR = (Math.pow(Math.max(targetPrice / company.currentPrice, 0.001), 1 / years) - 1) * 100;

  let reqGrowth = 0, reqMargin = 0, reqMultiple = 0;

  // ── Solve per model ──────────────────────────────────────────────────────
  if (model === 'pe') {
    reqGrowth   = solvePE(targetPrice, assumptions.netMarginAssumption, assumptions.exitMultiple, latest.revenue, shares, years);
    reqMargin   = solvePEMargin(targetPrice, assumptions.revenueGrowthRate, assumptions.exitMultiple, latest.revenue, shares, years);
    reqMultiple = solvePEMultiple(targetPrice, assumptions.revenueGrowthRate, assumptions.netMarginAssumption, latest.revenue, shares, years);
  } else if (model === 'ev_ebitda') {
    reqGrowth   = solveEVEBITDAGrowth(targetPrice, ebitdaMargin, assumptions.exitMultiple, latest.revenue, shares, netDebt, years);
    reqMargin   = ebitdaMargin; // for EV/EBITDA we use actual margin — margin solver not relevant
    reqMultiple = solveEVEBITDAMultiple(targetPrice, assumptions.revenueGrowthRate, ebitdaMargin, latest.revenue, shares, netDebt, years);
  } else if (model === 'pb') {
    reqGrowth   = solvePBGrowth(targetPrice, assumptions.exitMultiple, currentBVPS, years);
    reqMargin   = assumptions.netMarginAssumption; // not applicable for P/B
    reqMultiple = solvePBMultiple(targetPrice, assumptions.revenueGrowthRate, currentBVPS, years);
  } else {
    // ev_sales — similar structure to ev_ebitda
    reqGrowth   = solveEVEBITDAGrowth(targetPrice, 100, assumptions.exitMultiple, latest.revenue, shares, netDebt, years);
    reqMargin   = assumptions.netMarginAssumption;
    reqMultiple = solveEVEBITDAMultiple(targetPrice, assumptions.revenueGrowthRate, 100, latest.revenue, shares, netDebt, years);
  }

  // ── Feasibility ──────────────────────────────────────────────────────────

  // Growth: how far above historical CAGR is required?
  const growthFeasibility = (() => {
    if (reqGrowth < 0) return 'unrealistic' as Feasibility;
    const ref = Math.max(histGrowth, 5);
    return classify(reqGrowth, ref, [0.1, 0.35, 0.65]);
  })();

  // Margin: how far above historical average?
  const marginFeasibility: Feasibility = (() => {
    if (model === 'ev_ebitda' || model === 'pb' || model === 'ev_sales') return 'achievable';
    if (reqMargin < 0) return 'unrealistic';
    const ref = Math.max(histMarginAvg, 1);
    return classify(reqMargin, ref, [0.1, 0.3, 0.6]);
  })();

  // Multiple: how far above current / sector median?
  const multipleFeasibility = (() => {
    if (reqMultiple < 0) return 'unrealistic' as Feasibility;
    const ref = sectorDefaultMultiple;
    return classify(reqMultiple, ref, [0.15, 0.5, 1.0]);
  })();

  const overall = worstOf(growthFeasibility, marginFeasibility, multipleFeasibility);

  // ── Build plain-English summary ──────────────────────────────────────────
  const multipleLabel = model === 'pe' ? 'P/E' : model === 'pb' ? 'P/B' : model === 'ev_sales' ? 'EV/Sales' : 'EV/EBITDA';

  const feasibilityPhrases: Record<Feasibility, string> = {
    achievable:  'well within reach given historical performance',
    ambitious:   'above historical norms but not impossible with strong execution',
    difficult:   'a significant stretch — requires a major step-change in performance',
    unrealistic: 'very unlikely given historical data and sector benchmarks',
  };

  const summary = (() => {
    const sym = company.symbol.replace('.NS','').replace('.BO','');
    const grow = `revenue growing at ${reqGrowth.toFixed(1)}% CAGR (vs ${histGrowth.toFixed(1)}% historically)`;
    const mult = `${multipleLabel} re-rating to ${reqMultiple.toFixed(model === 'pb' ? 1 : 0)}x (sector median: ${sectorDefaultMultiple}x)`;

    if (overall === 'achievable') {
      return `The path to ₹${targetPrice.toLocaleString('en-IN')} looks realistic for ${sym}. It requires ${grow} and a ${mult}. Both are ${feasibilityPhrases.achievable}.`;
    }
    if (overall === 'ambitious') {
      return `Reaching ₹${targetPrice.toLocaleString('en-IN')} is ambitious but possible for ${sym}. It needs ${grow} — that's ${feasibilityPhrases.ambitious}. Management execution and sector tailwinds matter a lot here.`;
    }
    if (overall === 'difficult') {
      return `₹${targetPrice.toLocaleString('en-IN')} is a steep target for ${sym}. It implies ${grow}. This is ${feasibilityPhrases.difficult}. Such scenarios do happen, but require sustained outperformance over ${years} years.`;
    }
    return `₹${targetPrice.toLocaleString('en-IN')} looks unrealistic for ${sym} within ${years} years. It would require ${grow} — ${feasibilityPhrases.unrealistic}. Consider a longer horizon or a lower target.`;
  })();

  // ── Assemble result ───────────────────────────────────────────────────────
  const growth: PathRequirement = {
    value: reqGrowth,
    label: model === 'pb' ? 'Book Value Growth' : 'Revenue CAGR',
    unit: '%',
    feasibility: growthFeasibility,
    context: `vs ${years}Y historical avg: ${histGrowth.toFixed(1)}%`,
    explanation:
      model === 'pb'
        ? `Book value must compound at ${reqGrowth.toFixed(1)}%/yr (ROE is currently ${company.roe.toFixed(1)}%)`
        : `Revenue must grow at ${reqGrowth.toFixed(1)}% p.a. — you've averaged ${histGrowth.toFixed(1)}% over ${financials.length - 1} years`,
  };

  const margin: PathRequirement = {
    value: reqMargin,
    label: model === 'ev_ebitda' ? 'EBITDA Margin (locked)' : model === 'pb' ? 'Not applicable (P/B model)' : 'Net Margin',
    unit: '%',
    feasibility: marginFeasibility,
    context: `vs historical avg: ${histMarginAvg.toFixed(1)}%`,
    explanation:
      model === 'pe'
        ? `Net margin must expand to ${reqMargin.toFixed(1)}% — your 5Y average is ${histMarginAvg.toFixed(1)}%`
        : `Margin solver not applicable for ${multipleLabel} model — EBITDA margin is taken from latest actuals`,
  };

  const multiple: PathRequirement = {
    value: reqMultiple,
    label: `Exit ${multipleLabel}`,
    unit: 'x',
    feasibility: multipleFeasibility,
    context: `sector median: ${sectorDefaultMultiple}x · current: ${
      model === 'pe' ? company.pe.toFixed(1) :
      model === 'pb' ? company.pb.toFixed(1) :
      assumptions.exitMultiple.toFixed(1)
    }x`,
    explanation: `Market must value the company at ${reqMultiple.toFixed(model === 'pb' ? 1 : 0)}x at exit — sector median is ${sectorDefaultMultiple}x`,
  };

  return {
    targetPrice,
    years,
    currentPrice: company.currentPrice,
    requiredReturn: totalReturn,
    requiredCAGR,
    growth,
    margin,
    multiple,
    overall,
    summary,
  };
}
