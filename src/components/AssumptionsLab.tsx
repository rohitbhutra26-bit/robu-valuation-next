'use client';

import React, { useMemo } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel, TERMINAL_GROWTH, getBaselineFinancial } from '@/lib/forecastUtils';
import { SlidersHorizontal, RotateCcw, Zap, X as XIcon } from '@/lib/icons';

interface Props {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
  setAssumptions: React.Dispatch<React.SetStateAction<ValuationAssumptions>>;
  autoFillLabel: string | null;
  setAutoFillLabel: (v: string | null) => void;
  hasChanges: boolean;
  onReset: () => void;
}

const TIPS: Record<string, string> = {
  'Revenue Growth': 'How fast you expect sales to grow each year. The model fades this toward 6% (long-run India growth) by the final year — no company grows fast forever.',
  'Book Value Growth': 'How fast you expect book value (net worth) to grow each year.',
  'Net Margin': 'Of every ₹100 of sales, how much ends up as profit.',
  'Exit Multiple': 'The valuation multiple you assume when you sell in the future (e.g. P/E or P/B).',
};

// ── One control, in its own card ──────────────────────────────────────────────
function SliderCard({
  label, value, min, max, inputMax, step, suffix, hint, onChange,
}: {
  label: string; value: number; min: number; max: number; inputMax?: number;
  step: number; suffix: string; hint?: string; onChange: (v: number) => void;
}) {
  const effMax = inputMax ?? max;
  const pct = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  const beyond = value > max;
  const tip = TIPS[label];

  return (
    <div className="bg-terminal/40 border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
          {label}
          {tip && (
            <span title={tip}
              className="w-4 h-4 rounded-full bg-border text-muted/80 text-[9px] font-bold flex items-center justify-center cursor-help hover:bg-gold/20 hover:text-gold transition-colors">
              ?
            </span>
          )}
        </span>
        <div className="flex items-baseline gap-0.5 flex-shrink-0">
          <input
            type="number" min={min} max={effMax} step={step} value={value}
            onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(Math.min(Math.max(n, min), effMax)); }}
            className="w-16 text-right text-lg font-bold font-mono bg-transparent text-primary border-b border-transparent hover:border-border focus:border-gold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            aria-label={label}
          />
          <span className="text-lg font-bold font-mono text-primary">{suffix}</span>
        </div>
      </div>

      <input
        type="range" min={min} max={max} step={step} value={Math.min(value, max)}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ '--fill': beyond ? '100%' : `${pct}%` } as React.CSSProperties}
        aria-label={`${label} slider`}
      />

      <p className="text-[10px] text-muted/80 font-mono leading-snug min-h-[1.2em]">
        {beyond ? <span className="text-gold">▲ beyond {max}{suffix} — custom value</span> : hint}
      </p>
    </div>
  );
}

export default function AssumptionsLab({
  company, financials, assumptions, setAssumptions, autoFillLabel, setAutoFillLabel, hasChanges, onReset,
}: Props) {
  const profile = getCompanyProfile(company);
  const isPB = profile.model === 'pb';

  // Live target price from the CURRENT assumptions — updates as you drag.
  const fairValue = useMemo(() => {
    try {
      const r = runPrimaryModel(
        profile.model, financials, company,
        assumptions.revenueGrowthRate, assumptions.netMarginAssumption,
        assumptions.exitMultiple, assumptions.years,
      );
      return Math.max(r.fairValue, 0);
    } catch { return 0; }
  }, [profile.model, financials, company, assumptions.revenueGrowthRate, assumptions.netMarginAssumption, assumptions.exitMultiple, assumptions.years]);

  const price = company.currentPrice || 0;
  const upside = fairValue > 0 && price > 0 ? ((fairValue / price) - 1) * 100 : 0;
  const up = upside >= 0;
  const base = useMemo(() => { try { return getBaselineFinancial(financials); } catch { return null; } }, [financials]);
  const marginHint = base?.baseline && base.baseline.netMargin > 0
    ? `${base.yearLabel} actual: ${base.baseline.netMargin.toFixed(1)}%` : undefined;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">

      {/* ── Live result — the payoff of moving the sliders ── */}
      <div className="px-5 sm:px-6 py-5 bg-gold/[0.06] border-b border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gold/12 border border-gold/25 text-gold flex-shrink-0">
              <SlidersHorizontal size={17} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-muted">Your target price</p>
              <div className="flex items-baseline gap-2.5 mt-0.5">
                {fairValue > 0 ? (
                  <>
                    <span className="text-3xl font-bold font-mono text-primary leading-none">₹{fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    <span className={`text-sm font-semibold font-mono ${up ? 'text-gain' : 'text-loss'}`}>
                      {up ? '+' : ''}{upside.toFixed(0)}% vs ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted">Adjust the sliders to see a target</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {hasChanges && (
              <button onClick={onReset} title="Reset to Robu's suggested values"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-loss border border-loss/30 bg-loss/5 hover:bg-loss/10 transition-all active:scale-95">
                <RotateCcw size={11} /> Reset
              </button>
            )}
            <span className="text-[11px] text-gold font-medium bg-gold/10 border border-gold/20 px-2.5 py-1.5 rounded-lg max-w-[180px] truncate"
              title={`${profile.sectorLabel} — ${profile.exitMultipleLabel}`}>
              {profile.sectorLabel}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-muted/80 mt-2.5 leading-snug">
          This is what the stock would be worth in {assumptions.years} years if your numbers below hold. Move any slider to test your own view.
        </p>
      </div>

      {/* ── Where the defaults came from ── */}
      {autoFillLabel && (
        <div className="flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-border/20 border-b border-border">
          <Zap size={11} className="text-gold flex-shrink-0" />
          <p className="text-[11px] text-muted leading-snug flex-1">{autoFillLabel}</p>
          <button onClick={() => setAutoFillLabel(null)} aria-label="Dismiss"
            className="text-muted/50 hover:text-muted flex-shrink-0"><XIcon size={12} /></button>
        </div>
      )}

      {/* ── The controls ── */}
      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isPB ? (
          <SliderCard
            label="Book Value Growth" value={assumptions.revenueGrowthRate}
            min={1} max={40} inputMax={100} step={0.5} suffix="%"
            hint={`ROE ${company.roe.toFixed(1)}% — proxy for book-value growth`}
            onChange={v => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
          />
        ) : (
          <SliderCard
            label="Revenue Growth" value={assumptions.revenueGrowthRate}
            min={1} max={50} inputMax={200} step={0.5} suffix="%"
            hint={`Fades to ${TERMINAL_GROWTH}% (long-run India growth) by year ${assumptions.years}`}
            onChange={v => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
          />
        )}

        {!isPB && (
          <SliderCard
            label="Net Margin" value={assumptions.netMarginAssumption}
            min={1} max={50} inputMax={100} step={0.5} suffix="%"
            hint={marginHint}
            onChange={v => setAssumptions(a => ({ ...a, netMarginAssumption: v }))}
          />
        )}

        <SliderCard
          label="Exit Multiple" value={assumptions.exitMultiple}
          min={profile.exitMultipleMin} max={profile.exitMultipleMax}
          inputMax={profile.model === 'pe' ? 3000 : profile.model === 'pb' ? 50 : profile.exitMultipleMax * 10}
          step={profile.exitMultipleStep} suffix="x"
          hint={
            profile.model === 'pe' ? `Current P/E: ${company.pe.toFixed(1)}x`
            : profile.model === 'pb' ? `Current P/B: ${company.pb.toFixed(1)}x`
            : `Sector norm: ${profile.defaultExitMultiple}x`
          }
          onChange={v => setAssumptions(a => ({ ...a, exitMultiple: v, exitPE: v }))}
        />
      </div>
    </div>
  );
}
