'use client';

import { useEffect, useState } from 'react';
import { Company } from '@/lib/types';

interface Peer {
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  isSelf: boolean;
}

interface SectorAlternativesProps {
  company: Company;
  onSelectSymbol: (symbol: string) => void;
}

function score(p: Peer): number {
  // Higher ROE = better, Lower PE = better, Lower PB = better
  const roeScore = Math.min((p.roe ?? 0) / 30, 1) * 40;          // 0–40 pts
  const peScore  = p.pe && p.pe > 0 ? Math.max(1 - p.pe / 60, 0) * 35 : 0;  // 0–35 pts
  const pbScore  = p.pb && p.pb > 0 ? Math.max(1 - p.pb / 10, 0) * 25 : 0;  // 0–25 pts
  return Math.round(roeScore + peScore + pbScore);
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border tracking-wide ${color}`}>
      {text}
    </span>
  );
}

export default function SectorAlternatives({ company, onSelectSymbol }: SectorAlternativesProps) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sector, setSector] = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL || 'https://robu-data-server-production.up.railway.app';

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/peers/${company.symbol}`)
      .then(r => r.json())
      .then(d => {
        setSector(d.sector || '');
        const others = (d.peers || []).filter((p: Peer) => !p.isSelf && p.pe && p.pe > 0 && p.roe && p.roe > 0);
        setPeers(others);
      })
      .catch(() => setPeers([]))
      .finally(() => setLoading(false));
  }, [company.symbol]);

  if (loading) return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6">
      <p className="text-xs text-muted animate-pulse">Finding better stocks in sector...</p>
    </div>
  );

  if (!peers.length) return null;

  // Rank by composite score
  const ranked = [...peers].sort((a, b) => score(b) - score(a)).slice(0, 5);
  const best     = ranked[0];
  const selfScore = score({ symbol: company.symbol, name: company.name, currentPrice: company.currentPrice,
    marketCap: company.marketCap, pe: company.pe, pb: company.pb, roe: company.roe, isSelf: true });

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-primary">Better in Sector</h3>
          <p className="text-[11px] text-muted mt-0.5">{sector} — ranked by ROE, PE, PB</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted">Your stock score</p>
          <p className={`text-sm font-bold font-mono ${selfScore >= 60 ? 'text-gain' : selfScore >= 40 ? 'text-warning' : 'text-loss'}`}>
            {selfScore}/100
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {ranked.map((peer, i) => {
          const s = score(peer);
          const isBetter = s > selfScore;
          const badges = [];
          if (i === 0) badges.push({ text: 'BEST OVERALL', color: 'text-gain bg-gain/10 border-gain/20' });
          if (peer.roe && peer.roe === Math.max(...ranked.map(p => p.roe ?? 0)))
            badges.push({ text: 'TOP ROE', color: 'text-accent bg-accent/10 border-accent/20' });
          if (peer.pe && peer.pe === Math.min(...ranked.filter(p => p.pe && p.pe > 0).map(p => p.pe!)))
            badges.push({ text: 'CHEAPEST PE', color: 'text-gold bg-gold/10 border-gold/20' });

          return (
            <button
              key={peer.symbol}
              onClick={() => onSelectSymbol(peer.symbol)}
              className="w-full text-left rounded-lg border border-border hover:border-gold/40 hover:bg-gold/3 transition-all p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-xs font-bold text-primary font-mono">{peer.symbol}</span>
                    {badges.map(b => <Badge key={b.text} text={b.text} color={b.color} />)}
                  </div>
                  <p className="text-[11px] text-muted truncate">{peer.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold font-mono ${s >= 60 ? 'text-gain' : s >= 40 ? 'text-warning' : 'text-loss'}`}>
                    {s}/100
                  </p>
                  {isBetter && <p className="text-[10px] text-gain font-bold">↑ Better</p>}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <span className="text-[10px] text-muted">PE <span className="text-primary font-mono">{peer.pe?.toFixed(1) ?? '—'}</span></span>
                <span className="text-[10px] text-muted">ROE <span className="text-primary font-mono">{peer.roe?.toFixed(1) ?? '—'}%</span></span>
                <span className="text-[10px] text-muted">PB <span className="text-primary font-mono">{peer.pb?.toFixed(1) ?? '—'}x</span></span>
                <span className="text-[10px] text-muted">MCap <span className="text-primary font-mono">₹{peer.marketCap > 100000 ? (peer.marketCap/100000).toFixed(1)+'L' : (peer.marketCap/1000).toFixed(0)+'K'} Cr</span></span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-muted border-t border-border pt-2">
        Click any stock to analyse it. Score = ROE quality (40pts) + PE value (35pts) + PB value (25pts).
      </p>
    </div>
  );
}
