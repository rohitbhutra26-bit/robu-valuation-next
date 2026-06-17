'use client';
import { useMemo } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel } from '@/lib/forecastUtils';
import { valuationReliability } from '@/lib/valuationReliability';

// Sticky 'at a glance' rail — desktop ultra-wide only. Recaps price, verdict and key
// ratios so they stay visible while you scroll the long report.
export default function SummaryRail({ company, financials, assumptions }: {
  company: Company; financials: FinancialYear[]; assumptions: ValuationAssumptions;
}) {
  const v = useMemo(() => {
    if (!financials.length || !company.currentPrice) return null;
    if (!valuationReliability(company, financials).reliable) return null;
    try {
      const p = getCompanyProfile(company);
      const r = runPrimaryModel(p.model, financials, company,
        assumptions.revenueGrowthRate, assumptions.netMarginAssumption, assumptions.exitMultiple, assumptions.years);
      if (r.fairValue <= 0) return null;
      return { up: (r.fairValue - company.currentPrice) / company.currentPrice * 100, fair: r.fairValue };
    } catch { return null; }
  }, [company, financials, assumptions]);

  const isPos = company.changePercent >= 0;
  const word = !v ? 'Limited data' : v.up > 20 ? 'Looks cheap' : v.up < -15 ? 'Looks pricey' : 'Fairly priced';
  const tone = !v ? 'text-muted' : v.up > 20 ? 'text-gain' : v.up < -15 ? 'text-loss' : 'text-warning';
  const box  = !v ? 'bg-border/30 border-border' : v.up > 20 ? 'bg-gain/10 border-gain/20' : v.up < -15 ? 'bg-loss/10 border-loss/20' : 'bg-warning/10 border-warning/20';
  const ratios = [
    { l: 'P/E', x: company.pe > 0 ? `${company.pe.toFixed(1)}x` : '—' },
    { l: 'P/B', x: company.pb > 0 ? `${company.pb.toFixed(1)}x` : '—' },
    { l: 'ROE', x: company.roe > 0 ? `${company.roe.toFixed(1)}%` : '—' },
    { l: 'D/E', x: company.debtToEquity > 0 ? `${company.debtToEquity.toFixed(2)}x` : '—' },
  ];

  return (
    <div className="bg-card border border-border rounded-3xl p-5">
      <p className="text-[10.5px] text-muted uppercase tracking-[1.4px] mb-1.5">At a glance</p>
      <p className="text-sm font-bold text-primary truncate">{company.name}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold font-mono text-primary">₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        <span className={`text-xs font-semibold font-mono ${isPos ? 'text-gain' : 'text-loss'}`}>{isPos ? '+' : ''}{company.changePercent.toFixed(2)}%</span>
      </div>
      <div className={`mt-4 rounded-2xl border px-4 py-3 ${box}`}>
        <p className={`text-base font-bold ${tone}`}>{word}</p>
        {v && <p className="text-[12px] text-muted mt-0.5 leading-snug">Fair value ~₹{v.fair.toLocaleString('en-IN', { maximumFractionDigits: 0 })} · {v.up >= 0 ? '+' : ''}{v.up.toFixed(0)}% over {assumptions.years}y</p>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {ratios.map(r => (
          <div key={r.l} className="bg-terminal/40 border border-border rounded-xl px-3 py-2">
            <p className="text-[10.5px] text-muted">{r.l}</p>
            <p className="text-sm font-bold font-mono text-primary">{r.x}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
