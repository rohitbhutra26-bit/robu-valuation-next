'use client';

import { useEffect, useState } from 'react';
import { Company } from '@/lib/types';
import { Zap, TrendingUp, TrendingDown, Minus } from '@/lib/icons';

interface QuarterlyResult {
  quarter: string;
  revenue: number;
  pat: number;
  opm: number;
  eps: number;
}

interface QuarterlyFlashProps {
  company: Company;
}

function BeatBadge({ beat }: { beat: 'up' | 'down' | 'flat' }) {
  if (beat === 'up')   return <TrendingUp size={11} className="text-gain" />;
  if (beat === 'down') return <TrendingDown size={11} className="text-loss" />;
  return <Minus size={11} className="text-gold" />;
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function signal(pct: number): 'up' | 'down' | 'flat' {
  if (pct > 5) return 'up';
  if (pct < -5) return 'down';
  return 'flat';
}

export default function QuarterlyFlash({ company }: QuarterlyFlashProps) {
  const [quarters, setQuarters] = useState<QuarterlyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const base = process.env.NEXT_PUBLIC_DATA_SERVER_URL || '';
    fetch(`${base}/api/quarterly/${company.symbol}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setQuarters(Array.isArray(data) ? data.slice(0, 8) : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [company.symbol]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-gold" />
          <h3 className="text-sm font-semibold text-primary">Quarterly Results</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-border/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || quarters.length === 0) return null;

  const latest = quarters[0];
  const prevYear = quarters[4]; // same quarter last year
  const prevQuarter = quarters[1];

  const yoyRev = prevYear ? pctChange(latest.revenue, prevYear.revenue) : null;
  const yoyPat = prevYear ? pctChange(latest.pat, prevYear.pat) : null;
  const qoqRev = prevQuarter ? pctChange(latest.revenue, prevQuarter.revenue) : null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Zap size={14} className="text-gold" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Quarterly Results</h3>
            <p className="text-[10px] text-muted mt-0.5">Last reported: {latest.quarter}</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 bg-gold/10 border border-gold/20 rounded text-gold font-mono">
          {latest.quarter}
        </span>
      </div>

      {/* Latest quarter highlight cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* Revenue */}
        <div className="bg-border/20 rounded-xl p-3">
          <p className="text-[10px] text-muted mb-1">Revenue</p>
          <p className="text-base font-bold font-mono text-primary">
            ₹{latest.revenue.toLocaleString('en-IN')} Cr
          </p>
          {yoyRev !== null && (
            <div className={`flex items-center gap-1 mt-1 text-[11px] font-semibold ${
              yoyRev >= 0 ? 'text-gain' : 'text-loss'
            }`}>
              <BeatBadge beat={signal(yoyRev)} />
              {yoyRev >= 0 ? '+' : ''}{yoyRev.toFixed(1)}% YoY
            </div>
          )}
          {qoqRev !== null && (
            <p className="text-[10px] text-muted/60 mt-0.5">
              {qoqRev >= 0 ? '+' : ''}{qoqRev.toFixed(1)}% QoQ
            </p>
          )}
        </div>

        {/* PAT */}
        <div className="bg-border/20 rounded-xl p-3">
          <p className="text-[10px] text-muted mb-1">Net Profit (PAT)</p>
          <p className={`text-base font-bold font-mono ${latest.pat >= 0 ? 'text-gain' : 'text-loss'}`}>
            ₹{latest.pat.toLocaleString('en-IN')} Cr
          </p>
          {yoyPat !== null && (
            <div className={`flex items-center gap-1 mt-1 text-[11px] font-semibold ${
              yoyPat >= 0 ? 'text-gain' : 'text-loss'
            }`}>
              <BeatBadge beat={signal(yoyPat)} />
              {yoyPat >= 0 ? '+' : ''}{yoyPat.toFixed(1)}% YoY
            </div>
          )}
          {latest.opm > 0 && (
            <p className="text-[10px] text-muted/60 mt-0.5">OPM {latest.opm.toFixed(1)}%</p>
          )}
        </div>
      </div>

      {/* Trend table — last 6 quarters */}
      <div>
        <p className="text-[10px] text-muted uppercase tracking-wider mb-2 font-semibold">6-quarter trend</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-muted pb-1.5 font-medium pr-3">Quarter</th>
                <th className="text-right text-muted pb-1.5 font-medium pr-3">Revenue (Cr)</th>
                <th className="text-right text-muted pb-1.5 font-medium pr-3">PAT (Cr)</th>
                <th className="text-right text-muted pb-1.5 font-medium">OPM %</th>
              </tr>
            </thead>
            <tbody>
              {quarters.slice(0, 6).map((q, i) => {
                const prev = quarters[i + 1];
                const revChg = prev ? pctChange(q.revenue, prev.revenue) : null;
                return (
                  <tr key={q.quarter} className={`border-b border-border/30 last:border-0 ${i === 0 ? 'bg-gold/5' : ''}`}>
                    <td className={`py-1.5 pr-3 font-mono font-semibold ${i === 0 ? 'text-gold' : 'text-muted'}`}>
                      {q.quarter}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono text-primary">
                      {q.revenue > 0 ? q.revenue.toLocaleString('en-IN') : '—'}
                      {revChg !== null && (
                        <span className={`ml-1 text-[10px] ${revChg >= 0 ? 'text-gain' : 'text-loss'}`}>
                          {revChg >= 0 ? '▲' : '▼'}{Math.abs(revChg).toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className={`py-1.5 pr-3 text-right font-mono ${q.pat >= 0 ? 'text-gain' : 'text-loss'}`}>
                      {q.pat !== 0 ? q.pat.toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="py-1.5 text-right font-mono text-muted">
                      {q.opm > 0 ? `${q.opm.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trend verdict */}
      {yoyRev !== null && (
        <div className={`text-[11px] rounded-lg px-3 py-2.5 border leading-snug ${
          yoyRev >= 15 && (yoyPat ?? 0) >= 15 ? 'bg-gain/10 text-gain border-gain/20' :
          (yoyRev ?? 0) < 0 || (yoyPat ?? 0) < 0 ? 'bg-loss/10 text-loss border-loss/20' :
          'bg-gold/10 text-gold border-gold/20'
        }`}>
          {yoyRev >= 15 && (yoyPat ?? 0) >= 15
            ? `Strong quarter — revenue +${yoyRev.toFixed(1)}% and profit +${(yoyPat ?? 0).toFixed(1)}% vs same quarter last year`
            : (yoyRev < 0 || (yoyPat ?? 0) < 0)
            ? `Weak quarter — revenue ${yoyRev.toFixed(1)}% and profit ${(yoyPat ?? 0).toFixed(1)}% vs same quarter last year`
            : `Steady quarter — revenue +${yoyRev.toFixed(1)}% and profit +${(yoyPat ?? 0).toFixed(1)}% vs same quarter last year`}
        </div>
      )}
    </div>
  );
}
