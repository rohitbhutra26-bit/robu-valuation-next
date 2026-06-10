'use client';

import { useMemo } from 'react';
import { Company, FinancialYear } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { redFlags, FlagStatus } from '@/lib/advancedModels';

interface Props {
  company: Company;
  financials: FinancialYear[];
}

const STATUS_STYLE: Record<FlagStatus, { icon: string; cls: string; chip: string }> = {
  pass: { icon: '✓', cls: 'text-gain',    chip: 'text-gain bg-gain/10 border-gain/25' },
  warn: { icon: '!', cls: 'text-warning', chip: 'text-warning bg-warning/10 border-warning/25' },
  fail: { icon: '✗', cls: 'text-loss',    chip: 'text-loss bg-loss/10 border-loss/25' },
  na:   { icon: '–', cls: 'text-muted',   chip: 'text-muted bg-border/30 border-border' },
};

/**
 * Red Flags — balance-sheet reality check.
 * A stock can look 40% cheap and still be a trap. These four gates catch
 * the classic traps: pledged shares, paper profits, runaway debt, weak coverage.
 */
export default function RedFlagsCard({ company, financials }: Props) {
  const profile = getCompanyProfile(company);

  const result = useMemo(
    () => redFlags(financials, company, profile.model),
    [financials, company, profile.model],
  );

  if (!financials.length) return null;

  const headerCls =
    result.failCount > 0 ? 'text-loss bg-loss/10 border-loss/25'
    : result.warnCount > 0 ? 'text-warning bg-warning/10 border-warning/25'
    : 'text-gain bg-gain/10 border-gain/25';

  const headerLabel =
    result.failCount > 0 ? `${result.failCount} Red Flag${result.failCount > 1 ? 's' : ''}`
    : result.warnCount > 0 ? `${result.warnCount} Watch Item${result.warnCount > 1 ? 's' : ''}`
    : 'All Clear';

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-primary">Red Flag Check</h3>
          <p className="text-[11px] text-muted mt-0.5">
            Cheap can still be a trap — four balance-sheet reality gates
          </p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold flex-shrink-0 ${headerCls}`}>
          {headerLabel}
        </span>
      </div>

      {/* Flags */}
      <div className="divide-y divide-border/40">
        {result.flags.map(f => {
          const s = STATUS_STYLE[f.status];
          return (
            <div key={f.name} className={`py-2.5 ${f.status === 'na' ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-sm font-bold w-4 text-center flex-shrink-0 ${s.cls}`}>{s.icon}</span>
                  <span className="text-xs font-semibold text-primary">{f.name}</span>
                </div>
                <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${s.chip}`}>
                  {f.value}
                </span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed pl-6">{f.note}</p>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      <p className="text-[11px] text-muted leading-relaxed border-t border-border pt-2.5">
        {result.verdict}
      </p>
    </div>
  );
}
