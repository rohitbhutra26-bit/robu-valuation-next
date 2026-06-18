import { NextRequest, NextResponse } from 'next/server';
import type { Company } from '@/lib/types';
import { buildNarrativePrompt, verifyNarrative, SourceDoc, NarrativeItem } from '@/lib/storyEngine';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const DATA_SERVER = process.env.DATA_SERVER_URL || process.env.NEXT_PUBLIC_DATA_SERVER_URL || 'http://localhost:8000';

// Layer 3 (Narrative): ask Gemini to extract story signals from the company's REAL
// recent disclosures, then machine-verify every quoted span against the source.
// Anything not verbatim-grounded is dropped server-side — no hallucinated evidence.
export async function GET(_req: NextRequest, { params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  try {
    const [cRes, aRes] = await Promise.all([
      fetch(`${DATA_SERVER}/company-v2/${symbol}`),
      fetch(`${DATA_SERVER}/announcements/${symbol}`),
    ]);
    const company = (await cRes.json()) as Company;
    const aJson = await aRes.json().catch(() => ({}));
    const list = (aJson.announcements || aJson || []) as Array<{ subject?: string; title?: string; date?: string }>;
    const sources: SourceDoc[] = list.map(x => ({ text: x.subject || x.title || '', date: x.date })).filter(s => s.text).slice(0, 15);

    if (!sources.length) return NextResponse.json({ items: [], verified: 0 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ items: [], verified: 0, note: 'no-llm' });

    const prompt = buildNarrativePrompt(company, sources);
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 } }),
    });
    if (!res.ok) return NextResponse.json({ items: [], verified: 0, note: 'llm-error' });
    const data = await res.json();
    const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    let parsed: NarrativeItem[] = [];
    try {
      const jsonStr = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch { parsed = []; }
    const { verified } = verifyNarrative(Array.isArray(parsed) ? parsed : [], sources);
    return NextResponse.json({ items: verified, verified: verified.length, scanned: sources.length });
  } catch {
    return NextResponse.json({ items: [], verified: 0, note: 'fetch-error' });
  }
}
