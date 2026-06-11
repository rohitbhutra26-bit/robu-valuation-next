'use client';

// Sticky mini-header: symbol + price + verdict pill, visible only after the
// user scrolls past the company header. The page is long — people forget the
// answer by the time they reach Monte Carlo. This keeps it on screen.

import { useEffect, useMemo, useState } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel } from '@/lib/forecastUtils';

interface Props {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

export default function StickyTicker({ company, financials, assumptions }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById('ticker-sentinel');
    if (!sentinel) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting));
    io.observe(sentinel);
    return () => io.disconnect();
  }, [company.symbol]);

  const verdict = useMemo(() => {
    if (!financials.length || !company.currentPrice) return null;
    try {
      const profile = getCompanyProfile(company);
      const r = runPrimaryModel(
        profile.model, financials, company,
        assumptions.revenueGrowthRate, assumptions.netMarginAssumption,
        assumptions.exitMultiple, assumptions.years,
      );
      const fv = Math.max(r.fairValue, 0);
      if (!fv) return null;
      const up = ((fv - company.currentPrice) / company.currentPrice) * 100;
      return {
        up,
        label: up > 10 ? 'Undervalued' : up >= -10 ? 'Fair' : 'Overvalued',
        cls: up > 10 ? 'text-gain bg-gain/10 border-gain/30' : up >= -10 ? 'text-gold bg-gold/10 border-gold/30' : 'text-loss bg-loss/10 border-loss/30',
      };
    } catch { return null; }
  }, [company, financials, assumptions]);

  const isPos = company.changePercent >= 0;

  return (
    <div
      className={`sticky top-0 z-30 -mx-4 -mt-4 px-4 transition-all duration-200 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <div className="bg-terminal/95 backdrop-blur-md border-b border-border py-2 flex items-center gap-3 px-1">
        <span className="text-xs font-mono font-bold text-gold">{company.symbol}</span>
        <span className="text-sm font-bold font-mono text-primary">
          ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
        <span className={`text-xs font-semibold font-mono ${isPos ? 'text-gain' : 'text-loss'}`}>
          {isPos ? '+' : ''}{company.changePercent.toFixed(2)}%
        </span>
        {verdict && (
          <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full border ${verdict.cls}`}>
            {verdict.label} · {verdict.up >= 0 ? '+' : ''}{verdict.up.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
