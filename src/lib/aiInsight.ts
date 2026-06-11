/**
 * aiInsight.ts
 *
 * Rules-based equity research engine, v2.
 * Reads every computed metric → writes a structured, evidence-cited analysis:
 * not "the stock looks good" but "revenue compounded 14% for 9 years, margins
 * expanded from 8% to 12%, and ₹93 of every ₹100 of profit arrived as cash."
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
  /** Multi-paragraph written thesis for reports — why consider / why not */
  thesis: string[];
  /** 2–3 things an owner of this stock should monitor each quarter */
  watch: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cagr(first: number, last: number, years: number): number {
  if (first <= 0 || last <= 0 || years <= 0) return 0;
  return Math.round(((last / first) ** (1 / years) - 1) * 100);
}

function avg(vals: number[]): number {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function fmtCr(v: number): string {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} lakh Cr`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}k Cr`;
  return `₹${Math.round(v).toLocaleString('en-IN')} Cr`;
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

// ── Main engine ───────────────────────────────────────────────────────────────

export function generateInsight(company: Company, financials: FinancialYear[]): StockInsight {
  const n = financials.length;
  const latest = n > 0 ? financials[n - 1] : null;
  const first  = n > 0 ? financials[0] : null;
  const isBanking = /bank|nbfc|financ|insur/i.test(company.sector);

  // ── Evidence extraction ────────────────────────────────────────────────────
  const fullCagr   = first && latest ? cagr(first.revenue, latest.revenue, Math.max(n - 1, 1)) : 0;
  const recent     = financials.slice(-4); // last 3 growth-years
  const recentCagr = recent.length >= 2 ? cagr(recent[0].revenue, recent[recent.length - 1].revenue, recent.length - 1) : fullCagr;
  const accelerating = recentCagr > fullCagr + 3;
  const slowing      = recentCagr < fullCagr - 3;

  const earlyMargin = avg(financials.slice(0, 3).map(f => f.netMargin));
  const lateMargin  = avg(financials.slice(-3).map(f => f.netMargin));
  const marginExpanding   = lateMargin > earlyMargin + 1;
  const marginContracting = lateMargin < earlyMargin - 1;

  // Cash conversion: how much of reported profit actually arrived as cash (3y)
  const last3 = financials.slice(-3);
  const patSum = last3.reduce((s, f) => s + Math.max(f.pat, 0), 0);
  const ocfSum = last3.reduce((s, f) => s + (f.ocf ?? 0), 0);
  const hasOcf = last3.some(f => (f.ocf ?? 0) !== 0);
  const cashConv = hasOcf && patSum > 0 ? Math.round((ocfSum / patSum) * 100) : null;

  // Interest cover from parsed P&L
  const intExp = latest?.interest ?? 0;
  const intCover = intExp > 0 && latest ? +(latest.ebitda / intExp).toFixed(1) : null;

  // Where in the 52-week range is the price?
  const range52 = company.week52High > company.week52Low && company.week52Low > 0
    ? Math.round(((company.currentPrice - company.week52Low) / (company.week52High - company.week52Low)) * 100)
    : null;

  const val = valuationLabel(company);
  const roe = company.roe;
  const d2e = company.debtToEquity;
  const debtRisky = !isBanking && d2e > 1.2;

  // ── Composite signal score → verdict ──────────────────────────────────────
  let score = 0;
  if (val.cheap) score += 2;
  if (val.expensive) score -= 2;
  score += roe >= 25 ? 3 : roe >= 18 ? 2 : roe >= 12 ? 1 : roe >= 5 ? 0 : -1;
  if (fullCagr >= 20) score += 2;
  else if (fullCagr >= 12) score += 1;
  else if (fullCagr < 0) score -= 2;
  else if (fullCagr < 5) score -= 1;
  if (debtRisky) score -= 2;
  if (lateMargin > 20) score += 1;
  else if (lateMargin < 5 && !isBanking) score -= 1;
  if (cashConv !== null && cashConv < 50) score -= 1;       // profits not turning into cash
  if (cashConv !== null && cashConv > 90) score += 1;       // high-fidelity earnings
  if (marginExpanding) score += 1;
  if (marginContracting) score -= 1;

  let verdict: StockInsight['verdict'];
  let verdictColor: string;
  if (score >= 6)       { verdict = 'Strong Buy'; verdictColor = 'text-gain'; }
  else if (score >= 4)  { verdict = 'Buy';        verdictColor = 'text-gain'; }
  else if (score >= 1)  { verdict = 'Accumulate'; verdictColor = 'text-gold'; }
  else if (score >= -1) { verdict = 'Hold';       verdictColor = 'text-gold'; }
  else if (score >= -3) { verdict = 'Reduce';     verdictColor = 'text-loss'; }
  else                  { verdict = 'Sell';       verdictColor = 'text-loss'; }

  // ── Summary (on-screen, 3–4 sentences, every claim has a number) ──────────
  const growthPhrase =
    fullCagr <= 0 ? `revenue has shrunk (${fullCagr}% a year over ${n} years)` :
    `revenue compounded ${fullCagr}% a year over ${n} years${accelerating ? ` and is speeding up (${recentCagr}% recently)` : slowing ? ` but is slowing (${recentCagr}% recently)` : ''}`;

  const marginPhrase = lateMargin > 0
    ? `Net margins ${marginExpanding ? `expanded from ~${earlyMargin.toFixed(0)}% to ~${lateMargin.toFixed(0)}%` : marginContracting ? `shrank from ~${earlyMargin.toFixed(0)}% to ~${lateMargin.toFixed(0)}%` : `held steady around ${lateMargin.toFixed(0)}%`}.`
    : '';

  const cashPhrase = cashConv !== null
    ? ` Of every ₹100 of recent profit, ₹${Math.min(cashConv, 999)} arrived as actual cash${cashConv < 60 ? ' — a warning sign' : cashConv > 90 ? ' — high-quality earnings' : ''}.`
    : '';

  const summary =
    `${company.name} is ${val.label}: ${growthPhrase}. ${marginPhrase}${cashPhrase} ` +
    `ROE is ${roe.toFixed(0)}% and ${isBanking ? 'leverage is normal for a lender' : `debt is ${d2e.toFixed(1)}x equity`}.`;

  // ── Bull case (3 strongest data points) ───────────────────────────────────
  const bulls: string[] = [];
  if (val.cheap) bulls.push(`The market is paying ${company.pe > 0 ? company.pe.toFixed(0) + 'x earnings' : 'a discounted multiple'} for a business growing ${fullCagr}% — pessimism may be overdone.`);
  if (roe >= 18) bulls.push(`ROE of ${roe.toFixed(0)}% sustained on ${fmtCr(latest?.revenue ?? 0)} of revenue signals a durable moat.`);
  if (accelerating) bulls.push(`Growth is accelerating: ${recentCagr}% in the last 3 years vs ${fullCagr}% long-term.`);
  if (marginExpanding) bulls.push(`Margins expanded from ~${earlyMargin.toFixed(0)}% to ~${lateMargin.toFixed(0)}% — pricing power is improving.`);
  if (cashConv !== null && cashConv > 90) bulls.push(`${cashConv}% of profit converts to cash — earnings you can trust.`);
  if (!debtRisky && !isBanking && d2e <= 0.3) bulls.push(`Near debt-free balance sheet (D/E ${d2e.toFixed(2)}x) gives management freedom to invest or pay out.`);
  if (range52 !== null && range52 < 30 && val.cheap) bulls.push(`Price sits in the bottom third of its 52-week range while fundamentals held up.`);
  if (bulls.length === 0) bulls.push(`Any improvement in sector tailwinds or management execution could re-rate the stock.`);

  // ── Bear case (3 weakest data points) ─────────────────────────────────────
  const bears: string[] = [];
  if (val.expensive) bears.push(`At ${company.pe > 0 ? company.pe.toFixed(0) + 'x earnings' : 'a premium multiple'}, years of growth are pre-paid — one bad quarter compresses the multiple.`);
  if (slowing) bears.push(`Growth is decelerating: ${recentCagr}% recently vs ${fullCagr}% historically — the market may not have repriced this yet.`);
  if (marginContracting) bears.push(`Margins shrank from ~${earlyMargin.toFixed(0)}% to ~${lateMargin.toFixed(0)}% — competition or costs are biting.`);
  if (cashConv !== null && cashConv < 60) bears.push(`Only ₹${cashConv} of every ₹100 of profit became cash — the rest is stuck in receivables or accounting.`);
  if (debtRisky) bears.push(`Debt at ${d2e.toFixed(1)}x equity${intCover ? ` with ${intCover}x interest cover` : ''} makes the stock hostile to rising rates.`);
  if (roe < 10 && !isBanking) bears.push(`ROE of ${roe.toFixed(0)}% means shareholders' money works harder in a fixed deposit — capital allocation needs scrutiny.`);
  if (fullCagr < 0) bears.push(`Revenue is structurally declining (${fullCagr}%/yr) — cheapness can be a trap when the business is shrinking.`);
  if (bears.length === 0) bears.push(`Macro headwinds, sector slowdown, or execution risk could derail the trajectory.`);

  // ── What to watch (the owner's quarterly checklist) ───────────────────────
  const watch: string[] = [];
  if (slowing || fullCagr < 8) watch.push(`Revenue growth — does it re-accelerate past ${Math.max(fullCagr, 8)}%?`);
  if (marginContracting || lateMargin < 8) watch.push(`Net margin — direction matters more than level; watch the next 2 quarters.`);
  if (cashConv !== null && cashConv < 80) watch.push(`Cash conversion — OCF should track profit; a widening gap is the earliest fraud/stress signal.`);
  if (debtRisky) watch.push(`Borrowings — any increase from ${d2e.toFixed(1)}x D/E changes the risk math.`);
  if (company.pledgedPct && company.pledgedPct > 0) watch.push(`Promoter pledge (${company.pledgedPct.toFixed(1)}%) — rising pledge is a classic distress flag.`);
  if (watch.length === 0) watch.push(`Quarterly margin and growth consistency — the thesis rests on both continuing.`);

  // ── Written thesis (for the PDF report) ───────────────────────────────────
  const thesis: string[] = [];
  if (latest && first) {
    thesis.push(
      `The business: ${company.name} grew revenue from ${fmtCr(first.revenue)} (${first.year}) to ${fmtCr(latest.revenue)} (${latest.year}), a ${fullCagr}% yearly pace${accelerating ? ', and the last three years were faster than the decade average — momentum is building' : slowing ? ', though the last three years slowed — the engine is cooling' : ', delivered with notable consistency'}. ${marginPhrase} ${isBanking ? 'As a lender, the franchise lives on spread, asset quality and credit growth.' : `In ${company.sector.toLowerCase() || 'its sector'}, that margin path is the single best tell of pricing power.`}`
    );
    thesis.push(
      `The quality test: every ₹100 of shareholder money produced ₹${roe.toFixed(0)} of profit this year (ROE ${roe.toFixed(0)}%)${roe >= 18 ? ' — comfortably above the cost of that money, so the business compounds value' : roe >= 12 ? ' — adequate, but not a fortress' : ' — below what the money could earn elsewhere, which is the core problem'}. ${cashConv !== null ? `Cash conversion ran at ${cashConv}% of profit over three years${cashConv > 90 ? ', so the earnings are real, bankable cash.' : cashConv >= 60 ? ' — acceptable, worth monitoring.' : ' — too much profit exists only on paper; this is the number to interrogate first.'}` : ''} ${isBanking ? '' : `Debt stands at ${d2e.toFixed(1)}x equity${intCover ? ` with EBITDA covering interest ${intCover}x` : ''}${debtRisky ? ' — leverage this high amplifies every mistake.' : ' — a balance sheet that will not force bad decisions.'}`}`
    );
    thesis.push(
      `The price: at ₹${company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })} the stock is ${val.label}${company.pe > 0 ? ` (${company.pe.toFixed(1)}x earnings)` : ''}${range52 !== null ? `, sitting ${range52 < 35 ? 'near the bottom' : range52 > 70 ? 'near the top' : 'in the middle'} of its 52-week range` : ''}. Our verdict is ${verdict.toUpperCase()}: ${
        verdict === 'Strong Buy' || verdict === 'Buy'
          ? 'the combination of quality and price tilts the odds toward the buyer, provided the growth and margin story holds.'
          : verdict === 'Accumulate'
          ? 'worth building a position slowly — the business clears the quality bar but the price offers only a modest cushion.'
          : verdict === 'Hold'
          ? 'the strengths and weaknesses roughly cancel; there is no urgency to act in either direction at this price.'
          : 'the risks are not being paid for at this price — patience, or a better entry, is the rational position.'
      }`
    );
  }

  const confidence: StockInsight['confidence'] =
    n >= 4 ? 'High' : n >= 2 ? 'Medium' : 'Low';

  return {
    summary,
    bull: bulls.slice(0, 3).join(' '),
    bear: bears.slice(0, 3).join(' '),
    verdict,
    verdictColor,
    confidence,
    thesis,
    watch: watch.slice(0, 3),
  };
}
