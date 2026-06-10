'use client';

import { useMemo, useState } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel } from '@/lib/forecastUtils';
import { buildScenarioConfigs, fmtINR } from '@/lib/scenarioEngine';

interface Props {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

const HORIZONS = [3, 5, 7, 10] as const;
const AMOUNT_PRESETS = [
  { label: '₹1L',  value: 100000 },
  { label: '₹5L',  value: 500000 },
  { label: '₹10L', value: 1000000 },
  { label: '₹25L', value: 2500000 },
];

interface ScenarioRow {
  name: 'Bear' | 'Base' | 'Bull';
  emoji: string;
  color: string;
  /** wealth at each horizon, keyed by years */
  wealth: Record<number, { amount: number; cagr: number }>;
}

export default function WealthProjection({ company, financials, assumptions }: Props) {
  const [amount, setAmount] = useState(100000);
  const [amountInput, setAmountInput] = useState('');

  const rows = useMemo<ScenarioRow[] | null>(() => {
    if (!financials.length || !company.currentPrice) return null;

    const profile = getCompanyProfile(company);
    // Shared scenario definitions — same source of truth as ScenarioCards & print report
    const configs = buildScenarioConfigs(company, financials, assumptions);

    try {
      return configs.map(cfg => {
        const wealth: ScenarioRow['wealth'] = {};
        for (const h of HORIZONS) {
          const result = runPrimaryModel(
            profile.model,
            financials,
            company,
            cfg.growthRate,
            cfg.marginAssumption,
            cfg.exitMultiple,
            h,
          );
          const fv = Math.max(result.fairValue, 0);
          const multiple = fv > 0 ? fv / company.currentPrice : 0;
          const cagr = multiple > 0 ? (Math.pow(multiple, 1 / h) - 1) * 100 : 0;
          wealth[h] = { amount: amount * multiple, cagr };
        }
        return { name: cfg.name, emoji: cfg.emoji, color: cfg.color, wealth };
      });
    } catch {
      return null;
    }
  }, [company, financials, assumptions, amount]);

  if (!rows) return null;

  const base10 = rows[1].wealth[10];
  const base10Multiple = base10.amount / amount;

  function applyCustom() {
    const v = parseFloat(amountInput.replace(/,/g, ''));
    if (!isNaN(v) && v >= 1000) setAmount(v);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gain/10 border border-gain/20 flex items-center justify-center text-[13px]">
            💰
          </div>
          <h3 className="text-sm font-semibold text-primary">If You Invested {fmtINR(amount)} Today</h3>
        </div>
        <p className="text-[11px] text-muted mt-1">
          What your money could grow to — based on your assumptions, with growth fade built in. Dividends not included.
        </p>
      </div>

      {/* ── Amount selector ── */}
      <div className="flex gap-2 items-center flex-wrap">
        {AMOUNT_PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => { setAmount(p.value); setAmountInput(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
              amount === p.value
                ? 'bg-gain text-terminal border-gain'
                : 'text-muted border-border hover:text-primary hover:border-gain/40'
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex gap-1 items-center flex-1 min-w-[140px]">
          <input
            type="number"
            placeholder="Custom ₹…"
            value={amountInput}
            onChange={e => setAmountInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyCustom()}
            onBlur={applyCustom}
            className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-primary focus:outline-none focus:border-gain transition-colors placeholder:text-muted/40"
          />
        </div>
      </div>

      {/* ── Projection table ── */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left text-[10px] text-muted font-medium uppercase tracking-wider py-2">Scenario</th>
              {HORIZONS.map(h => (
                <th key={h} className="text-[10px] text-muted font-medium uppercase tracking-wider py-2 pl-3">
                  {h} yrs
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.name} className="border-b border-border/30 last:border-0">
                <td className="text-left py-2.5">
                  <span className="text-xs font-semibold" style={{ color: row.color }}>
                    {row.emoji} {row.name}
                  </span>
                </td>
                {HORIZONS.map(h => {
                  const w = row.wealth[h];
                  const gained = w.amount >= amount;
                  return (
                    <td key={h} className="py-2.5 pl-3">
                      <span className={`block text-sm font-bold font-mono ${
                        row.name === 'Base' ? 'text-primary' : gained ? 'text-primary/80' : 'text-loss'
                      }`}>
                        {fmtINR(w.amount)}
                      </span>
                      <span className="block text-[10px] font-mono text-muted">
                        {w.cagr >= 0 ? '+' : ''}{w.cagr.toFixed(1)}%/yr
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Human takeaway ── */}
      <div className="bg-border/20 rounded-xl px-4 py-3">
        <p className="text-xs text-muted leading-relaxed">
          {base10Multiple >= 1.05 ? (
            <>
              In the base case, <span className="text-primary font-semibold">{fmtINR(amount)}</span> today could become{' '}
              <span className="text-gain font-bold font-mono">{fmtINR(base10.amount)}</span> in 10 years —{' '}
              that&apos;s your money multiplying <span className="text-primary font-semibold">{base10Multiple.toFixed(1)}×</span>.
              Longer holding periods smooth out the bumps.
            </>
          ) : (
            <>
              In the base case, your assumptions suggest{' '}
              <span className="text-primary font-semibold">{fmtINR(amount)}</span> would barely grow (or shrink) over 10 years.
              The stock may be priced above what the business can deliver.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
