'use client';

import { useMemo } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { reverseDcfVerdict } from '@/lib/advancedModels';
import Tooltip from '@/components/Tooltip';

interface Props {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

const VERDICT_STYLE = {
  undemanding: { label: 'Undemanding',  cls: 'text-gain bg-gain/10 border-gain/25' },
  reasonable:  { label: 'Reasonable',   cls: 'text-gain bg-gain/10 border-gain/25' },
  demanding:   { label: 'Demanding',    cls: 'text-warning bg-warning/10 border-warning/25' },
  heroic:      { label: 'Heroic',       cls: 'text-loss bg-loss/10 border-loss/25' },
} as const;

/**
 * Reverse DCF — the most honest valuation signal.
 * Instead of guessing fair value, asks: what growth does TODAY'S PRICE
 * already assume, and has the company ever delivered that?
 */
export default function ReverseDCF({ company, financials, assumptions }: Props) {
  const result = useMemo(
    () => reverseDcfVerdict(
      financials, company,
      assumptions.netMarginAssumption,
      // Use the sector-NORMALIZED exit multiple, not the stock's own current PE.
      // Feeding current PE made the reverse-DCF circular → implied growth ≈ 0%.
      assumptions.exitMultiple,
      assumptions.years,
    ),
    [financials, company, assumptions.netMarginAssumption, assumptions.exitMultiple, assumptions.years],
  );

  if (!result) return null;

  const v = VERDICT_STYLE[result.verdict];
  const maxBar = Math.max(result.impliedGrowth, result.deliveredGrowth, 1);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-primary flex items-center gap-1">
            What Is the Market Expecting?
            <Tooltip text="Reverse DCF, explained simply: instead of guessing what the stock is worth, we ask — for today's price to be fair, how fast must the company grow? Then we check if it has EVER grown that fast. If the price assumes 25% forever and the company has done 10%, someone is dreaming." />
          </h3>
          <p className="text-[11px] text-muted mt-0.5">
            Growth already baked into the price vs what the company has actually delivered
          </p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold flex-shrink-0 ${v.cls}`}>
          {v.label}
        </span>
      </div>

      {/* Two bars: implied vs delivered */}
      <div className="space-y-2.5">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted">Market expects (in the price)</span>
            <span className="font-mono font-bold text-accent">{result.impliedGrowth.toFixed(1)}%/yr</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all duration-700"
              style={{ width: `${(result.impliedGrowth / maxBar) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted">Company delivered ({result.historyYears}Y history)</span>
            <span className="font-mono font-bold text-primary">{result.deliveredGrowth.toFixed(1)}%/yr</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${result.gap > 3 ? 'bg-loss/70' : 'bg-gain'}`}
              style={{ width: `${(Math.max(result.deliveredGrowth, 0) / maxBar) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Verdict text */}
      <div className={`rounded-lg p-3 border ${v.cls.replace(/text-\S+ /, '')}`}>
        <p className="text-xs text-primary leading-relaxed">{result.verdictText}</p>
      </div>
    </div>
  );
}
