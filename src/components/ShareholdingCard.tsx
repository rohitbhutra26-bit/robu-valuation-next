'use client';
import { useEffect, useState } from 'react';
import { Company } from '@/lib/types';
import SectionCard from './SectionCard';
import { Muted, CardSkeleton } from './_profileUi';
import { PieChart } from '@/lib/icons';

interface SH {
  available: boolean; asOf?: string;
  latest?: { promoter: number; fii: number; dii: number; government: number; public: number; others: number; shareholders: number };
  pledgePct?: number | null; plainEnglish: string;
}

const SEG: { key: keyof NonNullable<SH['latest']>; label: string; color: string }[] = [
  { key: 'promoter', label: 'Promoters', color: 'var(--color-gold)' },
  { key: 'fii',      label: 'FII',       color: 'var(--color-accent)' },
  { key: 'dii',      label: 'DII',       color: 'var(--color-gain)' },
  { key: 'public',   label: 'Public',    color: 'var(--color-warning)' },
  { key: 'others',   label: 'Others',    color: 'var(--color-muted)' },
];

export default function ShareholdingCard({ company }: { company: Company }) {
  const [d, setD] = useState<SH | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true; setLoading(true);
    fetch(`/api/shareholding/${company.symbol}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live) { setD(j); setLoading(false); } })
      .catch(() => { if (live) { setD(null); setLoading(false); } });
    return () => { live = false; };
  }, [company.symbol]);

  const L = d?.latest;
  return (
    <SectionCard title="Who owns it" eyebrow={d?.asOf ? `Shareholding · ${d.asOf}` : 'Shareholding'} Icon={PieChart} tone="neutral">
      {loading ? <CardSkeleton /> :
       !d || d.available === false || !L ? <Muted>Ownership breakdown isn&apos;t published for this company yet.</Muted> :
       (<>
        <p className="text-[15px] text-primary/90 leading-relaxed">{d.plainEnglish}</p>
        {/* stacked ownership bar */}
        <div className="mt-4 flex h-3.5 w-full rounded-full overflow-hidden border border-border">
          {SEG.map(s => {
            const v = L[s.key] as number;
            return v > 0 ? <div key={s.key} style={{ width: `${v}%`, background: `rgb(${s.color})` }} title={`${s.label} ${v}%`} /> : null;
          })}
        </div>
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
          {SEG.map(s => {
            const v = L[s.key] as number;
            return v > 0 ? (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: `rgb(${s.color})` }} />
                <span className="text-[12.5px] text-muted flex-1">{s.label}</span>
                <span className="text-[12.5px] font-mono font-semibold text-primary">{v.toFixed(1)}%</span>
              </div>
            ) : null;
          })}
        </div>
        {d.pledgePct ? (
          <p className="mt-3.5 text-[12.5px] text-loss bg-loss/10 border border-loss/20 rounded-xl px-3 py-2">
            ⚠ {d.pledgePct.toFixed(0)}% of promoter shares are pledged as loan collateral.
          </p>
        ) : null}
       </>)}
    </SectionCard>
  );
}
