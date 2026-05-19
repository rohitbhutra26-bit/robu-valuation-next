/**
 * aiInsight.ts
 *
 * Rules-based equity research engine.
 * Reads computed metrics → writes a structured stock analysis.
 *
 * Think of it like a junior analyst who has read every metric on the screen
 * and summarises: what does this stock look like? What could go right? Wrong?
 *
 * No API key, no cost, works for every Indian stock instantly.
 */

import { Company, FinancialYear } from './types';

export interface StockInsight {
  summary: string;
  bull: string;
  bear: string;
  verdict: 'Strong Buy' | 'Buy' | 'Accumulate' | 'Hold' | 'Reduce' | 'Sell';
  verdictColor: string;   // Tailwind class
  confidence: 'High' | 'Medium' | 'Low';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function revenueCAGR(fins: FinancialYear[]): number {
  if (fins.length < 2) return 0;
  const first = fins[0].revenue;
  const last  = fins[fins.length - 1].revenue;
  if (!first || !last || first <= 0) return 0;
  const years = fins.length - 1;
  return Math.round(((last / first) ** (1 / years) - 1) * 100);
}

function avgMargin(fins: FinancialYear[]): number {
  if (!fins.length) return 0;
  const valid = fins.filter(f => f.netMargin > 0);
  if (!valid.length) return 0;
  return +(valid.reduce((s, f) => s + f.netMargin, 0) / valid.length).toFixed(1);
}

function latestEPS(fins: FinancialYear[]): number {
  return fins.length > 0 ? fins[fins.length - 1].eps : 0;
}

// ── Valuation label ───────────────────────────────────────────────────────────

function valuationLabel(company: Company): { label: string; cheap: boolean; expensive: boolean } {
  const isBanking = /bank|nbfc|financ|insur/i.test(company.sector);
  if (isBanking) {
    if (company.pb < 1.2) return { label: 'deeply discounted on P/B', cheap: true, expensive: false };
    if (company.pb < 2.0) return { label: 'reasonably valued on P/B', cheap: false, expensive: false };
    if (company.pb < 3.5) return { label: 'fairly priced for a quality bank', cheap: false, expensive: false };
    return { label: 'trading at a premium P/B multiple', cheap: false, expensive: true };
  }
  const pe = company.pe;
  if (pe <= 0)  return { label: 'loss-making or P/E not meaningful', cheap: false, expensive: false };
  if (pe < 12)  return { label: 'deeply undervalued on P/E', cheap: true, expensive: false };
  if (pe < 20)  return { label: 'attractively valued', cheap: true, expensive: false };
  if (pe < 30)  return { label: 'fairly valued', cheap: false, expensive: false };
  if (pe < 45)  return { label: 'trading at a growth premium', cheap: false, expensive: true };
  return { label: 'expensive — priced for perfection', cheap: false, expensive: true };
}

// ── Quality label ─────────────────────────────────────────────────────────────

function qualityLabel(company: Company): { label: string; score: number } {
  const roe = company.roe;
  if (roe >= 25) return { label: 'exceptional capital efficiency (ROE ' + roe.toFixed(0) + '%)', score: 3 };
  if (roe >= 18) return { label: 'strong returns on equity (ROE ' + roe.toFixed(0) + '%)', score: 2 };
  if (roe >= 12) return { label: 'decent profitability (ROE ' + roe.toFixed(0) + '%)', score: 1 };
  if (roe >= 5)  return { label: 'modest returns (ROE ' + roe.toFixed(0) + '%)', score: 0 };
  return { label: 'weak returns on equity (ROE ' + roe.toFixed(0) + '%)', score: -1 };
}

// ── Debt label ────────────────────────────────────────────────────────────────

function debtLabel(company: Company): { label: string; risky: boolean } {
  const isBanking = /bank|nbfc|financ|insur/i.test(company.sector);
  if (isBanking) return { label: 'leverage is normal for a lending business', risky: false };
  const d2e = company.debtToEquity;
  if (d2e <= 0.1) return { label: 'virtually debt-free balance sheet', risky: false };
  if (d2e <= 0.5) return { label: 'conservative balance sheet', risky: false };
  if (d2e <= 1.2) return { label: 'moderate leverage', risky: false };
  if (d2e <= 2.5) return { label: 'elevated debt level', risky: true };
  return { label: 'high leverage — watch interest coverage', risky: true };
}

// ── Growth label ──────────────────────────────────────────────────────────────

function growthLabel(cagr: number): string {
  if (cagr >= 25) return `high-velocity growth (${cagr}% revenue CAGR)`;
  if (cagr >= 15) return `solid double-digit growth (${cagr}% revenue CAGR)`;
  if (cagr >= 8)  return `steady growth (${cagr}% revenue CAGR)`;
  if (cagr >= 0)  return `slow-growth profile (${cagr}% revenue CAGR)`;
  return `revenue decline (${cagr}% CAGR — needs watching)`;
}

// ── Main engine ───────────────────────────────────────────────────────────────

export function generateInsight(company: Company, financials: FinancialYear[]): StockInsight {
  const cagr    = revenueCAGR(financials);
  const margin  = avgMargin(financials);
  const eps     = latestEPS(financials);
  const val     = valuationLabel(company);
  const quality = qualityLabel(company);
  const debt    = debtLabel(company);
  const isBanking = /bank|nbfc|financ|insur/i.test(company.sector);

  // ── Composite signal score ─────────────────────────────────────────────────
  // Each factor adds/subtracts points → maps to verdict
  let score = 0;

  // Valuation (max ±3)
  if (val.cheap)    score += 2;
  if (val.expensive) score -= 2;

  // Quality (max ±3)
  score += quality.score;

  // Growth (max ±2)
  if (cagr >= 20)    score += 2;
  else if (cagr >= 12) score += 1;
  else if (cagr < 0)   score -= 2;
  else if (cagr < 5)   score -= 1;

  // Debt risk (max -2)
  if (debt.risky) score -= 2;

  // Margins (max ±1)
  if (margin > 20) score += 1;
  else if (margin < 5 && !isBanking) score -= 1;

  // ── Verdict ───────────────────────────────────────────────────────────────
  let verdict: StockInsight['verdict'];
  let verdictColor: string;

  if (score >= 5) {
    verdict = 'Strong Buy'; verdictColor = 'text-gain';
  } else if (score >= 3) {
    verdict = 'Buy'; verdictColor = 'text-gain';
  } else if (score >= 1) {
    verdict = 'Accumulate'; verdictColor = 'text-gold';
  } else if (score >= -1) {
    verdict = 'Hold'; verdictColor = 'text-gold';
  } else if (score >= -3) {
    verdict = 'Reduce'; verdictColor = 'text-loss';
  } else {
    verdict = 'Sell'; verdictColor = 'text-loss';
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const marginNote = margin > 0
    ? ` Net margins average ${margin}% over the last ${financials.length} years.`
    : '';

  const summary =
    `${company.name} is ${val.label}, with ${quality.label} and ${growthLabel(cagr)}. ` +
    `The balance sheet shows ${debt.label}.${marginNote} ` +
    `${isBanking
      ? `As a ${company.sector} business, key drivers are NIM expansion, asset quality, and credit growth.`
      : `The sector is ${company.sector}, where competitive moat and pricing power determine long-run margins.`}`;

  // ── Bull case ─────────────────────────────────────────────────────────────
  const bullPoints: string[] = [];

  if (val.cheap)
    bullPoints.push(`Valuation re-rating potential — market is pricing in too much pessimism.`);
  if (quality.score >= 2)
    bullPoints.push(`Consistent high ROE (${company.roe.toFixed(0)}%) signals a durable competitive advantage.`);
  if (cagr >= 15)
    bullPoints.push(`${cagr}% revenue CAGR over ${financials.length} years shows an accelerating business.`);
  if (company.roe > company.pe * 0.6 && company.pe > 0)
    bullPoints.push(`ROE significantly exceeds cost of equity — the business compounds value.`);
  if (!debt.risky)
    bullPoints.push(`Clean balance sheet means management can invest in growth or return cash to shareholders.`);
  if (margin > 20)
    bullPoints.push(`Premium margins (${margin}%) suggest strong pricing power in a competitive market.`);
  if (company.earningsGrowth && company.earningsGrowth > 15)
    bullPoints.push(`Forward earnings growth of ${company.earningsGrowth.toFixed(0)}% — analyst consensus is positive.`);

  // Fallback
  if (bullPoints.length === 0)
    bullPoints.push(`Any improvement in sector tailwinds or management execution could re-rate the stock.`);

  // ── Bear case ─────────────────────────────────────────────────────────────
  const bearPoints: string[] = [];

  if (val.expensive)
    bearPoints.push(`Rich valuation leaves little room for error — any earnings miss could compress the multiple.`);
  if (quality.score <= 0)
    bearPoints.push(`Sub-optimal returns on equity (${company.roe.toFixed(0)}%) indicate capital allocation issues.`);
  if (cagr < 5 && cagr >= 0)
    bearPoints.push(`Single-digit revenue growth may not justify current multiples.`);
  if (cagr < 0)
    bearPoints.push(`Revenue contraction is a red flag — business may be losing market share or facing structural headwinds.`);
  if (debt.risky)
    bearPoints.push(`Elevated debt (D/E ${company.debtToEquity.toFixed(1)}x) makes the business sensitive to rising interest rates.`);
  if (margin < 8 && !isBanking)
    bearPoints.push(`Thin margins leave limited buffer against raw material cost spikes or competitive pricing pressure.`);
  if (company.pe > 40)
    bearPoints.push(`P/E of ${company.pe.toFixed(0)}x is pricing in years of future growth — any slowdown hurts disproportionately.`);

  // Fallback
  if (bearPoints.length === 0)
    bearPoints.push(`Macro headwinds, sector slowdown, or execution risk could derail the growth trajectory.`);

  // Confidence: more financial history = higher confidence
  const confidence: StockInsight['confidence'] =
    financials.length >= 4 ? 'High' :
    financials.length >= 2 ? 'Medium' : 'Low';

  return {
    summary,
    bull:   bullPoints.slice(0, 2).join(' '),
    bear:   bearPoints.slice(0, 2).join(' '),
    verdict,
    verdictColor,
    confidence,
  };
}
