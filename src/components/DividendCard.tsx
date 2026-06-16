'use client';
import { useEffect, useState } from 'react';
import { Company } from '@/lib/types';
import SectionCard from './SectionCard';
import { Tile, Muted, CardSkeleton } from './_profileUi';
import { DollarSign } from '@/lib/icons';

interface DividendData {
  available?: boolean; paysDividend: boolean; dividendYield: number;
  lastDividend: number; lastExDate: string; annualRate: number;
  payoutRatioPct: number; payoutHistory: { year: string; payoutPct: number }[];
  plainEnglish: string;
}

export default function DividendCard({ company }: { company: Company }) {
  const [d, setD] = useState<DividendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true; setLoading(true);
    fetch(`/api/dividends/${company.symbol}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live) { setD(j); setLoading(false); } })
      .catch(() => { if (live) { setD(null); setLoading(false); } });
    return () => { live = false; };
  }, [company.symbol]);

  const tone = d?.paysDividend ? 'gain' : 'neutral';
  const hist = (d?.payoutHistory || []).filter(p => p.payoutPct > 0).slice(-6);
  const maxP = Math.max(1, ...hist.map(p => p.payoutPct));

  return (
    <SectionCard title="Dividends" eyebrow="Cash paid to you" Icon={DollarSign} tone={tone}>
      {loading ? <CardSkeleton /> :
       !d || d.available === false ? <Muted>Dividend data isn&apos;t available for this company yet.</Muted> :
       (<>
        <p className="text-[15px] text-primary/90 leading-relaxed">{d.plainEnglish}</p>
        {d.paysDividend && (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <Tile label="Last dividend" value={d.lastDividend ? `₹${d.lastDividend.toFixed(2)}` : '—'} sub={d.lastExDate ? `ex ${d.lastExDate}` : 'per share'} color="text-gain" />
              <Tile label="Dividend yield" value={d.dividendYield ? `${d.dividendYield.toFixed(2)}%` : '—'} sub="of price" />
              <Tile label="Typical payout" value={d.payoutRatioPct ? `${d.payoutRatioPct.toFixed(0)}%` : '—'} sub="of profit" />
            </div>
            {hist.length > 1 && (
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-muted/70 mb-2.5">Payout history</p>
                <div className="flex items-end gap-2 h-20">
                  {hist.map(p => (
                    <div key={p.year} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t-md bg-gain/70" style={{ height: `${Math.max(6, (p.payoutPct / maxP) * 64)}px` }} title={`${p.payoutPct}%`} />
                      <span className="text-[9.5px] font-mono text-muted/70">{p.year}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
       </>)}
    </SectionCard>
  );
}
