import { NextRequest, NextResponse } from 'next/server';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { generateInsight } from '@/lib/aiInsight';
import type { Company, FinancialYear } from '@/lib/types';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function buildPrompt(company: Record<string, unknown>, financials: Record<string, unknown>[]): string {
  const latest = financials[financials.length - 1] as Record<string, number> | undefined;
  const oldest = financials[0] as Record<string, number> | undefined;
  const years  = financials.length;

  const revCAGR = oldest && latest && oldest.revenue > 0 && latest.revenue > 0 && years > 1
    ? (((latest.revenue / oldest.revenue) ** (1 / (years - 1))) - 1) * 100
    : 0;

  const epsCAGR = oldest && latest && oldest.eps > 0 && latest.eps > 0 && years > 1
    ? (((latest.eps / oldest.eps) ** (1 / (years - 1))) - 1) * 100
    : 0;

  // Use smart sector label so AI knows MCX is an Exchange, not a bank
  const smartProfile = getCompanyProfile({
    name:     String(company.name   ?? ''),
    symbol:   String(company.symbol ?? ''),
    sector:   String(company.sector ?? ''),
    industry: company.industry ? String(company.industry) : undefined,
  });

  // Derive extra context signals
  const isHighPE    = typeof company.pe === 'number' && (company.pe as number) > 40;
  const isHighDebt  = typeof company.debtToEquity === 'number' && (company.debtToEquity as number) > 2;
  const isBank      = smartProfile.model === 'pb';
  const isCyclical  = ['Metals & Mining','Oil & Gas','Cement','Chemicals','Energy / O&G','Oil & Gas / Refining'].some(
    s => smartProfile.sectorLabel.includes(s.split('/')[0].trim())
  );
  const isConglom   = smartProfile.sectorLabel.toLowerCase().includes('conglomerate');

  const marginTrend = (latest && oldest && oldest.netMargin > 0)
    ? (((latest.netMargin ?? 0) - (oldest.netMargin ?? 0)) > 2 ? 'expanding' : ((oldest.netMargin ?? 0) - (latest.netMargin ?? 0)) > 2 ? 'compressing' : 'stable')
    : 'unknown';

  const extraContext = [
    isHighPE    ? `HIGH VALUATION ALERT: P/E is ${company.pe}x — compute what revenue CAGR is priced in at this multiple.` : '',
    isHighDebt  ? `LEVERAGE ALERT: D/E is ${company.debtToEquity}x — flag interest coverage risk explicitly.` : '',
    isBank      ? `BANK/NBFC: anchor analysis on P/B ${company.pb}x and credit cycle, not P/E.` : '',
    isCyclical  ? `CYCLICAL: warn if margins look near a cycle peak vs. historical range.` : '',
    isConglom   ? `CONGLOMERATE: identify the 2-3 key business segments and their relative contribution to the investment thesis.` : '',
    marginTrend === 'compressing' ? `MARGIN PRESSURE: net margin has compressed over the period — explain why and whether structural or temporary.` : '',
  ].filter(Boolean).join('\n');

  return `You are a senior equity analyst at an Indian institutional fund (like Motilal Oswal or Kotak AMC). Produce a crisp, data-backed equity assessment. Every sentence must cite a specific number.

COMPANY: ${company.name} (${company.symbol})
SECTOR: ${smartProfile.sectorLabel}
PRICE: ₹${company.currentPrice} | MARKET CAP: ₹${company.marketCap} Cr

VALUATION:
P/E ${company.pe}x | P/B ${company.pb}x | ROE ${company.roe}% | D/E ${company.debtToEquity}x | Div Yield ${company.dividendYield}%

FINANCIALS (${years} years):
Revenue CAGR: ${revCAGR.toFixed(1)}% | EPS CAGR: ${epsCAGR.toFixed(1)}%
Latest Revenue: ₹${latest?.revenue} Cr | PAT: ₹${latest?.pat} Cr | EPS: ₹${latest?.eps}
Net Margin: ${latest?.netMargin?.toFixed(1)}% (trend: ${marginTrend}) | EBITDA Margin: ${latest?.ebitdaMargin?.toFixed(1)}%
${extraContext ? `\nSPECIAL INSTRUCTIONS:\n${extraContext}` : ''}

OUTPUT RULES — mandatory:
1. summary: 2-3 sentences. Open with a specific valuation observation (e.g. "At ₹X, the stock trades at Yx P/E, pricing in Zx% earnings growth..."). Second sentence on what the financials actually show. Third on risk/reward stance. NEVER use "strong fundamentals", "robust growth", "well-positioned" or generic phrases. Every claim needs a number.
2. bull: 1-2 sentences. One specific, named catalyst — a product launch, margin recovery lever, regulatory tailwind, or market share gain. Quantify the upside if possible.
3. bear: 1-2 sentences. The single most likely thesis-breaker — specific: margin erosion from X, debt refinancing risk at Y%, competition from Z, or cyclical peak in margins.
4. verdict: based purely on margin of safety vs. current price
5. confidence: High = 4+ years clean data, Medium = 2-3 years, Low = <2 years

Return ONLY valid JSON — no markdown, no text outside the object:
{
  "verdict": "Strong Buy" | "Buy" | "Accumulate" | "Hold" | "Reduce" | "Avoid",
  "confidence": "High" | "Medium" | "Low",
  "summary": "...",
  "bull": "...",
  "bear": "..."
}`;
}

export async function POST(req: NextRequest) {
  let company: Record<string, unknown> | undefined;
  let financials: Record<string, unknown>[] = [];
  try {
    const body = await req.json();
    company = body?.company;
    financials = Array.isArray(body?.financials) ? body.financials : [];
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (!company || typeof company !== 'object') {
    return NextResponse.json({ error: 'company payload required' }, { status: 400 });
  }
  const co = company;

  // Rule-based analysis — always available. Used whenever Gemini is missing, quota'd,
  // or errors, so this endpoint degrades gracefully (200) instead of returning 5xx.
  const fallback = () => {
    try {
      const i = generateInsight(co as unknown as Company, financials as unknown as FinancialYear[]);
      return NextResponse.json({ verdict: i.verdict, confidence: i.confidence, summary: i.summary, bull: i.bull, bear: i.bear, source: 'rule-based' });
    } catch {
      return NextResponse.json({ error: 'analysis failed' }, { status: 500 });
    }
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback();

  try {
    const prompt = buildPrompt(co, financials);
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 550 },
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.error('[ai-analysis] Gemini error:', await res.text().catch(() => ''));
      return fallback();
    }
    const data = await res.json();
    const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback();
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.verdict || !parsed.summary || !parsed.bull || !parsed.bear) return fallback();

    return NextResponse.json({
      verdict:    parsed.verdict,
      confidence: parsed.confidence ?? 'Medium',
      summary:    parsed.summary,
      bull:       parsed.bull,
      bear:       parsed.bear,
      source:     'ai',
    });
  } catch (err) {
    console.error('[ai-analysis] Error:', err);
    return fallback();
  }
}
