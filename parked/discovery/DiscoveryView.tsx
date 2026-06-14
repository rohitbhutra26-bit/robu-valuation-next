'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { DiscoveryRecord, DiscoveryCategory } from '@/app/api/discovery/route';
import { Radar, Clock, Bookmark, ArrowUpRight, TrendingUp, AlertTriangle, ChevronDown, RefreshCw } from '@/lib/icons';
import { toggleWatchlist, isInWatchlist } from '@/lib/watchlist';

const CATEGORIES: ('All' | DiscoveryCategory)[] = [
  'All', 'Hidden Compounder', 'Turnaround', 'Emerging Leader',
  'Deep Value', 'Future Multibagger', 'Smart Money', 'Capacity Expansion',
];

function scoreColor(s: number): string {
  if (s >= 80) return 'text-gain';
  if (s >= 65) return 'text-gold';
  if (s >= 50) return 'text-accent';
  return 'text-muted';
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
}

interface Props {
  onSelectSymbol: (symbol: string) => void;
}

export default function DiscoveryView({ onSelectSymbol }: Props) {
  const [records, setRecords]   = useState<DiscoveryRecord[]>([]);
  const [meta, setMeta]         = useState<{ generatedAt: string; newCount: number }>({ generatedAt: '', newCount: 0 });
  const [loading, setLoading]   = useState(true);
  const [active, setActive]     = useState<'All' | DiscoveryCategory>('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (cat: 'All' | DiscoveryCategory) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/discovery?category=${encodeURIComponent(cat)}`, { cache: 'no-store' });
      const data = await res.json();
      setRecords(data.records ?? []);
      setMeta({ generatedAt: data.generatedAt, newCount: data.newCount ?? 0 });
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(active); }, [active, load]);

  return (
    <div className="max-w-[860px] mx-auto p-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Radar size={18} className="text-gold" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary tracking-tight font-serif leading-none">Discovery</h1>
            <p className="text-[11px] text-muted mt-1">Ideas ROBU found for you — no filters needed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          {meta.generatedAt && (
            <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(meta.generatedAt)}</span>
          )}
          {meta.newCount > 0 && (
            <span className="bg-gain/15 text-gain font-bold px-1.5 py-0.5 rounded-full leading-none">{meta.newCount} new</span>
          )}
          <button onClick={() => load(active)} className="p-1 rounded hover:bg-card text-muted hover:text-primary transition-colors" aria-label="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mt-4 mb-4">
        {CATEGORIES.map(cat => {
          const on = active === cat;
          return (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                on ? 'bg-gold/10 border-gold/30 text-gold'
                   : 'bg-transparent border-border text-muted hover:text-primary hover:border-gold/30'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse h-36" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted">No ideas in this category right now.</div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <DiscoveryCard
              key={r.symbol}
              rec={r}
              expanded={expanded === r.symbol}
              onToggle={() => setExpanded(expanded === r.symbol ? null : r.symbol)}
              onAnalyse={() => onSelectSymbol(r.symbol)}
            />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-[11px] text-muted/50">
        Research ideas, not buy recommendations. Always do your own due diligence.
      </p>
    </div>
  );
}

function DiscoveryCard({ rec, expanded, onToggle, onAnalyse }:
  { rec: DiscoveryRecord; expanded: boolean; onToggle: () => void; onAnalyse: () => void }) {

  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(isInWatchlist(rec.symbol)); }, [rec.symbol]);

  function save() {
    const added = toggleWatchlist({ symbol: rec.symbol, name: rec.name, sector: rec.sector });
    setSaved(added);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 transition-all hover:border-gold/30">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onAnalyse} className="text-base font-bold text-primary hover:text-gold transition-colors leading-tight">
              {rec.name}
            </button>
            {rec.isNew && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gain/15 text-gain border border-gain/20 leading-none">NEW</span>
            )}
          </div>
          <p className="text-[11px] text-muted font-mono mt-0.5">{rec.symbol} · {rec.sector}</p>
        </div>
        <div className="text-center flex-shrink-0">
          <div className={`text-2xl font-bold leading-none ${scoreColor(rec.discoveryScore)}`}>{rec.discoveryScore}</div>
          <div className="text-[9px] text-muted uppercase tracking-wider mt-1">Discovery</div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">{rec.category}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">Conviction: {rec.aiConviction}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-border/40 text-muted">Grade {rec.grade}</span>
      </div>

      {/* Why now */}
      <p className="text-[13px] leading-relaxed text-primary mt-3">
        <span className="text-muted">Why now: </span>{rec.whyNow}
      </p>

      {/* Tailwind / risk one-liners */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[12px]">
        <span className="text-gain flex items-center gap-1"><TrendingUp size={12} /> {rec.futureTailwinds[0]}</span>
        <span className="text-loss flex items-center gap-1"><AlertTriangle size={12} /> {rec.keyRisks[0]}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <button onClick={onToggle}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted hover:text-primary hover:border-gold/30 transition-all">
          {expanded ? 'Hide breakdown' : 'See full breakdown'}
          <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={onAnalyse}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-all">
          Analyse <ArrowUpRight size={13} />
        </button>
        <button onClick={save} aria-label="Save to watchlist"
          className={`p-2 rounded-lg border transition-all ${saved ? 'bg-gold/10 border-gold/30 text-gold' : 'border-border text-muted hover:text-primary hover:border-gold/30'}`}>
          <Bookmark size={14} />
        </button>
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-[12px]">
          <Field label="Why ROBU found it" value={rec.whyFound} />
          <Field label="Why the market may be wrong" value={rec.whyMarketMayBeWrong} />
          <Field label="Narrative shift" value={rec.narrativeShift} />
          <Field label="Hidden optionality" value={rec.hiddenOptionality} />
          <ListField label="Future tailwinds" items={rec.futureTailwinds} tone="gain" />
          <ListField label="Future threats" items={rec.futureThreats} tone="loss" />
          <ListField label="Key risks" items={rec.keyRisks} tone="loss" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted/70 font-semibold mb-1.5">Sub-scores</p>
            <SubScore label="Industry transformation" value={rec.industryTransformationScore} />
            <SubScore label="Future readiness" value={rec.futureReadinessScore} />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted/70 font-semibold mb-1">{label}</p>
      <p className="text-primary leading-relaxed">{value}</p>
    </div>
  );
}

function ListField({ label, items, tone }: { label: string; items: string[]; tone: 'gain' | 'loss' }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted/70 font-semibold mb-1">{label}</p>
      <ul className="space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className={`leading-relaxed ${tone === 'gain' ? 'text-gain' : 'text-loss'}`}>· {it}</li>
        ))}
      </ul>
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[11px] text-muted w-36 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border/50 overflow-hidden">
        <div className="h-full rounded-full bg-gold" style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-mono font-semibold text-primary w-7 text-right">{value}</span>
    </div>
  );
}
