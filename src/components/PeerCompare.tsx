'use client';

import { useEffect, useState } from 'react';
import { Company } from '@/lib/types';
import { Sparkles } from '@/lib/icons';

interface Peer {
  symbol: string;
  name: string;
  marketCap: number | null;
  currentPrice: number | null;
  pe: number | null;
  pb: number | null;
  evEbitda: number | null;
  revenueGrowth: number | null;
  netMargin: number | null;
  roe: number | null;
  de: number | null;
  isSelf: boolean;
}

interface PeerData {
  sector: string;
  source?: 'ai' | 'legacy' | 'self-only';
  peers: Peer[];
}

// ─── Column config ────────────────────────────────────────────────────────────
interface ColDef {
  key: keyof Peer;
  label: string;
  shortLabel: string;
  fmt: (v: number) => string;
  higherBetter: boolean;
  suffix?: string;
}

const COLS: ColDef[] = [
  { key: 'pe',           label: 'P/E',            shortLabel: 'P/E',     fmt: v => v.toFixed(1),  higherBetter: false },
  { key: 'pb',           label: 'P/B',            shortLabel: 'P/B',     fmt: v => v.toFixed(1),  higherBetter: false },
  { key: 'evEbitda',     label: 'EV/EBITDA',      shortLabel: 'EV/EB',   fmt: v => v.toFixed(1),  higherBetter: false },
  { key: 'revenueGrowth',label: 'Rev Growth',     shortLabel: 'Rev Gr',  fmt: v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, higherBetter: true },
  { key: 'netMargin',    label: 'Net Margin',     shortLabel: 'Margin',  fmt: v => `${v.toFixed(1)}%`,  higherBetter: true },
  { key: 'roe',          label: 'ROE',            shortLabel: 'ROE',     fmt: v => `${v.toFixed(1)}%`,  higherBetter: true },
  { key: 'de',           label: 'D/E',            shortLabel: 'D/E',     fmt: v => v.toFixed(2),  higherBetter: false },
];

// ─── Ranking color per column ─────────────────────────────────────────────────
function getRankColor(value: number | null, allValues: (number | null)[], higherBetter: boolean): string {
  const valid = allValues.filter((v): v is number => v !== null);
  if (valid.length < 2 || value === null) return 'text-muted';
  const sorted = [...valid].sort((a, b) => higherBetter ? b - a : a - b);
  const rank = sorted.indexOf(value);
  const pct = rank / (sorted.length - 1);
  if (pct <= 0.25) return 'text-gain font-semibold';
  if (pct <= 0.5)  return 'text-gain/70';
  if (pct <= 0.75) return 'text-gold/80';
  return 'text-loss/80';
}

function fmtMktCap(cr: number | null): string {
  if (!cr) return '—';
  if (cr >= 100000) return `₹${(cr / 100000).toFixed(1)}L Cr`;
  if (cr >= 1000)   return `₹${(cr / 1000).toFixed(0)}K Cr`;
  return `₹${cr.toFixed(0)} Cr`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PeerCompare({ company }: { company: Company }) {
  const [data, setData]       = useState<PeerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/peers/${company.symbol}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [company.symbol]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <p className="text-sm text-muted">Fetching sector peers…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-sm text-loss">{error || 'No peer data available'}</p>
        <p className="text-xs text-muted mt-1">Peer data could not be loaded. Check that the data server is running.</p>
      </div>
    );
  }

  const peers = data.peers;
  if (!peers.length || (peers.length === 1 && peers[0].isSelf)) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-sm text-muted">No comparable peers found for {company.name}.</p>
        <p className="text-xs text-muted/60 mt-1">This may be a unique business with no listed Indian peers.</p>
      </div>
    );
  }

  const isAISource = data.source === 'ai';

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-primary">Peer Comparison</h3>
          <p className="text-xs text-muted mt-0.5">
            {data.sector || company.sector} · {peers.length} companies
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAISource && (
            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded text-accent font-mono">
              <Sparkles size={9} /> AI peers
            </span>
          )}
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gain inline-block" /> Best</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold inline-block" /> Mid</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-loss inline-block" /> Worst</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left pb-2 pr-3 font-medium text-muted whitespace-nowrap">Company</th>
              <th className="text-right pb-2 px-2 font-medium text-muted whitespace-nowrap">Mkt Cap</th>
              <th className="text-right pb-2 px-2 font-medium text-muted whitespace-nowrap">Price</th>
              {COLS.map(c => (
                <th key={c.key as string} className="text-right pb-2 px-2 font-medium text-muted whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {peers.map((peer) => {
              const isSelf = peer.isSelf;
              return (
                <tr
                  key={peer.symbol}
                  className={`border-b border-border/40 transition-colors ${
                    isSelf
                      ? 'bg-gold/5 border-l-2 border-l-gold'
                      : 'hover:bg-border/20'
                  }`}
                >
                  {/* Name */}
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {isSelf && (
                        <span className="text-[8px] font-bold text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded">YOU</span>
                      )}
                      <div>
                        <div className={`font-mono font-semibold ${isSelf ? 'text-gold' : 'text-primary'}`}>{peer.symbol}</div>
                        <div className="text-[10px] text-muted max-w-[140px] truncate">{peer.name}</div>
                      </div>
                    </div>
                  </td>

                  {/* Mkt Cap */}
                  <td className="py-2.5 px-2 text-right font-mono text-muted whitespace-nowrap">
                    {fmtMktCap(peer.marketCap)}
                  </td>

                  {/* Price */}
                  <td className="py-2.5 px-2 text-right font-mono text-primary whitespace-nowrap">
                    {peer.currentPrice ? `₹${peer.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                  </td>

                  {/* Metric columns */}
                  {COLS.map(col => {
                    const val = peer[col.key] as number | null;
                    const allVals = peers.map(p => p[col.key] as number | null);
                    const cls = getRankColor(val, allVals, col.higherBetter);
                    return (
                      <td key={col.key as string} className={`py-2.5 px-2 text-right font-mono whitespace-nowrap ${cls}`}>
                        {val !== null ? col.fmt(val) : <span className="text-muted/40">—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <p className="text-[10px] text-muted mt-3 text-center">
        Green = top quartile · Amber = mid · Red = bottom quartile · YOU = {company.symbol}
        {isAISource ? ' · Peers identified by Gemini AI' : ' · Data from Yahoo Finance'}
      </p>
    </div>
  );
}
