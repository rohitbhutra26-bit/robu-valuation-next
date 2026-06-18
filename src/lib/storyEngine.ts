// ─────────────────────────────────────────────────────────────────────────────
// STORY & POTENTIAL ENGINE  (a layer ABOVE fair value)
//
// Fair value asks: "is the price below what the business is worth?"
// This engine asks a different question: "will the market PAY A HIGHER (or lower)
// multiple from here?" — i.e. re-rating potential.
//
// Core idea (expectations investing — Rappaport/Mauboussin):
//   price = earnings × multiple. Today's price already embeds a STORY — the
//   growth/returns the market is implicitly assuming. Mispricing happens when
//   those implied expectations diverge from the company's real trajectory.
//   Re-rating happens when reality beats the embedded story.
//
// Every layer returns a SIGNAL + the plain-English EVIDENCE behind it.
// Never a black-box "buy".
// ─────────────────────────────────────────────────────────────────────────────

import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { impliedGrowthRate, getBaselineFinancial } from '@/lib/forecastUtils';

export type StoryDir = 'positive' | 'negative' | 'neutral' | 'unknown';

export interface LayerResult {
  id: string;
  title: string;
  dir: StoryDir;            // re-rating direction this layer points to
  signal: string;           // short label, e.g. "Low bar — beatable"
  headline: string;         // one plain-English sentence (teach-a-beginner)
  evidence: string[];       // supporting sentences, each with the numbers
  metrics?: Record<string, number>; // raw numbers (for validation / debugging)
}

const round = (n: number) => Math.round(n);

// Recent run-rate: latest COMPLETE-year revenue growth, falling back to a 3-yr
// revenue CAGR. Uses getBaselineFinancial so a partial current year never lies.
function recentRevenueTrend(financials: FinancialYear[]): number {
  const { completeYears } = getBaselineFinancial(financials);
  if (completeYears.length < 2) return 0;
  const last = completeYears[completeYears.length - 1];
  if (last.revenueGrowth != null && Math.abs(last.revenueGrowth) < 80) {
    return last.revenueGrowth;
  }
  const n = Math.min(3, completeYears.length - 1);
  const a = completeYears[completeYears.length - 1 - n].revenue;
  const b = last.revenue;
  if (a > 0 && b > 0) return (Math.pow(b / a, 1 / n) - 1) * 100;
  return 0;
}


// Robust delivered growth: endpoint EPS CAGR explodes when the first year is a
// depressed near-zero base (e.g. a bank recovering from a bad-loan year, ₹0.3 →
// ₹90). We take the gentler of a 5-yr CAGR and the MEDIAN of yearly EPS growths,
// then clamp to a sane band so the "delivered" evidence never reads as nonsense.
function robustDelivered(financials: FinancialYear[]): number {
  const { completeYears } = getBaselineFinancial(financials);
  const eps = completeYears.map(f => f.eps).filter(e => Number.isFinite(e));
  if (eps.length < 2) return 0;

  // median of consecutive year-on-year EPS growths (only positive→positive)
  const yoy: number[] = [];
  for (let i = 1; i < eps.length; i++) {
    if (eps[i - 1] > 0 && eps[i] > 0) yoy.push((eps[i] / eps[i - 1] - 1) * 100);
  }
  let median = 0;
  if (yoy.length) {
    const sorted = [...yoy].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // 5-yr (or shortest available) CAGR off the most recent positive base
  let cagr = median;
  const window = Math.min(5, eps.length - 1);
  const a = eps[eps.length - 1 - window], b = eps[eps.length - 1];
  if (a > 0 && b > 0) cagr = (Math.pow(b / a, 1 / window) - 1) * 100;

  const blended = yoy.length ? Math.min(cagr, median) : cagr; // gentler of the two
  return Math.max(-25, Math.min(45, blended));                // clamp display band
}

// Narrow guard for an EARNINGS-EXPECTATION read. Unlike fair-value reliability,
// a high P/E or a "diversified" label is NOT disqualifying here — a richly
// priced stock is the most interesting expectations case. We only bail when the
// earnings base itself is meaningless: losses, negative net worth, a distorted
// sub-4 P/E (demerger/one-off), or too little history.
function expectationsMeasurable(c: Company, f: FinancialYear[]): { ok: boolean; why: string } {
  if (f.length < 3) return { ok: false, why: 'too little financial history to read expectations' };
  const latest = f[f.length - 1];
  if (latest.pat <= 0) return { ok: false, why: 'the company is loss-making, so an earnings-expectation read does not apply' };
  if ((latest.equity ?? 0) < 0 || (c.bookValue ?? 0) < 0) return { ok: false, why: 'it has negative net worth, so earnings multiples do not apply' };
  if (c.pe > 0 && c.pe < 4) return { ok: false, why: 'reported earnings look distorted (P/E under 4 — likely a one-off or demerger)' };
  return { ok: true, why: '' };
}

// A richly-priced stock must defend BOTH its growth and its multiple. Anchoring
// the reverse-DCF on the stock's own euphoric multiple makes the implied-growth
// bar look deceptively low. We cap the exit at a defensible premium ceiling so
// glamour names correctly show a high bar.
const EXIT_CEILING = 35;

// ─── LAYER 1 — EXPECTATION GAP (the anchor) ──────────────────────────────────
// Reverse-engineer the growth today's price assumes (ReverseDCF), then compare
// it to what the company has actually delivered and is currently running.
//   implied  X% = the bar the market has set
//   delivered D% = the long-run track record (EPS CAGR)
//   trending  Y% = the current run-rate (latest revenue growth)
//
// Low bar that reality clears  → room to re-rate UP.
// Bar already above the record → priced for perfection, re-rate DOWN risk.
export function expectationGap(
  company: Company,
  financials: FinancialYear[],
  assumptions: ValuationAssumptions,
): LayerResult {
  const base = { id: 'expectation-gap', title: 'Expectation Gap' };

  const meas = expectationsMeasurable(company, financials);
  if (company.currentPrice <= 0 || !meas.ok) {
    return {
      ...base,
      dir: 'unknown',
      signal: 'Not measurable',
      headline: company.currentPrice <= 0
        ? 'No live price, so the market\'s expectations can\'t be read.'
        : `Can't read expectations here — ${meas.why}.`,
      evidence: [],
    };
  }

  const profile = getCompanyProfile(company);
  const years   = assumptions.years || 5;
  // Same exit-multiple logic the app's "market's bet" lens uses, so the implied
  // figure here is identical to what the rest of the app shows.
  const rawExit = profile.model === 'pe'
    ? assumptions.exitMultiple
    : (company.pe > 0 ? company.pe : 22);
  const exitPE = Math.min(rawExit, EXIT_CEILING); // de-euphoria: cap the bar anchor

  const implied   = impliedGrowthRate(financials, company, assumptions.netMarginAssumption, exitPE, years);
  const delivered = robustDelivered(financials);
  const trend     = recentRevenueTrend(financials);

  const dGap = delivered - implied; // track record vs the bar
  const tGap = trend - implied;     // current run-rate vs the bar

  let dir: StoryDir;
  let signal: string;
  let headline: string;

  if (implied >= delivered + 5 && tGap < -2) {
    dir = 'negative';
    signal = 'Demanding — priced for perfection';
    headline = `Today's price already assumes about ${round(implied)}%/yr growth — more than the ~${round(delivered)}% it has actually delivered and the ~${round(trend)}% it's running now. The bar is set high, so beating it (and re-rating higher) is hard from here.`;
  } else if (dGap >= 4 && tGap >= -2) {
    dir = 'positive';
    signal = 'Low bar — beatable';
    headline = `Today's price only assumes about ${round(implied)}%/yr growth, yet the company has delivered ~${round(delivered)}% and is running ~${round(trend)}%. Expectations are set low enough that simply keeping up could earn it a higher multiple — the classic setup for a re-rating up.`;
  } else {
    dir = 'neutral';
    signal = 'Fairly set';
    headline = `Expectations look about right: the price assumes ~${round(implied)}%/yr, close to the ~${round(delivered)}% delivered (currently ~${round(trend)}%). A re-rating from here needs a genuine surprise, up or down.`;
  }

  const evidence = [
    `Market is pricing in ≈ ${round(implied)}%/yr earnings growth (reverse-DCF, ${round(exitPE)}× exit over ${years}y).`,
    `Actually delivered ≈ ${delivered > 0 ? round(delivered) + '%' : 'flat/▼'}/yr over its record (EPS CAGR).`,
    `Currently trending ≈ ${round(trend)}%/yr (latest revenue growth).`,
  ];

  return {
    ...base, dir, signal, headline, evidence,
    metrics: {
      implied: +implied.toFixed(1),
      delivered: +delivered.toFixed(1),
      trend: +trend.toFixed(1),
      deliveredGap: +dGap.toFixed(1),
      trendGap: +tGap.toFixed(1),
      exitPE: +exitPE.toFixed(1),
    },
  };
}

// ─── LAYER 2 — TRAJECTORY / INFLECTION (direction, not level) ─────────────────
// Fair value reads the LEVEL of a metric; re-rating is driven by its DIRECTION.
// A company whose margins, profit and returns are bending UP for several quarters
// is one the market tends to award a higher multiple — often before the level
// itself looks impressive. We score the slope and the acceleration over the last
// 4–8 quarters, plus the multi-year debt/return trend, and flag inflections
// (3+ quarters bending the same way).

export interface QuarterRow { quarter: string; revenue: number; pat: number; opm: number; eps: number; }

const MONTHS: Record<string, number> = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
function qKey(label: string): number {
  const m = String(label).toLowerCase().match(/([a-z]{3})\s*'?(\d{2,4})/);
  if (!m) return 0;
  const mon = MONTHS[m[1]] || 0;
  let yr = parseInt(m[2], 10); if (yr < 100) yr += 2000;
  return yr * 100 + mon;
}
const pct = (curr: number, base: number) => (base === 0 ? 0 : ((curr - base) / Math.abs(base)) * 100);

// Longest consecutive run, counted from the most recent point backwards.
function endStreak(deltas: number[]): { dir: 'up' | 'down' | 'flat'; len: number } {
  if (!deltas.length) return { dir: 'flat', len: 0 };
  const sign = (x: number) => (x > 0.5 ? 1 : x < -0.5 ? -1 : 0);
  const s0 = sign(deltas[deltas.length - 1]);
  if (s0 === 0) return { dir: 'flat', len: 0 };
  let len = 0;
  for (let i = deltas.length - 1; i >= 0; i--) { if (sign(deltas[i]) === s0) len++; else break; }
  return { dir: s0 > 0 ? 'up' : 'down', len };
}

interface Pillar { key: string; score: -1 | 0 | 1; text: string; weight?: number; }

export function trajectoryInflection(
  company: Company,
  financials: FinancialYear[],
  quarters: QuarterRow[],
): LayerResult {
  const base = { id: 'trajectory', title: 'Trajectory & Inflection' };
  const profile = getCompanyProfile(company);
  const isFinancial = profile.model === 'pb' || /bank|financ|nbfc|insur|lend|housing fin/i.test(`${company.sector} ${company.industry}`);

  // chronological, oldest→newest, last 8
  const q = [...(quarters || [])].sort((a, b) => qKey(a.quarter) - qKey(b.quarter)).slice(-8);
  const pillars: Pillar[] = [];
  const inflections: string[] = [];

  // YoY series (q vs q-4) — removes seasonality. Needs ≥5 quarters.
  const yoy = (sel: (r: QuarterRow) => number): number[] => {
    const out: number[] = [];
    for (let i = 4; i < q.length; i++) out.push(pct(sel(q[i]), sel(q[i - 4])));
    return out;
  };

  if (q.length >= 6) {
    // A — Revenue momentum (YoY, accelerating?)
    const rev = yoy(r => r.revenue);
    if (rev.length >= 2) {
      const latest = (rev[rev.length - 1] + (rev[rev.length - 2] ?? rev[rev.length - 1])) / 2; // 2-qtr smoothed
      const accel = rev[rev.length - 1] - rev[0]; // change in the YoY rate across the window
      const sc: -1 | 0 | 1 = latest > 3 && accel > 1 ? 1 : (latest < 0 || accel < -3) ? -1 : 0;
      pillars.push({ key: 'revenue', score: sc, weight: 1,
        text: `Revenue growth ${accel > 1 ? 'accelerating' : accel < -1 ? 'slowing' : 'steady'} — YoY ${rev[0].toFixed(0)}% → ${latest.toFixed(0)}% over the last ${rev.length} quarters.` });
      const st = endStreak(rev.map((v, i) => i ? v - rev[i - 1] : 0).slice(1));
      if (st.len >= 3) inflections.push(`revenue growth ${st.dir === 'up' ? 'rising' : 'falling'} ${st.len} quarters running`);
    }

    // B — Profit momentum (YoY PAT) — the key pillar for banks
    const pat = yoy(r => r.pat);
    if (pat.length >= 2) {
      const latest = (pat[pat.length - 1] + (pat[pat.length - 2] ?? pat[pat.length - 1])) / 2; // 2-qtr smoothed
      const accel = pat[pat.length - 1] - pat[0];
      const sc: -1 | 0 | 1 = latest > 8 ? 1 : latest < 0 ? -1 : 0;
      pillars.push({ key: 'profit', score: sc, weight: 1,
        text: `Profit ${latest >= 0 ? 'up' : 'down'} ~${Math.abs(latest).toFixed(0)}% YoY (recent quarters, ${accel > 2 ? 'accelerating' : accel < -2 ? 'cooling' : 'steady'}).` });
    }

    // C — Margin trend (OPM) — skip for banks (OPM is ~0/meaningless)
    const opmUsable = !isFinancial && q.some(r => r.opm > 1);
    if (opmUsable) {
      const opm = q.map(r => r.opm);
      const nowAvg = (opm[opm.length - 1] + opm[opm.length - 2]) / 2;
      const thenAvg = (opm[0] + opm[1]) / 2;
      const dPP = nowAvg - thenAvg;
      const sc: -1 | 0 | 1 = dPP > 0.5 ? 1 : dPP < -0.5 ? -1 : 0;
      pillars.push({ key: 'margin', score: sc, weight: 1,
        text: `Operating margin ${dPP > 0.3 ? 'expanding' : dPP < -0.3 ? 'compressing' : 'flat'} — ~${thenAvg.toFixed(0)}% → ~${nowAvg.toFixed(0)}% across the window.` });
      const opmDeltas = opm.map((v, i) => i ? v - opm[i - 1] : 0).slice(1);
      const st = endStreak(opmDeltas);
      if (st.len >= 3) inflections.push(`margins ${st.dir === 'up' ? 'expanding' : 'contracting'} ${st.len} quarters running`);
    }
  }

  // D — Profitability trend (annual net margin) — clean, cash-neutral quality read
  const { completeYears } = getBaselineFinancial(financials);
  const yrs = completeYears.slice(-4);
  if (yrs.length >= 3) {
    const nm = yrs.map(f => f.netMargin).filter(Number.isFinite);
    if (nm.length >= 3) {
      const d = nm[nm.length - 1] - nm[0];
      const sc: -1 | 0 | 1 = d > 1 ? 1 : d < -1 ? -1 : 0;
      pillars.push({ key: 'quality', score: sc, weight: 0.5,
        text: `Net profit margin ${d > 0.5 ? 'rising' : d < -0.5 ? 'slipping' : 'flat'} — ${nm[0].toFixed(0)}% → ${nm[nm.length - 1].toFixed(0)}% over ${nm.length} years.` });
    }
  }

  // E — Debt trend (annual) — skip for banks (debt is their raw material)
  if (!isFinancial && yrs.length >= 3) {
    const debt = yrs.map(f => f.borrowings ?? 0);
    const eq = yrs.map(f => f.equity ?? 0);
    const de0 = eq[0] > 0 ? debt[0] / eq[0] : NaN;
    const de1 = eq[eq.length - 1] > 0 ? debt[debt.length - 1] / eq[eq.length - 1] : NaN;
    if (Number.isFinite(de0) && Number.isFinite(de1)) {
      const d = de1 - de0;
      const sc: -1 | 0 | 1 = d < -0.1 ? 1 : d > 0.15 ? -1 : 0;
      pillars.push({ key: 'debt', score: sc, weight: 0.5,
        text: `Debt/equity ${d < -0.05 ? 'falling (deleveraging)' : d > 0.05 ? 'rising' : 'stable'} — ${de0.toFixed(2)}x → ${de1.toFixed(2)}x.` });
      if (d < -0.1) inflections.push('debt coming down');
    }
  }

  if (!pillars.length) {
    return { ...base, dir: 'unknown', signal: 'No trend data',
      headline: 'Not enough quarterly/annual history to read the direction of the business yet.', evidence: [] };
  }

  const wnet = pillars.reduce((s, p) => s + p.score * (p.weight ?? 1), 0);
  const up = pillars.filter(p => p.score > 0).length;
  const down = pillars.filter(p => p.score < 0).length;
  let dir: StoryDir; let signal: string;
  if (wnet >= 1.5 && up > down) { dir = 'positive'; signal = `Improving on ${up} of ${pillars.length} fronts`; }
  else if (wnet <= -1.5 && down >= up) { dir = 'negative'; signal = `Deteriorating on ${down} of ${pillars.length} fronts`; }
  else { dir = 'neutral'; signal = `Mixed — ${up} up / ${down} down`; }

  const dirWord = dir === 'positive' ? 'bending up' : dir === 'negative' ? 'bending down' : 'flat to mixed';
  const headline = `The business is ${dirWord}: ${pillars.filter(p => p.score !== 0).slice(0, 2).map(p => p.text.replace(/\.$/, '').toLowerCase()).join('; ') || 'no single trend dominates'}.${inflections.length ? ' Inflection: ' + inflections[0] + '.' : ''}`;

  return {
    ...base, dir, signal, headline,
    evidence: pillars.map(p => p.text),
    metrics: { wnet: +wnet.toFixed(2), up, down, pillars: pillars.length, inflections: inflections.length },
  };
}

// ─── LAYER 3 — NARRATIVE (LLM over real disclosures, quote-verified) ──────────
// The story behind the numbers lives in management's words and recent actions.
// We feed the company's REAL recent disclosures (the announcements feed — filings,
// press releases, board/results notices) to an LLM and ask it to extract story
// signals — management credibility, moat, capex/expansion, theme alignment, red
// flags — but ONLY with a verbatim quote from the source. Every quote is then
// machine-verified to exist in the source text; anything the model paraphrases or
// invents is dropped. No hallucinated evidence ever reaches the user.
//
// Data note: our corpus is disclosure HEADLINES (rich, current, datable) — not yet
// full call transcripts. The prompt + verifier are transcript-ready; when fuller
// text is wired in, nothing here changes.

export type NarrativeSig = 'credibility' | 'moat' | 'capex' | 'theme' | 'redflag';
export interface SourceDoc { text: string; date?: string; }
export interface NarrativeItem { signal: NarrativeSig; polarity: -1 | 0 | 1; claim: string; quote: string; }

const norm = (s: string) =>
  String(s).toLowerCase().replace(/[^a-z0-9₹$%. ]/g, ' ').replace(/\s+/g, ' ').trim();

// Token-overlap fallback so trivial formatting differences don't fail a real quote.
function tokenOverlap(a: string, b: string): number {
  const A = new Set(norm(a).split(' ').filter(w => w.length > 2));
  const B = norm(b).split(' ').filter(w => w.length > 2);
  if (!A.size || !B.length) return 0;
  let hit = 0; for (const w of B) if (A.has(w)) hit++;
  return hit / B.length;
}

// THE anti-hallucination gate: a quote survives only if it genuinely appears in
// some source (substring after normalisation, or ≥85% token overlap) and is long
// enough to be meaningful.
export function verifyNarrative(items: NarrativeItem[], sources: SourceDoc[]) {
  const normedSources = sources.map(s => norm(s.text));
  const verified: NarrativeItem[] = [];
  const rejected: NarrativeItem[] = [];
  for (const it of items) {
    const q = norm(it.quote);
    const ok = q.length >= 15 && normedSources.some(s => s.includes(q) || tokenOverlap(s, it.quote) >= 0.85);
    (ok ? verified : rejected).push(it);
  }
  return { verified, rejected };
}

// The strict prompt handed to the production LLM (Gemini via /api/ai-analysis).
export function buildNarrativePrompt(company: Company, sources: SourceDoc[]): string {
  const corpus = sources.map((s, i) => `[${i + 1}] ${s.date ? s.date + ' — ' : ''}${s.text}`).join('\n');
  return [
    `You are an equity analyst reading ${company.name}'s most recent disclosures.`,
    `From the SOURCES below ONLY, extract up to 6 story signals that affect whether the market will pay a higher or lower MULTIPLE (re-rating), not fair value.`,
    `Each item: {signal: credibility|moat|capex|theme|redflag, polarity: -1|0|1, claim: <=18 words, quote: an EXACT verbatim span copied from a source}.`,
    `Rules: NEVER paraphrase the quote. If a claim has no verbatim support, omit it. Return [] if nothing material. Output strict JSON array only.`,
    ``, `SOURCES:`, corpus,
  ].join('\n');
}

const SIG_LABEL: Record<NarrativeSig, string> = {
  credibility: 'Credibility', moat: 'Moat', capex: 'Capex/Expansion', theme: 'Theme', redflag: 'Red flag',
};

export function narrativeLayer(items: NarrativeItem[], sources: SourceDoc[]): LayerResult {
  const base = { id: 'narrative', title: 'Narrative' };
  const { verified, rejected } = verifyNarrative(items, sources);

  if (!sources.length) {
    return { ...base, dir: 'unknown', signal: 'No recent disclosures',
      headline: 'No recent company disclosures to read the story from.', evidence: [] };
  }
  if (!verified.length) {
    return { ...base, dir: 'neutral', signal: 'No quotable signal',
      headline: 'Recent disclosures are routine — nothing in them clearly shifts the story up or down.',
      evidence: [], metrics: { verified: 0, rejected: rejected.length } };
  }

  const net = verified.reduce((s, it) => s + it.polarity, 0);
  const dir: StoryDir = net >= 1 ? 'positive' : net <= -1 ? 'negative' : 'neutral';
  const signal = net >= 1 ? 'Story improving' : net <= -1 ? 'Story souring' : 'Story balanced';
  const top = verified.filter(v => v.polarity !== 0).slice(0, 2).map(v => v.claim.toLowerCase());
  const headline = top.length
    ? `Recent disclosures point ${dir === 'positive' ? 'the right way' : dir === 'negative' ? 'the wrong way' : 'both ways'}: ${top.join('; ')}.`
    : 'Recent disclosures are steady — credible but not a clear catalyst.';

  return {
    ...base, dir, signal, headline,
    evidence: verified.map(v => `${SIG_LABEL[v.signal]}: ${v.claim} — "${v.quote.trim()}"`),
    metrics: { verified: verified.length, rejected: rejected.length, net },
  };
}

// ─── LAYER 4 — CATALYSTS (dated upcoming-trigger watchlist) ───────────────────
// A re-rating usually needs a TRIGGER and a DATE. This layer scans real
// disclosures for forward-looking, dated events — the next results/board meeting,
// analyst & investor meets, record/ex dates, buybacks, fundraises, capacity
// commissioning, scheme/listing events — and always adds an estimated next-results
// date. Output is a watchlist sorted by date, each tagged confirmed vs estimated.

export interface Catalyst { date: string; ts: number; type: string; label: string; confirmed: boolean; }

const FWD_PATTERNS: { re: RegExp; type: string }[] = [
  { re: /board meeting|board meets|notice of board/i, type: 'Results / Board meeting' },
  { re: /\bresults?\b|financial results/i, type: 'Results' },
  { re: /analyst|investor meet|earnings call|con(ference)? call/i, type: 'Analyst / investor meet' },
  { re: /record date|ex-date|ex-dividend|book closure/i, type: 'Dividend / record date' },
  { re: /buy ?back/i, type: 'Buyback' },
  { re: /bonus|stock split|sub-division/i, type: 'Bonus / split' },
  { re: /qip|preferential|rights issue|fund ?rais|raise.*capital/i, type: 'Fundraise' },
  { re: /commission|capacity|new plant|expansion|capex|order win|bags order|secures order/i, type: 'Capacity / order' },
  { re: /scheme of arrangement|demerger|merger|amalgamation|listing|IPO of/i, type: 'Corporate action' },
  { re: /agm|egm|annual general/i, type: 'AGM / EGM' },
];

const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
function extractFutureDate(text: string, now: Date): { date: string; ts: number } | null {
  const t = String(text);
  const yr = now.getFullYear();
  // "July 22-23, 2026" / "22-23 July 2026" / "22 Jul 2026" / "July 22" / "22 July"
  const pats = [
    new RegExp(`${MONTH_RE}\\s+(\\d{1,2})(?:\\s*[-–]\\s*\\d{1,2})?,?\\s*(\\d{4})?`, 'i'),
    new RegExp(`(\\d{1,2})(?:\\s*[-–]\\s*\\d{1,2})?\\s+${MONTH_RE}\\.?,?\\s*(\\d{4})?`, 'i'),
  ];
  const MON: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
  for (let p = 0; p < pats.length; p++) {
    const m = t.match(pats[p]);
    if (!m) continue;
    const mon = MON[(p === 0 ? m[1] : m[2]).slice(0, 3).toLowerCase()];
    const day = parseInt(p === 0 ? m[2] : m[1], 10);
    const y = parseInt(m[3] || '', 10);
    if (!y || mon == null || !day) continue; // only trust dates with an explicit year
    const d = new Date(y, mon, day);
    if (d.getTime() >= now.getTime() - 2 * 864e5) {
      return { date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), ts: d.getTime() };
    }
  }
  return null;
}

// Estimate next results from the most recent quarter label (~45 days after q-end).
function estimateNextResults(quarters: QuarterRow[], now: Date): Catalyst | null {
  const q = [...(quarters || [])].sort((a, b) => qKey(a.quarter) - qKey(b.quarter));
  if (!q.length) return null;
  const k = qKey(q[q.length - 1].quarter); // YYYYMM of latest reported quarter-end
  if (!k) return null;
  const y = Math.floor(k / 100), mo = (k % 100) - 1;
  // next quarter-end is +3 months; results ~45 days after that
  const nextEnd = new Date(y, mo + 3, 1);
  const est = new Date(nextEnd.getTime() + 45 * 864e5);
  const d = est.getTime() < now.getTime() ? new Date(now.getTime() + 30 * 864e5) : est;
  return { date: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), ts: d.getTime(),
    type: 'Next results', label: 'Next quarterly results (estimated)', confirmed: false };
}

export function catalystWatch(
  company: Company,
  quarters: QuarterRow[],
  announcements: SourceDoc[],
  now: Date = new Date(),
): LayerResult {
  const base = { id: 'catalysts', title: 'Catalysts' };
  const cats: Catalyst[] = [];

  for (const a of announcements || []) {
    const hit = FWD_PATTERNS.find(p => p.re.test(a.text));
    if (!hit) continue;
    const fd = extractFutureDate(a.text, now);
    if (fd) cats.push({ date: fd.date, ts: fd.ts, type: hit.type, label: a.text.replace(/\s+/g, ' ').trim().slice(0, 90), confirmed: true });
  }
  const est = estimateNextResults(quarters, now);
  if (est && !cats.some(c => /results|board/i.test(c.type))) cats.push(est);

  // de-dup by (type+date), keep soonest first, drop anything >270 days out
  const seen = new Set<string>();
  const horizon = now.getTime() + 270 * 864e5;
  const list = cats
    .filter(c => c.ts <= horizon)
    .sort((a, b) => a.ts - b.ts)
    .filter(c => { const k = c.type + c.date; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 6);

  if (!list.length) {
    return { ...base, dir: 'neutral', signal: 'No dated triggers',
      headline: 'No dated near-term triggers found in recent disclosures.', evidence: [] };
  }
  const confirmed = list.filter(c => c.confirmed);
  const soon = list.filter(c => c.ts <= now.getTime() + 100 * 864e5 && c.confirmed);
  const dir: StoryDir = soon.length ? 'positive' : 'neutral';
  const signal = `${list.length} upcoming trigger${list.length > 1 ? 's' : ''}${confirmed.length ? ` (${confirmed.length} dated)` : ''}`;
  const next = list[0];
  const headline = `Next dated trigger: ${next.type.toLowerCase()} ~${next.date}${next.confirmed ? '' : ' (estimated)'}. ${soon.length ? 'A confirmed event inside ~3 months is the kind of moment a re-rating can crystallise around.' : 'Nothing firmly dated very soon — watch for results.'}`;

  return {
    ...base, dir, signal, headline,
    evidence: list.map(c => `${c.date} — ${c.type}${c.confirmed ? '' : ' (est.)'}: ${c.label}`),
    metrics: { count: list.length, confirmed: confirmed.length, soon: soon.length },
  };
}

// ─── LAYER 5 — MACRO / RATE CONTEXT (live India 10-yr yield) ──────────────────
// Multiples don't expand or compress in a vacuum — the risk-free rate is the
// gravity behind every P/E. When the 10-yr G-sec yield falls, the discount rate on
// future earnings falls and multiples can re-rate UP; when it rises, gravity pulls
// them down. The effect is biggest for LONG-DURATION earnings (high-P/E names) and
// RATE-SENSITIVE sectors (lenders, real estate, utilities/infra, autos). This layer
// reads the live yield + its direction and tilts the re-rating odds accordingly,
// scaled by how rate-sensitive THIS stock is.

export interface MacroInput {
  y10: number;                       // live India 10-yr G-sec yield, %
  direction: 'falling' | 'rising' | 'flat';
  refLow?: number; refHigh?: number; // recent band (defaults 6.5 / 7.4)
  asOf?: string;
}

export function rateContext(company: Company, macro: MacroInput): LayerResult {
  const base = { id: 'macro', title: 'Macro / Rate context' };
  const lo = macro.refLow ?? 6.5, hi = macro.refHigh ?? 7.4;

  // direction + level tilt for equity multiples in general
  let tilt = 0;
  if (macro.direction === 'falling') tilt += 1;
  if (macro.direction === 'rising') tilt -= 1;
  if (macro.y10 <= lo + (hi - lo) * 0.33) tilt += 1;        // near the low end = supportive
  if (macro.y10 >= lo + (hi - lo) * 0.67) tilt -= 1;        // near the high end = restrictive

  // how rate-sensitive is THIS stock?
  const sectorStr = `${company.sector} ${company.industry}`;
  const rateSector = /bank|financ|nbfc|housing fin|insur|real ?estate|realty|infra|power|utilit|renewable|auto/i.test(sectorStr);
  const pe = company.pe || 0;
  const sensitivity: 'high' | 'med' | 'low' =
    pe > 40 || (rateSector && pe > 15) ? 'high' :
    (pe >= 25 || rateSector) ? 'med' : 'low';

  // low-sensitivity names barely register the macro; high-sensitivity amplify it
  let dir: StoryDir;
  if (tilt > 0) dir = sensitivity === 'low' ? 'neutral' : 'positive';
  else if (tilt < 0) dir = sensitivity === 'low' ? 'neutral' : 'negative';
  else dir = 'neutral';

  const envWord = tilt > 0 ? 'a tailwind' : tilt < 0 ? 'a headwind' : 'broadly neutral';
  const ampWord = sensitivity === 'high' ? 'amplified for this stock (high multiple / rate-sensitive sector)'
    : sensitivity === 'med' ? 'moderately relevant here'
    : 'muted for this stock (low multiple, not rate-sensitive)';
  const signal = tilt > 0 ? `Rate tailwind · ${sensitivity} sensitivity`
    : tilt < 0 ? `Rate headwind · ${sensitivity} sensitivity` : 'Rates neutral';

  const headline = `India's 10-yr G-sec is ${macro.y10.toFixed(2)}% and ${macro.direction} — ${envWord} for equity multiples, ${ampWord}.`;
  const evidence = [
    `10-yr yield ${macro.y10.toFixed(2)}%${macro.asOf ? ` (as of ${macro.asOf})` : ''}, ${macro.direction}; recent band ~${lo}–${hi}%.`,
    `Lower rates lift the value of future earnings — strongest for ${sensitivity === 'low' ? 'high-P/E and lender/real-estate/utility names (this isn\'t one)' : 'names like this'}.`,
    `Rate-sensitivity of this stock: ${sensitivity} (P/E ${pe.toFixed(0)}${rateSector ? ', rate-sensitive sector' : ''}).`,
  ];
  return { ...base, dir, signal, headline, evidence, metrics: { tilt, y10: macro.y10 } };
}

// ─── COMBINE — RE-RATING POTENTIAL (all 5 layers, one honest read) ────────────
// We don't average the layers into a black box. The spine is the L1×L2 quadrant —
// what the market EXPECTS vs which way the business is actually BENDING — because
// that interaction is where re-ratings (and value traps) are born. Narrative,
// catalysts and macro then modify the odds and the timing. Every layer keeps its
// own evidence; the user sees the reasoning, never just a verdict.

export interface PotentialResult {
  layers: LayerResult[];
  overall: { dir: StoryDir; signal: string; headline: string; conviction: string; score: number };
}

const WEIGHT: Record<string, number> = {
  'expectation-gap': 0.30, trajectory: 0.25, narrative: 0.15, catalysts: 0.15, macro: 0.15,
};
const DIRVAL: Record<StoryDir, number> = { positive: 1, negative: -1, neutral: 0, unknown: 0 };

export function combinePotential(layers: LayerResult[]): PotentialResult['overall'] {
  const byId: Record<string, LayerResult> = {};
  for (const l of layers) byId[l.id] = l;
  const l1 = byId['expectation-gap'], l2 = byId['trajectory'];

  // weighted score over the layers that actually have a read
  let wsum = 0, w = 0;
  for (const l of layers) {
    if (l.dir === 'unknown') continue;
    const wt = WEIGHT[l.id] ?? 0.1;
    wsum += DIRVAL[l.dir] * wt; w += wt;
  }
  const score = w ? wsum / w : 0;

  const pos = layers.filter(l => l.dir === 'positive').length;
  const neg = layers.filter(l => l.dir === 'negative').length;

  let dir: StoryDir = score >= 0.2 ? 'positive' : score <= -0.2 ? 'negative' : 'neutral';

  // L1×L2 quadrant — the heart of the story (all 9 combinations)
  const e = (l1?.dir ?? 'neutral'), t = (l2?.dir ?? 'neutral');
  const EXP: Record<string,string> = { positive: 'cheap expectations', negative: 'demanding expectations', neutral: 'fair expectations', unknown: 'unclear expectations' };
  const TRA: Record<string,string> = { positive: 'improving business', negative: 'weakening business', neutral: 'steady business', unknown: 'unclear trend' };
  let quadrant = `${EXP[e][0].toUpperCase()}${EXP[e].slice(1)} + ${TRA[t]}`;
  let spine = '';
  if (e === 'positive' && t === 'positive') {
    spine = 'The market is pricing in little, yet the business is bending up — the strongest setup for a re-rating higher.';
  } else if (e === 'positive' && t === 'negative') {
    quadrant = 'Cheap expectations, but trajectory rolling over';
    spine = 'It looks cheap on expectations, but the operating trend is deteriorating — a classic value-trap tension. The upside only pays off if the business turns.';
    dir = dir === 'positive' ? 'neutral' : dir; // temper the optimism
  } else if (e === 'positive' && (t === 'neutral' || t === 'unknown')) {
    spine = 'The market is pricing in little and the business is holding steady — a low bar that leaves room to re-rate up if anything goes right.';
  } else if (e === 'negative' && t === 'positive') {
    quadrant = 'Priced for perfection, but still delivering';
    spine = 'Expectations are demanding, yet momentum is real — it can stay expensive while it executes, but leaves little room for a stumble.';
  } else if (e === 'negative' && t === 'negative') {
    quadrant = 'Priced for perfection + losing momentum';
    spine = 'A high bar AND a fading business — the setup most exposed to a re-rating down.';
  } else if (e === 'negative' && (t === 'neutral' || t === 'unknown')) {
    spine = 'A demanding bar with a merely steady business — most of the good news already looks priced in.';
  } else if ((e === 'neutral' || e === 'unknown') && t === 'positive') {
    spine = 'Fairly priced, but the business is bending up — momentum the market has not fully paid for yet.';
  } else if ((e === 'neutral' || e === 'unknown') && t === 'negative') {
    spine = 'Fairly priced, but the trend is weakening — the risk is the multiple drifts down with it.';
  } else {
    spine = 'Expectations and trajectory are roughly balanced — no strong re-rating edge from the fundamentals alone.';
  }

  const cat = byId['catalysts'];
  const macro = byId['macro'];
  const catBit = cat && cat.dir === 'positive' && cat.metrics?.confirmed
    ? ` A dated trigger is coming (${cat.signal.toLowerCase()}), which can be the moment it re-rates.` : '';
  const macroBit = macro && macro.dir !== 'neutral'
    ? ` Rates are ${macro.metrics?.tilt && macro.metrics.tilt > 0 ? 'a tailwind' : 'a headwind'} here${(e==='neutral'&&t==='neutral')?', which is the main swing factor':''}.` : '';

  const headline = `${spine}${catBit}${macroBit}`;
  const signal = `Re-rating potential: ${dir === 'positive' ? 'UP-tilt' : dir === 'negative' ? 'DOWN-tilt' : 'BALANCED'} — ${quadrant}`;
  const agree = Math.max(pos, neg);
  const conviction = `${agree}/${layers.filter(l => l.dir !== 'unknown').length} layers agree (${pos}↑ / ${neg}↓)`;

  return { dir, signal, headline, conviction, score: +score.toFixed(2) };
}
