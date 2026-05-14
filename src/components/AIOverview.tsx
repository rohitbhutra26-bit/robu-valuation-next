'use client';

import { Company } from '@/lib/types';
import { AI_OVERVIEWS } from '@/lib/mockData';

interface AIOverviewProps {
  company: Company;
}

export default function AIOverview({ company }: AIOverviewProps) {
  const overview = AI_OVERVIEWS[company.symbol] || {
    summary: 'AI analysis not available for this company.',
    bull: 'Bull case analysis pending.',
    bear: 'Bear case analysis pending.',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-primary">AI Research Overview</h3>
          <p className="text-xs text-muted">Powered by ROBU Intelligence</p>
        </div>
        <div className="ml-auto px-2 py-0.5 bg-gold/10 border border-gold/30 rounded text-xs text-gold font-mono">
          LIVE
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted leading-relaxed">{overview.summary}</p>
      </div>

      <div className="space-y-3 flex-1">
        <div className="bg-gain/5 border border-gain/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gain" />
            <span className="text-xs font-semibold text-gain uppercase tracking-wide">Bull Case</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">{overview.bull}</p>
        </div>

        <div className="bg-loss/5 border border-loss/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-loss" />
            <span className="text-xs font-semibold text-loss uppercase tracking-wide">Bear Case</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">{overview.bear}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted text-center">
          For informational purposes only. Not financial advice.
        </p>
      </div>
    </div>
  );
}
