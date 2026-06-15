'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { ChevronsUp, ChevronUp, Minus, ChevronDown, ChevronsDown } from '@/lib/icons';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel } from '@/lib/forecastUtils';
import { generateInsight } from '@/lib/aiInsight';
import { valuationReliability } from '@/lib/valuationReliability';
import { verdictKey } from '@/lib/verdict';
import { scaleIn } from '@/lib/animations';

interface Props {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

export default function VerdictCard({ company, financials, assumptions }: Props) {
  // Local horizon — this card owns its own time view, independent of the global
  // assumptions. Changing it here re-values only this card, nothing else.
  const [horizon, setHorizon] = useState<number>(assumptions.years || 5);

  const fairValue = useMemo(() => {
    if (!financials.length || !company.currentPrice) return 0;
    try {
      const profile = getCompanyProfile(company);
      const result = runPrimaryModel(
        profile.model, financials, company,
        assumptions.revenueGrowthRate, assumptions.netMarginAssumption,
        assumptions.exitMultiple, horizon,
      );
      return Math.max(result.fairValue, 0);
    } catch {
      return 0;
    }
  }, [company, financials, assumptions.revenueGrowthRate, assumptions.netMarginAssumption, assumptions.exitMultiple, horizon]);

  if (!fairValue || !company.currentPrice) return null;

  const current = company.currentPrice;
  const upside = ((fairValue - current) / current) * 100;

  // ── Verdict tiers ─────────────────────────────────────────────────────────
  const VERDICT_UI = {
    'very-cheap':     { label: 'Looks very cheap',     sub: 'Trading well below what the business looks worth.', tone: 'gain',    Icon: ChevronsUp   },
    'cheap':          { label: 'Looks cheap',          sub: 'Trading below what the business looks worth.',      tone: 'gain',    Icon: ChevronUp    },
    'fair':           { label: 'Fairly priced',        sub: 'Trading close to what the business looks worth.',   tone: 'warning', Icon: Minus        },
    'expensive':      { label: 'Looks expensive',      sub: 'Trading above what the business looks worth.',      tone: 'loss',    Icon: ChevronDown  },
    'very-expensive': { label: 'Looks very expensive', sub: 'Trading well above what the business looks worth.',  tone: 'loss',    Icon: ChevronsDown },
  } as const;
  // If a fair value can't be trusted (loss-making, negative net worth, one-off
  // earnings) we must NOT show a confident cheap/expensive call.
  const reliability = valuationReliability(company, financials);
  const v = reliability.reliable
    ? VERDICT_UI[verdictKey(upside)]
    : { label: 'Hard to value', sub: reliability.title, tone: 'warning', Icon: Minus } as const;

  const toneText   = `text-${v.tone}`;
  const dot        = `rgb(var(--color-${v.tone}))`;
  const upsideLabel = !reliability.reliable ? '—' : upside >= 0 ? `+${upside.toFixed(0)}%` : `${upside.toFixed(0)}%`;

  // Gauge marker: high upside = cheap = far left; negative = expensive = far right
  const clamped = Math.max(-40, Math.min(40, upside));
  const pos = 50 - (clamped / 40) * 45; // 5%..95%

  let confidence: string | null = null;
  try { confidence = generateInsight(company, financials).confidence; } catch { /* noop */ }
  const confCls = confidence === 'High' ? 'text-gain border-gain/30 bg-gain/10'
    : confidence === 'Medium' ? 'text-warning border-warning/30 bg-warning/10'
    : 'text-loss border-loss/30 bg-loss/10';

  return (
    <motion.div
      variants={scaleIn} initial="hidden" animate="visible"
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8"
    >
      {/* soft tint wash in the verdict colour */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ background: `radial-gradient(120% 100% at 0% 0%, ${dot}, transparent 60%)` }} />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[2px] text-muted">Robu's verdict</p>

        <div className="mt-3 flex items-start gap-4">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl flex-shrink-0"
                style={{ background: `${dot}1A`, border: `1.5px solid ${dot}40` }}>
            <v.Icon size={28} className={toneText} />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight leading-none ${toneText}`}>{v.label}</h2>
            <p className="mt-2 text-base text-muted leading-snug">{v.sub}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-3xl sm:text-4xl font-bold font-mono leading-none ${toneText}`}>{upsideLabel}</p>
            <p className="text-xs text-muted mt-1">{!reliability.reliable ? 'see caution below' : `${upside >= 0 ? 'possible upside' : 'possible downside'} \u00b7 over ${horizon}y`}</p>
          </div>
        </div>

        {/* Cheap → Expensive gauge */}
        <div className="mt-7">
          <div className="relative h-2.5 rounded-full"
               style={{ background: 'linear-gradient(90deg, rgb(var(--color-gain)), rgb(var(--color-warning)), rgb(var(--color-loss)))' }}>
            {reliability.reliable && (
            <motion.div
              className="absolute top-1/2 w-5 h-5 rounded-full bg-card shadow-md"
              style={{ border: `3px solid ${dot}`, x: '-50%', y: '-50%' }}
              initial={{ left: '50%' }} animate={{ left: `${pos}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            />
            )}
          </div>
          <div className="flex justify-between mt-2 text-[11px] font-semibold text-muted">
            <span>Cheap</span><span>Fair</span><span>Expensive</span>
          </div>
        </div>

        {/* Horizon picker — this card's own time view */}
        <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
          <span className="text-xs text-muted">Value it over</span>
          <div className="flex gap-1 bg-border/40 rounded-full p-0.5">
            {[1, 3, 5, 10].map(y => (
              <button
                key={y}
                onClick={() => setHorizon(y)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  horizon === y ? 'bg-gold text-card shadow-sm' : 'text-muted hover:text-primary'
                }`}
              >
                {y}yr
              </button>
            ))}
          </div>
        </div>

        {/* Worth vs trading */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="text-xs text-muted">Looks worth about <span className="text-muted/60">· {horizon}-year view</span></p>
            <p className={`text-xl font-bold font-mono ${toneText}`}>{reliability.reliable ? `₹${fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Trading at</p>
            <p className="text-xl font-bold font-mono text-primary">₹{current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          {confidence && (
            <div className="ml-auto flex flex-col items-end gap-1.5"
                 title="How sure we are: based on how much financial history we have and how widely the 1,000 simulated outcomes spread.">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${confCls}`}>
                {confidence} confidence
              </span>
              <div className="w-24 h-1.5 rounded-full bg-border/50 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                     style={{
                       width: confidence === 'High' ? '90%' : confidence === 'Medium' ? '60%' : '32%',
                       background: confidence === 'High' ? 'rgb(var(--color-gain))'
                                 : confidence === 'Medium' ? 'rgb(var(--color-warning))'
                                 : 'rgb(var(--color-loss))',
                     }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
