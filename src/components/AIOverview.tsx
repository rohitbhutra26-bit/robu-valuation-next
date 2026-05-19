'use client';

import { Company, FinancialYear } from '@/lib/types';
import { generateInsight } from '@/lib/aiInsight';

interface AIOverviewProps {
  company: Company;
  financials?: FinancialYear[];
}

export default function AIOverview({ company, financials = [] }: AIOverviewProps) {
  const insight = generateInsight(company, financials);

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">

      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-400 flex items-center justify-center flex-shrink-0">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4l3 3"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-primary leading-none">Research Insight</h3>
          <p className="text-[10px] text-muted mt-0.5">Computed from live metrics</p>
        </div>
        {/* Verdict badge */}
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border font-mono flex-shrink-0 ${
          insight.verdict === 'Strong Buy' ? 'text-gain bg-gain/10 border-gain/25' :
          insight.verdict === 'Buy'        ? 'text-gain bg-gain/10 border-gain/25' :
          insight.verdict === 'Accumulate' ? 'text-gold bg-gold/10 border-gold/25' :
          insight.verdict === 'Hold'       ? 'text-gold bg-gold/10 border-gold/25' :
          insight.verdict === 'Reduce'     ? 'text-loss bg-loss/10 border-loss/25' :
                                             'text-loss bg-loss/10 border-loss/25'
        }`}>
          {insight.verdict}
        </span>
      </div>

      {/* ── Summary ── */}
      <p className="text-[12px] text-muted leading-relaxed">
        {insight.summary}
      </p>

      {/* ── Bull & Bear ── */}
      <div className="space-y-2">
        <div className="bg-gain/5 border border-gain/20 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gain flex-shrink-0" />
            <span className="text-[10px] font-bold text-gain uppercase tracking-wide">Bull Case</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">{insight.bull}</p>
        </div>

        <div className="bg-loss/5 border border-loss/20 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-loss flex-shrink-0" />
            <span className="text-[10px] font-bold text-loss uppercase tracking-wide">Bear Case</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">{insight.bear}</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-[10px] text-muted/50">
          {insight.confidence} confidence · based on {financials.length}yr data
        </span>
        <span className="text-[10px] text-muted/40">Not financial advice</span>
      </div>
    </div>
  );
}
