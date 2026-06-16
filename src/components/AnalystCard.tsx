'use client';
import { useEffect, useState } from 'react';
import { Company } from '@/lib/types';
import SectionCard from './SectionCard';
import { Tile, Muted, CardSkeleton } from './_profileUi';
import { Target } from '@/lib/icons';

interface Analyst {
  available: boolean; rating: string; ratingScore: number; numAnalysts: number;
  currentPrice: number; targetMean: number; targetHigh: number; targetLow: number;
  upsidePct: number; distribution: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number };
  plainEnglish: string;
}

const DIST: { key: keyof Analyst['distribution']; label: string; color: string }[] = [
  { key: 'strongBuy',  label: 'Strong Buy', color: 'var(--color-gain)' },
  { key: 'buy',        label: 'Buy',        color: 'var(--color-gain)' },
  { key: 'hold',       label: 'Hold',       color: 'var(--color-warning)' },
  { key: 'sell',       label: 'Sell',       color: 'var(--color-loss)' },
  { key: 'strongSell', label: 'Strong Sell',color: 'var(--color-loss)' },
];

export default function AnalystCard({ company }: { company: Company }) {
  const [d, setD] = useState<Analyst | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true; setLoading(true);
    fetch(`/api/analyst/${company.symbol}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live) { setD(j); setLoading(false); } })
      .catch(() => { if (live) { setD(null); setLoading(false); } });
    return () => { live = false; };
  }, [company.symbol]);

  const tone = !d ? 'neutral' : d.upsidePct > 1 ? 'gain' : d.upsidePct < -1 ? 'loss' : 'neutral';
  // target range bar positions
  const lo = d?.targetLow || 0, hi = d?.targetHigh || 0;
  const span = hi - lo;
  const posOf = (v: number) => (span > 0 ? Math.max(0, Math.min(100, ((v - lo) / span) * 100)) : 50);
  const totalVotes = d ? Object.values(d.distribution).reduce((a, b) => a + b, 0) : 0;

  return (
    <SectionCard title="What analysts think" eyebrow="Wall Street view" Icon={Target} tone={tone}>
      {loading ? <CardSkeleton /> :
       !d || d.available === false ? <Muted>No analyst coverage available for this company.</Muted> :
       (<>
        <p className="text-[15px] text-primary/90 leading-relaxed">{d.plainEnglish}</p>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Tile label="Consensus" value={d.rating || '—'} sub={`${d.numAnalysts} analysts`} />
          <Tile label="Avg target" value={d.targetMean ? `₹${d.targetMean.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                sub={d.upsidePct ? `${d.upsidePct > 0 ? '+' : ''}${d.upsidePct.toFixed(0)}% vs now` : ''}
                color={d.upsidePct > 1 ? 'text-gain' : d.upsidePct < -1 ? 'text-loss' : 'text-primary'} />
          <Tile label="Range" value={lo && hi ? `₹${lo.toFixed(0)}–${hi.toFixed(0)}` : '—'} sub="low → high" />
        </div>
        {/* target range bar with current price marker */}
        {span > 0 && (
          <div className="mt-5">
            <div className="relative h-2 rounded-full bg-border/60">
              <div className="absolute h-2 rounded-full bg-gold/40" style={{ left: `${posOf(d.targetLow)}%`, right: `${100 - posOf(d.targetHigh)}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gold border-2 border-card" style={{ left: `calc(${posOf(d.targetMean)}% - 6px)` }} title={`Avg target ₹${d.targetMean.toFixed(0)}`} />
              {d.currentPrice > 0 && (
                <div className="absolute -top-1 w-0.5 h-4 bg-primary" style={{ left: `${posOf(d.currentPrice)}%` }} title={`Now ₹${d.currentPrice.toFixed(0)}`} />
              )}
            </div>
            <div className="flex justify-between mt-1.5 text-[10.5px] font-mono text-muted/70">
              <span>₹{lo.toFixed(0)}</span><span className="text-primary/80">now ₹{d.currentPrice.toFixed(0)}</span><span>₹{hi.toFixed(0)}</span>
            </div>
          </div>
        )}
        {/* recommendation distribution */}
        {totalVotes > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-muted/70 mb-2.5">How they rate it</p>
            <div className="flex h-3 w-full rounded-full overflow-hidden border border-border">
              {DIST.map(s => { const v = d.distribution[s.key]; return v > 0 ? <div key={s.key} style={{ width: `${(v / totalVotes) * 100}%`, background: `rgb(${s.color})` }} title={`${s.label}: ${v}`} /> : null; })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
              {DIST.map(s => { const v = d.distribution[s.key]; return v > 0 ? (
                <span key={s.key} className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  <span className="w-2 h-2 rounded-sm" style={{ background: `rgb(${s.color})` }} />{s.label} {v}
                </span>) : null; })}
            </div>
          </div>
        )}
       </>)}
    </SectionCard>
  );
}
