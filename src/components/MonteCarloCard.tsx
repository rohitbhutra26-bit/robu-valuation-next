'use client';

import { useMemo } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { monteCarloFairValue } from '@/lib/advancedModels';
import { valuationReliability } from '@/lib/valuationReliability';
import Tooltip from '@/components/Tooltip';

interface Props {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/**
 * Monte Carlo — 1,000 alternate futures.
 * Instead of one fair value, draws growth/margin/multiple 1,000 times around
 * your assumptions (spread = this company's own historical volatility) and
 * shows the full range of outcomes plus P(worth more than today's price).
 */
export default function MonteCarloCard({ company, financials, assumptions }: Props) {
  const profile = getCompanyProfile(company);

  const mc = useMemo(
    () => monteCarloFairValue(
      profile.model, financials, company,
      assumptions.revenueGrowthRate,
      assumptions.netMarginAssumption,
      assumptions.exitMultiple,
      assumptions.years,
      1000,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile.model, financials, company,
     assumptions.revenueGrowthRate, assumptions.netMarginAssumption,
     assumptions.exitMultiple, assumptions.years],
  );

  if (!mc) return null;

  if (!valuationReliability(company, financials).reliable) {
    return (
      <div className="bg-card border border-border rounded-3xl p-5 sm:p-6">
        <p className="text-sm font-semibold text-warning mb-1">Not meaningful for this stock</p>
        <p className="text-xs text-muted leading-relaxed">This company is loss-making or has negative net worth, so projected fair values, scenarios and target prices do not apply here. See the caution under the verdict above.</p>
      </div>
    );
  }

  const price = company.currentPrice;
  const maxCount = Math.max(...mc.histogram.map(h => h.count), 1);
  const probCls = mc.probUndervalued >= 70 ? 'text-gain' : mc.probUndervalued >= 45 ? 'text-warning' : 'text-loss';

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-semibold text-primary">1,000 Possible Futures</h3>
            <Tooltip text={`Monte Carlo simulation: ${mc.draws} runs of the ${profile.exitMultipleLabel} model with growth, margin and exit multiple drawn randomly around your assumptions. Spread comes from this company's own revenue volatility (σ=${mc.sigmaUsed.toFixed(1)}%).`} position="bottom" />
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            One fair value is a guess — here&apos;s the whole range of likely outcomes
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-xl font-bold font-mono ${probCls}`}>{mc.probUndervalued.toFixed(0)}%</p>
          <p className="text-[10px] text-muted leading-tight">chance it&apos;s worth more<br />than today&apos;s price</p>
        </div>
      </div>

      {/* Histogram */}
      <div>
        <div className="flex items-end gap-0.5 h-16">
          {mc.histogram.map((b, i) => {
            const containsPrice = price >= b.from && price < b.to;
            const isUp = b.from >= price;
            return (
              <div
                key={i}
                className={`flex-1 rounded-t transition-all duration-500 ${
                  containsPrice ? 'bg-gold' : isUp ? 'bg-gain/50' : 'bg-loss/40'
                }`}
                style={{ height: `${Math.max((b.count / maxCount) * 100, 3)}%` }}
                title={`${fmt(b.from)}–${fmt(b.to)}: ${b.count} of ${mc.draws} runs`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted font-mono">
          <span>{fmt(mc.histogram[0].from)}</span>
          <span className="text-gold">▲ today {fmt(price)}</span>
          <span>{fmt(mc.histogram[mc.histogram.length - 1].to)}</span>
        </div>
      </div>

      {/* Percentile strip */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-loss/5 border border-loss/15 rounded-lg p-2">
          <p className="text-[10px] text-muted">Pessimistic (p10)</p>
          <p className="text-sm font-bold font-mono text-loss">{fmt(mc.p10)}</p>
        </div>
        <div className="bg-gold/5 border border-gold/20 rounded-lg p-2">
          <p className="text-[10px] text-muted">Middle (p50)</p>
          <p className="text-sm font-bold font-mono text-gold">{fmt(mc.p50)}</p>
        </div>
        <div className="bg-gain/5 border border-gain/15 rounded-lg p-2">
          <p className="text-[10px] text-muted">Optimistic (p90)</p>
          <p className="text-sm font-bold font-mono text-gain">{fmt(mc.p90)}</p>
        </div>
      </div>

      <p className="text-[11px] text-muted leading-relaxed">
        Read it like this: in half the simulated futures this stock is worth more than{' '}
        <span className="font-mono text-primary">{fmt(mc.p50)}</span>. The middle 50% of outcomes
        land between <span className="font-mono text-primary">{fmt(mc.p25)}</span> and{' '}
        <span className="font-mono text-primary">{fmt(mc.p75)}</span>.
      </p>
    </div>
  );
}
