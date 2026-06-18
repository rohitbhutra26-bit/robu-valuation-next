'use client';

import { useEffect, useMemo, useState } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import {
  expectationGap, trajectoryInflection, narrativeLayer, catalystWatch, rateContext,
  combinePotential, QuarterRow, SourceDoc, NarrativeItem, MacroInput, LayerResult, StoryDir,
} from '@/lib/storyEngine';
import SectionCard from './SectionCard';
import { Gauge, TrendingUp, TrendingDown, Minus } from '@/lib/icons';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://robu-data-server-production.up.railway.app';

const TONE: Record<StoryDir, string> = {
  positive: 'text-gain border-gain/25 bg-gain/10',
  negative: 'text-loss border-loss/25 bg-loss/10',
  neutral:  'text-warning border-warning/25 bg-warning/10',
  unknown:  'text-muted border-border bg-card',
};
function DirIcon({ dir }: { dir: StoryDir }) {
  if (dir === 'positive') return <TrendingUp size={13} className="text-gain" />;
  if (dir === 'negative') return <TrendingDown size={13} className="text-loss" />;
  return <Minus size={13} className="text-warning" />;
}

interface Props { company: Company; financials: FinancialYear[]; assumptions: ValuationAssumptions; }

export default function StoryPotentialCard({ company, financials, assumptions }: Props) {
  const [quarters, setQuarters] = useState<QuarterRow[]>([]);
  const [sources, setSources]   = useState<SourceDoc[]>([]);
  const [macro, setMacro]       = useState<MacroInput | null>(null);
  const [narrative, setNarr]    = useState<NarrativeItem[]>([]);
  const [open, setOpen]         = useState<string | null>('expectation-gap');

  useEffect(() => {
    let alive = true;
    const base = process.env.NEXT_PUBLIC_DATA_SERVER_URL || '';
    Promise.all([
      fetch(`${base}/api/quarterly/${company.symbol}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/announcements/${company.symbol}`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch(`/api/macro`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/story-narrative/${company.symbol}`).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
    ]).then(([q, a, m, n]) => {
      if (!alive) return;
      setQuarters(Array.isArray(q) ? q : []);
      const list = ((a as any).announcements || a || []) as Array<{ subject?: string; title?: string; date?: string }>;
      setSources(list.map(x => ({ text: x.subject || x.title || '', date: x.date })).filter(s => s.text));
      setMacro(m || { y10: 6.86, direction: 'falling', refLow: 6.5, refHigh: 7.4, asOf: 'recent' });
      setNarr(Array.isArray(n.items) ? n.items : []);
    });
    return () => { alive = false; };
  }, [company.symbol]);

  const { layers, overall } = useMemo(() => {
    const m: MacroInput = macro || { y10: 6.86, direction: 'falling', refLow: 6.5, refHigh: 7.4, asOf: 'recent' };
    const layers: LayerResult[] = [
      expectationGap(company, financials, assumptions),
      trajectoryInflection(company, financials, quarters),
      narrativeLayer(narrative, sources),
      catalystWatch(company, quarters, sources),
      rateContext(company, m),
    ];
    return { layers, overall: combinePotential(layers) };
  }, [company, financials, assumptions, quarters, sources, macro, narrative]);

  if (!financials.length) return null;

  return (
    <SectionCard
      title="Re-rating Potential"
      eyebrow="Story engine · expectations investing"
      desc="A layer above fair value: will the market pay a HIGHER or lower multiple from here? We compare the growth the price already assumes against how the business is actually trending — plus its story, catalysts and the rate backdrop. Evidence, never a black-box buy."
      Icon={Gauge}
      tone={overall.dir === 'positive' ? 'gain' : overall.dir === 'negative' ? 'loss' : 'warning'}
      id="sec-potential"
    >
      {/* overall read */}
      <div className={`rounded-2xl border p-4 mb-4 ${TONE[overall.dir]}`}>
        <div className="flex items-center gap-2 mb-1.5">
          <DirIcon dir={overall.dir} />
          <span className="text-sm font-bold">{overall.signal}</span>
        </div>
        <p className="text-[13px] leading-relaxed text-primary/90">{overall.headline}</p>
        <p className="text-[11px] text-muted mt-2">{overall.conviction}</p>
      </div>

      {/* layer rows */}
      <div className="space-y-1.5">
        {layers.map(l => {
          const isOpen = open === l.id;
          return (
            <div key={l.id} className="rounded-xl border border-border bg-card/50 overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : l.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-card transition-colors"
              >
                <DirIcon dir={l.dir} />
                <span className="text-[12px] font-semibold text-primary min-w-0 flex-shrink-0">{l.title}</span>
                <span className="text-[11px] text-muted truncate flex-1">{l.signal}</span>
                <span className="text-muted text-[10px]">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-0.5">
                  <p className="text-[12px] text-primary/85 leading-relaxed mb-2">{l.headline}</p>
                  {l.evidence.length > 0 && (
                    <ul className="space-y-1">
                      {l.evidence.map((e, i) => (
                        <li key={i} className="text-[11px] text-muted leading-relaxed pl-3 relative">
                          <span className="absolute left-0 top-1.5 w-1 h-1 rounded-full bg-muted/50" />{e}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted/70 mt-3 leading-relaxed">
        Re-rating potential is about the multiple, not a price target. It is one input among many — read the evidence,
        not the colour. Narrative signals are extracted from the company's real disclosures and quote-verified.
      </p>
    </SectionCard>
  );
}
