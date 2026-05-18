'use client';

import { useState, useMemo } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getSectorProfile } from '@/lib/sectorModelMap';
import { computeTargetPath, Feasibility, PathRequirement } from '@/lib/targetPathEngine';

interface Props {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

// ─── Feasibility config ───────────────────────────────────────────────────────
const FEASIBILITY: Record<Feasibility, { label: string; color: string; bg: string; border: string; dot: string }> = {
  achievable:  { label: 'Achievable',  color: 'text-gain', bg: 'bg-gain/10',  border: 'border-gain/30',  dot: '#10B981' },
  ambitious:   { label: 'Ambitious',   color: 'text-gold', bg: 'bg-gold/10',  border: 'border-gold/30',  dot: '#34d399' },
  difficult:   { label: 'Difficult',   color: 'text-loss', bg: 'bg-loss/10',  border: 'border-loss/30',  dot: '#EF4444' },
  unrealistic: { label: 'Unrealistic', color: 'text-loss', bg: 'bg-loss/20',  border: 'border-loss/40',  dot: '#EF4444' },
};

// ─── Requirement row ──────────────────────────────────────────────────────────
function RequirementRow({ req, applicable = true }: { req: PathRequirement; applicable?: boolean }) {
  const f = FEASIBILITY[req.feasibility];

  if (!applicable) {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0 opacity-40">
        <div className="w-2 h-2 rounded-full bg-border flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted">{req.label}</p>
          <p className="text-xs text-muted mt-0.5 italic">Not applicable for this valuation model</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.dot }} />
          <span className="text-xs text-muted">{req.label}</span>
        </div>
        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${f.color} ${f.bg} ${f.border} flex-shrink-0`}>
          {f.label}
        </span>
      </div>

      {/* Required value — big */}
      <div className="ml-4 mb-1">
        <span className={`text-xl font-bold font-mono ${f.color}`}>
          {req.value > 0 ? `${req.value.toFixed(req.unit === 'x' ? 1 : 1)}${req.unit}` : '—'}
        </span>
        <span className="text-xs text-muted ml-2">{req.context}</span>
      </div>

      {/* Explanation */}
      <p className="ml-4 text-[11px] text-muted leading-relaxed">{req.explanation}</p>

      {/* Visual bar — how far above reference */}
      {req.value > 0 && (
        <div className="ml-4 mt-2">
          <div className="h-1 bg-border rounded-full overflow-hidden w-full">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                backgroundColor: f.dot,
                width: `${Math.min(Math.max((req.value / (req.value * 1.5)) * 100, 5), 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick target presets ─────────────────────────────────────────────────────
function presets(currentPrice: number) {
  return [
    { label: '1.5×', value: Math.round(currentPrice * 1.5) },
    { label: '2×',   value: Math.round(currentPrice * 2)   },
    { label: '3×',   value: Math.round(currentPrice * 3)   },
    { label: '5×',   value: Math.round(currentPrice * 5)   },
  ];
}

// ─── Overall verdict banner ───────────────────────────────────────────────────
function VerdictBanner({ feasibility, summary }: { feasibility: Feasibility; summary: string }) {
  const f = FEASIBILITY[feasibility];
  const icons: Record<Feasibility, string> = {
    achievable:  '✓',
    ambitious:   '⚡',
    difficult:   '⚠',
    unrealistic: '✗',
  };

  return (
    <div className={`rounded-xl p-4 border ${f.bg} ${f.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-base font-bold ${f.color}`}>{icons[feasibility]}</span>
        <span className={`text-sm font-bold ${f.color}`}>Overall: {f.label}</span>
      </div>
      <p className="text-xs text-muted leading-relaxed">{summary}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WhatMustHappen({ company, financials, assumptions }: Props) {
  const profile = getSectorProfile(company.sector);

  const [targetInput, setTargetInput] = useState('');
  const [targetPrice, setTargetPrice] = useState<number | null>(null);

  // Compute on every target change
  const result = useMemo(() => {
    if (!targetPrice || targetPrice <= company.currentPrice) return null;
    return computeTargetPath(
      targetPrice,
      profile.model,
      company,
      financials,
      assumptions,
      profile.defaultExitMultiple,
    );
  }, [targetPrice, company, financials, assumptions, profile]);

  function handleApply() {
    const v = parseFloat(targetInput.replace(/,/g, ''));
    if (!isNaN(v) && v > company.currentPrice) setTargetPrice(v);
  }

  const isMarginApplicable = profile.model === 'pe';

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4l3 3" strokeLinecap="round"/>
            </svg>
            <h3 className="text-sm font-semibold text-primary">What Must Happen?</h3>
          </div>
          <p className="text-[11px] text-muted mt-1">
            Set a target price → see exactly what needs to be true to get there
          </p>
        </div>
        <span className="text-[10px] text-gold font-mono bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded flex-shrink-0">
          {profile.exitMultipleLabel} model
        </span>
      </div>

      {/* ── Target price input ── */}
      <div className="bg-border/20 rounded-xl p-4">
        <p className="text-xs text-muted mb-3">
          Current price:{' '}
          <span className="text-primary font-mono font-semibold">
            ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          {' '}· Horizon:{' '}
          <span className="text-primary font-mono font-semibold">{assumptions.years} years</span>
        </p>

        {/* Input row */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted font-mono">₹</span>
            <input
              type="number"
              placeholder="Enter target price…"
              value={targetInput}
              onChange={e => setTargetInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleApply()}
              className="w-full bg-card border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm font-mono text-primary focus:outline-none focus:border-gold transition-colors placeholder:text-muted/40"
            />
          </div>
          <button
            onClick={handleApply}
            className="px-4 py-2.5 bg-gold text-terminal text-sm font-bold rounded-lg hover:bg-gold/90 transition-colors flex-shrink-0"
          >
            Analyse
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex gap-2">
          {presets(company.currentPrice).map(p => (
            <button
              key={p.label}
              onClick={() => { setTargetInput(String(p.value)); setTargetPrice(p.value); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                targetPrice === p.value
                  ? 'bg-gold text-terminal border-gold'
                  : 'text-muted border-border hover:text-primary hover:border-gold/40'
              }`}
            >
              {p.label}
              <span className="block text-[10px] font-normal opacity-70">
                ₹{p.value.toLocaleString('en-IN')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Results ── */}
      {!result && (
        <div className="text-center py-8">
          <p className="text-sm text-muted">
            Enter a target price above to reverse-engineer what must happen.
          </p>
          <p className="text-xs text-muted/60 mt-1">Must be higher than current price</p>
        </div>
      )}

      {result && (
        <>
          {/* Target summary strip */}
          <div className="flex items-center justify-between bg-border/20 rounded-xl px-4 py-3">
            <div>
              <p className="text-[11px] text-muted">Target</p>
              <p className="text-lg font-bold font-mono text-primary">
                ₹{result.targetPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-muted">Total Return</p>
              <p className="text-lg font-bold font-mono text-gain">+{result.requiredReturn.toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted">Required CAGR</p>
              <p className="text-lg font-bold font-mono text-accent">{result.requiredCAGR.toFixed(1)}% p.a.</p>
            </div>
          </div>

          {/* Three requirements */}
          <div className="divide-y divide-border/30">
            <RequirementRow req={result.growth} />
            <RequirementRow req={result.margin} applicable={isMarginApplicable} />
            <RequirementRow req={result.multiple} />
          </div>

          {/* Overall verdict */}
          <VerdictBanner feasibility={result.overall} summary={result.summary} />
        </>
      )}
    </div>
  );
}
