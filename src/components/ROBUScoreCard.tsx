'use client';

import { useState } from 'react';
import { Company, FinancialYear } from '@/lib/types';
import { computeROBUScore, ROBUScoreResult, DimensionScore } from '@/lib/robuScore';

function DimensionRow({ d, expanded }: { d: DimensionScore; expanded: boolean }) {
  const pct = d.score;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold text-primary">{d.name}</span>
          <p className="text-[10px] text-muted mt-0.5 leading-relaxed">{d.insight}</p>
          {expanded && (
            <p className="text-[10px] text-muted/70 mt-1 leading-relaxed italic">{d.detail}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-sm font-bold font-mono ${d.color}`}>{d.score}</p>
          <p className={`text-[9px] font-semibold ${d.color}`}>{d.label}</p>
        </div>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            d.score >= 80 ? 'bg-gain' : d.score >= 65 ? 'bg-accent'
            : d.score >= 50 ? 'bg-gold' : d.score >= 35 ? 'bg-warning' : 'bg-loss'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ROBUScoreCard({
  company, financials,
}: { company: Company; financials: FinancialYear[] }) {
  const [expanded, setExpanded] = useState(false);

  if (financials.length < 3) return null;

  const result: ROBUScoreResult = computeROBUScore(financials, company);

  const gradeColor = result.total >= 75 ? 'text-gain'
    : result.total >= 55 ? 'text-gold'
    : result.total >= 35 ? 'text-warning' : 'text-loss';

  const ringColor = result.total >= 75 ? 'border-gain/40'
    : result.total >= 55 ? 'border-gold/40'
    : result.total >= 35 ? 'border-warning/40' : 'border-loss/40';

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-primary">ROBU Score</h3>
            <span className="text-[9px] font-bold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded tracking-wide">
              PROPRIETARY
            </span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed max-w-xs">
            5-dimension algorithm measuring capital efficiency, earnings quality, execution, moat strength, and price reality
          </p>
        </div>

        {/* Big score circle */}
        <div className={`flex-shrink-0 w-16 h-16 rounded-full border-2 ${ringColor} bg-card flex flex-col items-center justify-center`}>
          <p className={`text-xl font-bold font-mono leading-none ${gradeColor}`}>{result.total}</p>
          <p className={`text-[10px] font-bold ${gradeColor}`}>{result.grade}</p>
        </div>
      </div>

      {/* Verdict */}
      <div className={`rounded-lg p-3 border ${
        result.total >= 75 ? 'bg-gain/5 border-gain/20'
        : result.total >= 55 ? 'bg-gold/5 border-gold/20'
        : result.total >= 35 ? 'bg-warning/5 border-warning/20'
        : 'bg-loss/5 border-loss/20'
      }`}>
        <p className={`text-xs font-semibold ${gradeColor}`}>{result.verdict}</p>
        {result.buyZone && (
          <p className="text-[11px] text-muted mt-1">
            Quality-adjusted buy zone: <span className="text-accent font-mono font-bold">₹{result.buyZone.toLocaleString('en-IN')}</span>
          </p>
        )}
      </div>

      {/* Novel insight */}
      <div className="bg-border/20 rounded-lg p-3 border-l-2 border-accent">
        <p className="text-[10px] text-muted font-semibold mb-0.5 uppercase tracking-wide">What others miss</p>
        <p className="text-xs text-primary leading-relaxed">{result.novelInsight}</p>
      </div>

      {/* 5 Dimensions */}
      <div className="space-y-4 pt-1">
        {result.dimensions.map(d => (
          <DimensionRow key={d.name} d={d} expanded={expanded} />
        ))}
      </div>

      {/* Strength + Risk flags */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="bg-gain/5 border border-gain/20 rounded-lg p-2.5">
          <p className="text-[9px] text-gain font-bold mb-1 uppercase tracking-wide">Top Strength</p>
          <p className="text-[10px] text-primary leading-snug">{result.strengthFlag}</p>
        </div>
        <div className="bg-loss/5 border border-loss/20 rounded-lg p-2.5">
          <p className="text-[9px] text-loss font-bold mb-1 uppercase tracking-wide">Top Risk</p>
          <p className="text-[10px] text-primary leading-snug">{result.riskFlag}</p>
        </div>
      </div>

      {/* Toggle detail */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-center text-[10px] text-muted hover:text-primary transition-colors pt-1 border-t border-border"
      >
        {expanded ? 'Hide technical detail ▲' : 'Show technical detail ▼'}
      </button>

      <p className="text-[9px] text-muted/60 text-center leading-relaxed">
        ROBU Score = 25% ROIIC + 25% Earnings Quality + 20% Execution + 20% Moat + 10% Price Reality
      </p>
    </div>
  );
}
