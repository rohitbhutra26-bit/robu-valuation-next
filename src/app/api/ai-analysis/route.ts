import { NextRequest, NextResponse } from 'next/server';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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

  return `You are a senior equity research analyst at an institutional fund covering Indian listed companies.
Analyze this stock and produce a concise, institutional-grade assessment.

COMPANY: ${company.name} (${company.symbol})
SECTOR: ${company.sector}
CURRENT PRICE: ₹${company.currentPrice}
MARKET CAP: ₹${company.marketCap} Cr

VALUATION METRICS:
- P/E: ${company.pe}x
- P/B: ${company.pb}x
- ROE: ${company.roe}%
- Debt/Equity: ${company.debtToEquity}x
- Dividend Yield: ${company.dividendYield}%

FINANCIAL TRACK RECORD (${years} years):
- Revenue CAGR: ${revCAGR.toFixed(1)}%
- EPS CAGR: ${epsCAGR.toFixed(1)}%
- Latest Net Margin: ${latest?.netMargin?.toFixed(1) ?? 'N/A'}%
- Latest EBITDA Margin: ${latest?.ebitdaMargin?.toFixed(1) ?? 'N/A'}%
- Latest Revenue: ₹${latest?.revenue ?? 'N/A'} Cr
- Latest PAT: ₹${latest?.pat ?? 'N/A'} Cr
- Latest EPS: ₹${latest?.eps ?? 'N/A'}

Return ONLY valid JSON — no markdown, no text outside the JSON object:
{
  "verdict": "Strong Buy" | "Buy" | "Accumulate" | "Hold" | "Reduce" | "Avoid",
  "confidence": "High" | "Medium" | "Low",
  "summary": "2-3 sentences. Use specific numbers. Write like a CFA analyst — direct, analytical, no generic phrases like 'strong fundamentals' or 'robust growth'. Focus on what the current valuation implies about expectations.",
  "bull": "1-2 sentences. Name the specific catalyst or operating lever that drives the upside case.",
  "bear": "1-2 sentences. Name the specific risk that breaks the thesis — margin pressure, debt, competition, cyclicality."
}

Analytical rules:
- Every claim must reference an actual number from the data above
- For banks/NBFCs: anchor on P/B and credit cycle, not P/E
- For cyclicals (metals, cement, chemicals): warn explicitly if margins/earnings appear near cycle peak
- For high-PE stocks (>40x): note what growth rate is already priced in
- Confidence = High if 4+ years of clean data, Medium if 2-3 years, Low if <2 years or contradictory signals
- If D/E > 2: flag interest coverage risk explicitly
- Tone: institutional, concise, probability-aware. Not promotional. Not a chatbot.`;
}

export async function POST(req: NextRequest) {
  try {
    const { company, financials } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const prompt = buildPrompt(company, financials ?? []);

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 550,
        },
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[ai-analysis] Gemini error:', err);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await res.json();
    const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Extract JSON even if Gemini wraps it in markdown
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[ai-analysis] No JSON in response:', raw);
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.verdict || !parsed.summary || !parsed.bull || !parsed.bear) {
      return NextResponse.json({ error: 'Incomplete AI response' }, { status: 502 });
    }

    return NextResponse.json({
      verdict:    parsed.verdict,
      confidence: parsed.confidence ?? 'Medium',
      summary:    parsed.summary,
      bull:       parsed.bull,
      bear:       parsed.bear,
    });

  } catch (err) {
    console.error('[ai-analysis] Error:', err);
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
  }
}
