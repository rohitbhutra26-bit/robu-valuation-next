'use client';

import { useMemo } from 'react';
import { Company, FinancialYear } from '@/lib/types';
import { generateInsight } from '@/lib/aiInsight';

interface AIOverviewProps {
  company: Company;
  financials?: FinancialYear[];
}

// Maps analyst-speak verdict → plain English
const VERDICT_PLAIN: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  'Strong Buy': { label: 'Great opportunity',    emoji: '🚀', color: 'text-gain', bg: 'bg-gain/10', border: 'border-gain/25' },
  'Buy':        { label: 'Looks attractive',     emoji: '👍', color: 'text-gain', bg: 'bg-gain/10', border: 'border-gain/25' },
  'Accumulate': { label: 'Worth watching',       emoji: '👀', color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/25' },
  'Hold':       { label: 'Hold what you have',   emoji: '⏸️', color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/25' },
  'Reduce':     { label: 'Consider trimming',    emoji: '⚠️', color: 'text-loss', bg: 'bg-loss/10', border: 'border-loss/25' },
  'Avoid':      { label: 'Risky right now',      emoji: '🛑', color: 'text-loss', bg: 'bg-loss/10', border: 'border-loss/25' },
};

export default function AIOverview({ company, financials = [] }: AIOverviewProps) {
  const insight = useMemo(() => generateInsight(company, financials), [company, financials]);
  const plain   = VERDICT_PLAIN[insight.verdict] ?? VERDICT_PLAIN['Hold'];

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">

      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 text-sm">
          🤖
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-primary leading-none">AI Analysis</h3>
          <p className="text-[10px] text-muted mt-0.5">Computed from live data · not financial advice</p>
        </div>
      </div>

      {/* ── Verdict pill ── */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${plain.bg} ${plain.border}`}>
        <span className="text-base leading-none">{plain.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${plain.color}`}>{plain.label}</p>
          <p className="text-[10px] text-muted/70 mt-0.5">Analyst rating: {insight.verdict}</p>
        </div>
        <span className="text-[10px] text-muted/50 font-mono flex-shrink-0">{insight.confidence} confidence</span>
      </div>

      {/* ── Summary ── */}
      <p className="text-[12px] text-muted leading-relaxed">
        {insight.summary}
      </p>

      {/* ── Bull & Bear ── */}
      <div className="space-y-2">
        <div className="bg-gain/5 border border-gain/20 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">🐂</span>
            <span className="text-[10px] font-bold text-gain">If things go well…</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">{insight.bull}</p>
        </div>

        <div className="bg-loss/5 border border-loss/20 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">🐻</span>
            <span className="text-[10px] font-bold text-loss">If things go badly…</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">{insight.bear}</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <p className="text-[10px] text-muted/40 text-center">
        Based on {financials.length} years of data · always do your own research
      </p>
    </div>
  );
}
