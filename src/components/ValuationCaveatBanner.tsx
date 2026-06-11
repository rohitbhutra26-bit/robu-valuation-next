'use client';

import { useMemo } from 'react';
import { Company, FinancialYear } from '@/lib/types';
import { valuationReliability } from '@/lib/valuationReliability';

interface Props {
  company: Company;
  financials: FinancialYear[];
}

// Amber honesty banner — shown only when our own models shouldn't be trusted.
// No other retail tool admits this; it's Robu's credibility moat.
export default function ValuationCaveatBanner({ company, financials }: Props) {
  const result = useMemo(
    () => valuationReliability(company, financials),
    [company, financials],
  );

  if (result.reliable) return null;

  return (
    <div className="bg-gold/5 border border-gold/30 rounded-xl p-4 flex gap-3">
      <span className="text-gold text-base leading-none flex-shrink-0 mt-0.5">⚠</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gold leading-tight">{result.title}</p>
        <p className="text-xs text-muted mt-1 leading-relaxed">{result.note}</p>
      </div>
    </div>
  );
}
