'use client';

import { useMemo } from 'react';
import { Company, FinancialYear } from '@/lib/types';
import { generateInsight } from '@/lib/aiInsight';
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle,
  ShieldAlert, Eye, PauseCircle, ThumbsUp,
} from '@/lib/icons';

interface AIOverviewProps {
  company: Company;
  financials?: FinancialYear[];
}

const VERDICT_CONFIG: Record<string, {
  label: string;
  Icon: React.FC<{ size: number; className?: string }>;
  color: string; bg: string; border: string;
}> = {
  'Strong Buy': { label: 'Great opportunity',  Icon: TrendingUp,    color: 'text-gain', bg: 'bg-gain/10', border: 'border-gain/25' },
  'Buy':        { label: 'Looks attractive',   Icon: ThumbsUp,      color: 'text-gain', bg: 'bg-gain/10', border: 'border-gain/25' },
  'Accumulate': { label: 'Worth watching',     Icon: Eye,           color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/25' },
  'Hold':       { label: 'Hold what you have', Icon: PauseCircle,   color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/25' },
  'Reduce':     { label: 'Consider trimming',  Icon: AlertTriangle, color: 'text-loss', bg: 'bg-loss/10', border: 'border-loss/25' },
  'Avoid':      { label: 'Risky right now',    Icon: ShieldAlert,   color: 'text-loss', bg: 'bg-loss/10', border: 'border-loss/25' },
};

export default function AIOverview({ company, financials = [] }: AIOverviewProps) {
  const insight = useMemo(() => generateInsight(company, financials), [company, financials]);
  const cfg = VERDICT_CONFIG[insight.verdict] ?? VERDICT_CONFIG['Hold'];

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
          <Sparkles size={14} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-primary leading-none">AI Analysis</h3>
          <p className="text-[10px] text-muted mt-0.5">Computed from live data · not financial advice</p>
        </div>
      </div>

      {/* Verdict pill */}
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
          <cfg.Icon size={14} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
          <p className="text-[10px] text-muted/70 mt-0.5">Analyst rating: {insight.verdict}</p>
        </div>
        <span className="text-[10px] text-muted/50 font-mono flex-shrink-0">{insight.confidence}</span>
      </div>

      {/* Summary */}
      <p className="text-[12px] text-muted leading-relaxed">{insight.summary}</p>

      {/* Bull & Bear */}
      <div className="space-y-2">
        <div className="bg-gain/5 border border-gain/20 rounded-lg p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={12} className="text-gain flex-shrink-0" />
            <span className="text-[10px] font-bold text-gain">If things go well…</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">{insight.bull}</p>
        </div>
        <div className="bg-loss/5 border border-loss/20 rounded-lg p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={12} className="text-loss flex-shrink-0" />
            <span className="text-[10px] font-bold text-loss">If things go badly…</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">{insight.bear}</p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-muted/40 text-center">
        Based on {financials.length} years of data · always do your own research
      </p>
    </div>
  );
}
