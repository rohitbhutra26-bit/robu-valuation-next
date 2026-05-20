'use client';

import { useMemo } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getSectorProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel } from '@/lib/forecastUtils';

interface Props {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

export default function VerdictCard({ company, financials, assumptions }: Props) {
  const fairValue = useMemo(() => {
    if (!financials.length || !company.currentPrice) return 0;
    try {
      const profile = getSectorProfile(company.sector);
      const result = runPrimaryModel(
        profile.model,
        financials,
        company,
        assumptions.revenueGrowthRate,
        assumptions.netMarginAssumption,
        assumptions.exitMultiple,
        assumptions.years,
      );
      return Math.max(result.fairValue, 0);
    } catch {
      return 0;
    }
  }, [
    company,
    financials,
    assumptions.revenueGrowthRate,
    assumptions.netMarginAssumption,
    assumptions.exitMultiple,
    assumptions.years,
  ]);

  if (!fairValue || !company.currentPrice) return null;

  const current = company.currentPrice;
  const upside = ((fairValue - current) / current) * 100;

  // ── Verdict logic ────────────────────────────────────────────────────────
  const isStrongBuy   = upside > 30;
  const isUndervalued = upside > 10;
  const isFair        = upside >= -10 && upside <= 10;
  const isOvervalued  = upside < -10;
  const isExpensive   = upside < -30;

  const verdict =
    isStrongBuy   ? { label: 'Looks very undervalued',  sub: 'Strong potential upside based on your assumptions', color: 'text-gain', bg: 'bg-gain/5', border: 'border-gain/20', dot: '#34d399', icon: '↑↑' } :
    isUndervalued ? { label: 'Looks undervalued',       sub: 'Stock may be trading below fair value',             color: 'text-gain', bg: 'bg-gain/5', border: 'border-gain/20', dot: '#34d399', icon: '↑'  } :
    isFair        ? { label: 'Fairly priced',           sub: 'Trading close to estimated fair value',             color: 'text-gold', bg: 'bg-gold/5', border: 'border-gold/20', dot: '#f59e0b', icon: '→'  } :
    isExpensive   ? { label: 'Looks very expensive',    sub: 'Significant downside to estimated fair value',      color: 'text-loss', bg: 'bg-loss/5', border: 'border-loss/20', dot: '#f87171', icon: '↓↓' } :
                    { label: 'Looks overvalued',         sub: 'May be trading above fair value',                  color: 'text-loss', bg: 'bg-loss/5', border: 'border-loss/20', dot: '#f87171', icon: '↓'  };

  const upsideLabel = upside >= 0
    ? `+${upside.toFixed(1)}% upside`
    : `${upside.toFixed(1)}% downside`;

  return (
    <div className={`${verdict.bg} border ${verdict.border} rounded-xl p-4 flex items-center gap-4`}>

      {/* Icon circle */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold ${verdict.color}`}
        style={{ background: `${verdict.dot}18`, border: `1.5px solid ${verdict.dot}40` }}
      >
        {verdict.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${verdict.color} leading-tight`}>{verdict.label}</p>
        <p className="text-xs text-muted mt-0.5 leading-snug">{verdict.sub}</p>
      </div>

      {/* Numbers */}
      <div className="text-right flex-shrink-0">
        <p className={`text-xl font-bold font-mono ${verdict.color}`}>{upsideLabel}</p>
        <div className="flex items-center justify-end gap-1.5 mt-0.5">
          <span className="text-xs text-muted">Target</span>
          <span className="text-xs font-mono text-primary">
            ₹{fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-xs text-muted">· Now</span>
          <span className="text-xs font-mono text-primary">
            ₹{current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  );
}
