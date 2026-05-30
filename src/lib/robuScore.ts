/**
 * ROBU Score — Proprietary Valuation Intelligence Algorithm
 *
 * Standard tools show what a company earns.
 * ROBU Score shows HOW EFFICIENTLY it creates value and WHETHER that's getting better or worse.
 *
 * 5 Dimensions (each 0–100):
 * 1. ROIIC      — Return on Incremental Invested Capital (capital efficiency)
 * 2. Earnings Quality — Cash conversion + accrual trend (profit reliability)
 * 3. Execution  — Management delivery consistency (does reality match promises?)
 * 4. Moat       — Competitive advantage direction (strengthening or eroding?)
 * 5. Price Reality — Is market pricing achievable growth? (probability check)
 */

import { Company, FinancialYear } from './types';

export interface DimensionScore {
  name: string;
  score: number;         // 0–100
  label: string;         // "Exceptional" | "Strong" | "Average" | "Weak" | "Poor"
  insight: string;       // one-line plain-English explanation
  detail: string;        // deeper explanation of what was computed
  color: string;         // CSS class
}

export interface ROBUScoreResult {
  total: number;           // 0–100 weighted composite
  grade: string;           // A+ to F
  verdict: string;         // one-line verdict
  buyZone: number | null;  // price at which this becomes a buy (MoS-adjusted)
  dimensions: DimensionScore[];
  strengthFlag: string;    // biggest strength
  riskFlag: string;        // biggest red flag
  novelInsight: string;    // the one thing no other tool tells you
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}
function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}
function label(score: number): string {
  if (score >= 80) return 'Exceptional';
  if (score >= 65) return 'Strong';
  if (score >= 50) return 'Average';
  if (score >= 35) return 'Weak';
  return 'Poor';
}
function color(score: number): string {
  if (score >= 80) return 'text-gain';
  if (score >= 65) return 'text-accent';
  if (score >= 50) return 'text-gold';
  if (score >= 35) return 'text-warning';
  return 'text-loss';
}

// ─── Dimension 1: ROIIC ──────────────────────────────────────────────────────
// For each new rupee of revenue grown, how much EBITDA was added?
// High incremental EBITDA margin = capital deployed efficiently
// Also: does OCF grow faster than revenue? (cash-generative growth)
function scoreROIIC(fin: FinancialYear[]): DimensionScore {
  const full = fin.filter(f => f.ebitda > 0 && f.revenue > 0);
  if (full.length < 3) return { name: 'Capital Efficiency', score: 50, label: 'Average',
    insight: 'Insufficient data', detail: 'Need 3+ years of data', color: 'text-gold' };

  // Incremental EBITDA margins over 3-year windows
  const incMargins: number[] = [];
  for (let i = 2; i < full.length; i++) {
    const dEBITDA = full[i].ebitda - full[i - 2].ebitda;
    const dRev    = full[i].revenue - full[i - 2].revenue;
    if (dRev > 0) incMargins.push((dEBITDA / dRev) * 100);
  }

  // OCF growth vs Revenue growth (quality of cash generation)
  const ocfFin = full.filter(f => (f.ocf ?? 0) > 0);
  let ocfMultiplier = 1;
  if (ocfFin.length >= 3) {
    const ocfGrowth = (ocfFin[ocfFin.length - 1].ocf! / ocfFin[0].ocf!) ** (1 / (ocfFin.length - 1)) - 1;
    const revGrowth = (full[full.length - 1].revenue / full[0].revenue) ** (1 / (full.length - 1)) - 1;
    ocfMultiplier = ocfGrowth > revGrowth ? 1.15 : ocfGrowth > revGrowth * 0.8 ? 1.0 : 0.85;
  }

  const avgIncMargin = avg(incMargins);
  const trend = incMargins.length >= 2
    ? incMargins[incMargins.length - 1] - incMargins[0] : 0;

  // Score: incremental EBITDA margin > 30% = exceptional, 20-30% = strong, etc.
  let raw = avgIncMargin >= 35 ? 90
          : avgIncMargin >= 25 ? 75
          : avgIncMargin >= 15 ? 58
          : avgIncMargin >= 8  ? 42 : 25;

  // Bonus/penalty for trend
  raw += trend > 3 ? 8 : trend > 0 ? 3 : trend < -3 ? -8 : -3;
  const score = clamp(Math.round(raw * ocfMultiplier));

  const trendStr = trend > 2 ? 'improving' : trend < -2 ? 'declining' : 'stable';
  return {
    name: 'Capital Efficiency (ROIIC)',
    score,
    label: label(score),
    insight: `Each new ₹100 of revenue adds ₹${avgIncMargin.toFixed(1)} of EBITDA — ${trendStr} trend`,
    detail: `Incremental EBITDA margin avg ${avgIncMargin.toFixed(1)}% over ${incMargins.length} windows. OCF growth ${ocfMultiplier > 1 ? 'outpacing' : 'lagging'} revenue growth.`,
    color: color(score),
  };
}

// ─── Dimension 2: Earnings Quality ───────────────────────────────────────────
// Cash conversion (OCF/PAT) + accrual ratio trend
// High cash conversion = profits are real. Declining = warning.
function scoreEarningsQuality(fin: FinancialYear[]): DimensionScore {
  const withOCF = fin.filter(f => (f.ocf ?? 0) > 0 && f.pat > 0);
  if (withOCF.length < 2) return { name: 'Earnings Quality', score: 50, label: 'Average',
    insight: 'Limited cash flow data available', detail: 'OCF data needed for quality scoring', color: 'text-gold' };

  const conversions = withOCF.map(f => f.ocf! / f.pat);
  const avgConversion = avg(conversions);

  // Trend: is cash conversion improving or declining?
  const recent = conversions.slice(-3);
  const older  = conversions.slice(0, 3);
  const trend  = avg(recent) - avg(older);

  // Margin stability (low std dev of EBITDA margin = stable business)
  const ebitdaMargins = fin.filter(f => f.ebitdaMargin > 0).map(f => f.ebitdaMargin);
  const marginStability = ebitdaMargins.length >= 3
    ? Math.max(0, 100 - stdDev(ebitdaMargins) * 5) : 50;

  // Score
  let raw = avgConversion >= 1.1 ? 88
          : avgConversion >= 0.9 ? 75
          : avgConversion >= 0.7 ? 55
          : avgConversion >= 0.5 ? 38 : 20;

  raw += trend > 0.1 ? 7 : trend < -0.1 ? -10 : 0;
  raw = (raw * 0.7) + (marginStability * 0.3);
  const score = clamp(Math.round(raw));

  const qualityStr = avgConversion >= 1.0 ? 'generating more cash than reported profit'
    : avgConversion >= 0.8 ? 'profits mostly backed by cash'
    : 'gap between reported profit and actual cash — investigate';
  const trendStr = trend > 0.05 ? '↑ improving' : trend < -0.05 ? '↓ declining — red flag' : '→ stable';

  return {
    name: 'Earnings Quality',
    score,
    label: label(score),
    insight: `Cash conversion ${(avgConversion * 100).toFixed(0)}% — ${qualityStr}`,
    detail: `OCF/PAT ratio avg: ${avgConversion.toFixed(2)}. Trend: ${trendStr}. EBITDA margin std dev: ${stdDev(ebitdaMargins).toFixed(1)}%.`,
    color: color(score),
  };
}

// ─── Dimension 3: Management Execution ───────────────────────────────────────
// Consistency of delivery: does PAT grow in line with revenue?
// Inconsistency = management over-promises or has poor cost control
function scoreExecution(fin: FinancialYear[]): DimensionScore {
  const full = fin.filter(f => f.revenue > 0 && f.pat > 0 && f.revenueGrowth !== 0);
  if (full.length < 4) return { name: 'Management Execution', score: 50, label: 'Average',
    insight: 'Insufficient history to score execution', detail: 'Need 4+ years of data', color: 'text-gold' };

  // Revenue growth consistency (lower stddev = more predictable)
  const revGrowths  = full.map(f => f.revenueGrowth).filter(g => Math.abs(g) < 100);
  const revConsistency = revGrowths.length >= 3
    ? Math.max(0, 100 - stdDev(revGrowths) * 2.5) : 50;

  // PAT growth vs Revenue growth alignment (operating leverage)
  const patRatio = full.map((f, i) => {
    if (i === 0) return 1;
    const revG = (f.revenue - full[i-1].revenue) / full[i-1].revenue;
    const patG = (f.pat   - full[i-1].pat)   / full[i-1].pat;
    if (Math.abs(revG) < 0.01) return 1;
    return patG / revG; // > 1 = operating leverage (PAT grows faster than revenue)
  }).slice(1).filter(r => Math.abs(r) < 10);

  const avgLeverage = avg(patRatio);

  // Positive years ratio (how often does revenue actually grow?)
  const positiveYears = revGrowths.filter(g => g > 0).length;
  const growthHitRate = (positiveYears / revGrowths.length) * 100;

  let raw = (revConsistency * 0.4) + (growthHitRate * 0.4)
          + (avgLeverage > 1.2 ? 20 : avgLeverage > 0.8 ? 15 : avgLeverage > 0.5 ? 8 : 3) * 2;
  const score = clamp(Math.round(raw * 0.5));

  return {
    name: 'Management Execution',
    score,
    label: label(score),
    insight: `Revenue grew ${growthHitRate.toFixed(0)}% of years. PAT grows ${avgLeverage > 1 ? 'faster' : 'slower'} than revenue`,
    detail: `Revenue growth std dev: ${stdDev(revGrowths).toFixed(1)}%. Positive growth years: ${positiveYears}/${revGrowths.length}. Operating leverage: ${avgLeverage.toFixed(2)}x`,
    color: color(score),
  };
}

// ─── Dimension 4: Moat Durability ────────────────────────────────────────────
// Is the competitive advantage getting stronger or weaker?
// Signal: EBITDA margin trend + ROE vs cost of equity trend
function scoreMoat(fin: FinancialYear[], company: Company): DimensionScore {
  const full = fin.filter(f => f.ebitdaMargin > 0);
  if (full.length < 4) return { name: 'Moat Durability', score: 50, label: 'Average',
    insight: 'Insufficient data for moat analysis', detail: 'Need 4+ years', color: 'text-gold' };

  const margins = full.map(f => f.ebitdaMargin);
  const avgMargin = avg(margins);
  const marginStdDev = stdDev(margins);

  // Margin direction: compare first half vs second half
  const firstHalf  = margins.slice(0, Math.floor(margins.length / 2));
  const secondHalf = margins.slice(Math.floor(margins.length / 2));
  const marginDrift = avg(secondHalf) - avg(firstHalf); // positive = widening moat

  // ROIC proxy: ROE adjusted for leverage
  // If D/E is 0 (data gap), estimate from PB and ROE (DuPont: ROIC ≈ ROE × BV/EV)
  const de = company.debtToEquity > 0
    ? company.debtToEquity
    : company.pb > 0 && company.pe > 0
      // Estimate leverage: high PB + low ROE = likely leveraged
      ? Math.max(0, (company.pb / 2) - 0.5)
      : 0;
  const roic = de > 0 ? company.roe / (1 + de) : company.roe;

  // WACC proxy: 7% risk-free + beta premium (default beta=1 if missing)
  const waccProxy = 7 + (company.beta ?? 1) * 5;
  const roicWaccSpread = roic - waccProxy;

  // Score
  let raw = 50;

  // ROIC-WACC spread
  raw += roicWaccSpread >= 15 ? 25
       : roicWaccSpread >= 8  ? 18
       : roicWaccSpread >= 3  ? 10
       : roicWaccSpread >= 0  ? 2 : -10;

  // Margin stability (lower std dev = more predictable moat)
  raw += marginStdDev <= 1.5 ? 15 : marginStdDev <= 3 ? 8 : marginStdDev <= 5 ? 2 : -5;

  // Margin trend (widening = moat strengthening)
  raw += marginDrift > 2  ? 10 : marginDrift > 0 ? 5
       : marginDrift < -4 ? -15 : marginDrift < -1 ? -5 : 0;

  const score = clamp(Math.round(raw));

  const spreadStr = roicWaccSpread >= 5 ? `${roicWaccSpread.toFixed(1)}% above cost of capital — strong moat`
    : roicWaccSpread >= 0 ? `${roicWaccSpread.toFixed(1)}% above cost of capital — thin moat`
    : `${Math.abs(roicWaccSpread).toFixed(1)}% BELOW cost of capital — destroying value`;

  const driftStr = marginDrift > 1 ? 'widening' : marginDrift < -1 ? 'eroding' : 'stable';

  return {
    name: 'Moat Durability',
    score,
    label: label(score),
    insight: `ROIC-WACC spread: ${spreadStr}. Margins ${driftStr}`,
    detail: `ROIC proxy: ${roic.toFixed(1)}%. WACC proxy: ${waccProxy.toFixed(1)}%. Avg EBITDA margin: ${avgMargin.toFixed(1)}% (std dev ${marginStdDev.toFixed(1)}%). Margin drift: ${marginDrift.toFixed(1)}pp`,
    color: color(score),
  };
}

// ─── Dimension 5: Price Reality Check ────────────────────────────────────────
// What growth is the current price assuming?
// How often has this company actually achieved that growth historically?
function scorePriceReality(fin: FinancialYear[], company: Company): DimensionScore {
  const full = fin.filter(f => f.eps > 0);
  if (full.length < 3 || !company.pe || company.pe <= 0) {
    return { name: 'Price Reality', score: 50, label: 'Average',
      insight: 'Insufficient data for implied growth analysis', detail: '', color: 'text-gold' };
  }

  // Implied growth rate = what EPS growth rate justifies current PE
  // Using Gordon Growth: PE = (1 + g) / (WACC - g) → g = (PE × WACC - 1) / (PE + 1)
  const waccProxy = 7 + (company.beta ?? 1) * 5;
  const impliedG = ((company.pe * (waccProxy / 100)) - 1) / (company.pe + 1) * 100;

  // Historical EPS growth rates
  const epsGrowths: number[] = [];
  for (let i = 1; i < full.length; i++) {
    if (full[i - 1].eps > 0) {
      epsGrowths.push(((full[i].eps - full[i-1].eps) / full[i-1].eps) * 100);
    }
  }
  epsGrowths.sort((a, b) => a - b);

  // What % of historical years did EPS grow at implied rate or above?
  const achievedCount = epsGrowths.filter(g => g >= impliedG).length;
  const probability = epsGrowths.length > 0 ? (achievedCount / epsGrowths.length) * 100 : 50;

  // Median historical EPS growth
  const medianGrowth = epsGrowths.length > 0
    ? epsGrowths[Math.floor(epsGrowths.length / 2)] : 0;

  // Score: higher probability = more likely to justify current price
  let raw = probability >= 70 ? 82
          : probability >= 50 ? 65
          : probability >= 35 ? 48
          : probability >= 20 ? 32 : 18;

  // If median growth > implied growth, stock might be cheap
  if (medianGrowth > impliedG * 1.2) raw = Math.min(raw + 12, 100);
  if (medianGrowth < impliedG * 0.6) raw = Math.max(raw - 10, 0);

  const score = clamp(Math.round(raw));

  const verdictStr = probability >= 60 ? 'Price is justified by historical performance'
    : probability >= 40 ? 'Price assumes above-average execution'
    : 'Price assumes exceptional growth rarely seen historically';

  return {
    name: 'Price Reality Check',
    score,
    label: label(score),
    insight: `Market prices in ${impliedG.toFixed(1)}% EPS growth. Company achieved this ${probability.toFixed(0)}% of years`,
    detail: `Implied EPS growth at current PE ${company.pe.toFixed(1)}x: ${impliedG.toFixed(1)}%. Median historical EPS growth: ${medianGrowth.toFixed(1)}%. Hit rate: ${achievedCount}/${epsGrowths.length} years. ${verdictStr}`,
    color: color(score),
  };
}

// ─── Master ROBU Score ────────────────────────────────────────────────────────
export function computeROBUScore(
  financials: FinancialYear[],
  company: Company,
): ROBUScoreResult {
  const d1 = scoreROIIC(financials);
  const d2 = scoreEarningsQuality(financials);
  const d3 = scoreExecution(financials);
  const d4 = scoreMoat(financials, company);
  const d5 = scorePriceReality(financials, company);

  const dimensions = [d1, d2, d3, d4, d5];

  // Weighted composite: ROIIC 25%, Quality 25%, Execution 20%, Moat 20%, Price 10%
  const weights = [0.25, 0.25, 0.20, 0.20, 0.10];
  const total = clamp(Math.round(
    dimensions.reduce((sum, d, i) => sum + d.score * weights[i], 0)
  ));

  // Grade
  const grade = total >= 85 ? 'A+' : total >= 75 ? 'A' : total >= 65 ? 'B+'
              : total >= 55 ? 'B'  : total >= 45 ? 'C+' : total >= 35 ? 'C'
              : total >= 25 ? 'D'  : 'F';

  // Verdict
  const verdict = total >= 80 ? 'Exceptional compounder — rare quality'
    : total >= 65 ? 'Strong business with durable advantages'
    : total >= 50 ? 'Decent business — watch for deterioration'
    : total >= 35 ? 'Weak fundamentals — high execution risk'
    : 'Capital destroying — avoid';

  // Buy zone: fair value from Price Reality × (1 - quality discount)
  const qualityMultiplier = total >= 75 ? 1.0 : total >= 55 ? 0.85 : 0.70;
  const impliedFairPE = (company.eps ?? 0) > 0
    ? company.currentPrice / (company.eps ?? 1) * qualityMultiplier
    : null;
  const buyZone = impliedFairPE && company.eps
    ? Math.round(impliedFairPE * (company.eps ?? 0) * 0.80) : null;

  // Flags
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const strengthFlag = sorted[0].insight;
  const riskFlag = sorted[sorted.length - 1].insight;

  // Novel insight
  const novelInsight =
    d1.score < 40 && d4.score > 65
      ? 'Moat intact but capital efficiency declining — reinvestment quality deteriorating'
    : d2.score < 40 && d1.score > 65
      ? 'Growing efficiently but profits not converting to cash — investigate receivables'
    : d5.score < 35 && d4.score > 65
      ? 'Excellent business but priced for perfection — wait for a pullback'
    : d3.score > 75 && d5.score < 45
      ? 'Management consistently delivers but market has over-rewarded them'
    : d4.score < 40
      ? 'Moat eroding — ROIC falling toward cost of capital. Re-evaluate thesis.'
    : total >= 75
      ? 'All 5 dimensions aligned — rare signal of a genuine quality compounder'
    : 'Mixed signals — no single factor dominates the investment thesis';

  return { total, grade, verdict, buyZone, dimensions, strengthFlag, riskFlag, novelInsight };
}
