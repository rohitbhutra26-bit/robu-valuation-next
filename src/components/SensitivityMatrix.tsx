'use client';

import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel } from '@/lib/forecastUtils';
import { verdictKey } from '@/lib/verdict';
import { valuationReliability } from '@/lib/valuationReliability';

interface SensitivityMatrixProps {
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
  currentPrice: number;
  company: Company;
}

function getCellColor(fairValue: number, currentPrice: number, years: number): string {
  const k = verdictKey((fairValue / currentPrice - 1) * 100, years);
  if (k === 'very-cheap')     return 'bg-gain/20 text-gain border-gain/20';
  if (k === 'cheap')          return 'bg-gain/10 text-gain/80 border-gain/10';
  if (k === 'fair')           return 'bg-gold/10 text-gold border-gold/10';
  if (k === 'expensive')      return 'bg-loss/10 text-loss/80 border-loss/10';
  return 'bg-loss/20 text-loss border-loss/20';
}

export default function SensitivityMatrix({
  financials, assumptions, currentPrice, company,
}: SensitivityMatrixProps) {
  if (!financials.length) return null;
  if (!valuationReliability(company, financials).reliable) {
    return (
      <div className="bg-card border border-border rounded-3xl p-5 sm:p-6">
        <p className="text-sm font-semibold text-warning mb-1">Not meaningful for this stock</p>
        <p className="text-xs text-muted leading-relaxed">This company is loss-making or has negative net worth, so a fair value / multiple-based estimate does not apply here. See the caution under the verdict above.</p>
      </div>
    );
  }

  const profile = getCompanyProfile(company);
  const g       = assumptions.revenueGrowthRate;
  const mult    = assumptions.exitMultiple;
  const margin  = assumptions.netMarginAssumption;
  const years   = assumptions.years;

  // ── Growth steps: ±4% around base, 2% increments ──────────────────────────
  const growthSteps = [g - 4, g - 2, g, g + 2, g + 4].map(v => Math.max(v, 1));

  // ── Multiple steps: dynamic based on model ─────────────────────────────────
  // Step size scales with the magnitude of the multiple
  const multStep =
    profile.model === 'pb'       ? 0.3  :
    profile.model === 'ev_ebitda'? 1.5  :
    profile.model === 'ev_sales' ? 0.5  :
    5;                                     // PE

  const multSteps = [-2, -1, 0, 1, 2]
    .map(d => Math.max(mult + d * multStep, profile.exitMultipleMin));

  const multDecimals = profile.model === 'pb' ? 1 : 0;

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-primary">Sensitivity Matrix</h3>
        <span className="text-xs text-muted font-mono">
          Current ₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
      </div>

      <p className="text-xs text-muted mb-1">
        What the stock is worth if your inputs turn out different. ✦ marks your current inputs.
      </p>
      <p className="text-xs text-muted mb-3">
        Revenue Growth % (rows) × {profile.exitMultipleLabel} (cols)
        {profile.model !== 'pb' && profile.model !== 'ev_ebitda' && ` — Net Margin fixed at ${margin.toFixed(1)}%`}
        {profile.model === 'ev_ebitda' && ' — EBITDA margin taken from latest actuals'}
        {profile.model === 'pb' && ' — P/B model, margin not applicable'}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left pb-2 pr-2 text-muted font-medium w-16 whitespace-nowrap">
                Growth ↓ / {profile.exitMultipleLabel.replace('Exit ', '')} →
              </th>
              {multSteps.map(m => (
                <th
                  key={m}
                  className={`pb-2 px-1 text-center font-medium whitespace-nowrap ${
                    m === mult ? 'text-gold' : 'text-muted'
                  }`}
                >
                  {m.toFixed(multDecimals)}x{m === mult ? ' ✦' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {growthSteps.map(gr => (
              <tr key={gr}>
                <td className={`py-1 pr-2 font-mono font-medium whitespace-nowrap ${
                  gr === g ? 'text-gold' : 'text-muted'
                }`}>
                  {gr.toFixed(1)}%{gr === g ? ' ✦' : ''}
                </td>
                {multSteps.map(m => {
                  const result = runPrimaryModel(
                    profile.model,
                    financials,
                    company,
                    gr,
                    margin,
                    m,
                    years,
                  );
                  const fv     = Math.max(result.fairValue, 0);
                  const upside = fv > 0 ? ((fv / currentPrice) - 1) * 100 : -100;
                  const cls    = getCellColor(fv, currentPrice, years);

                  return (
                    <td
                      key={m}
                      className={`py-1 px-1 text-center font-mono text-xs rounded border ${cls} ${
                        gr === g && m === mult
                          ? 'ring-1 ring-gold ring-offset-1 ring-offset-card'
                          : ''
                      }`}
                      title={`Fair Value: ₹${fv.toFixed(0)} | Upside: ${upside.toFixed(1)}%`}
                    >
                      <div className="font-semibold">
                        {fv >= 1000
                          ? `₹${(fv / 1000).toFixed(1)}K`
                          : fv > 0 ? `₹${fv.toFixed(0)}` : '—'}
                      </div>
                      <div className="opacity-75 text-[10px]">
                        {fv > 0 ? `${upside >= 0 ? '+' : ''}${upside.toFixed(0)}%` : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {[
          { cls: 'bg-gain/20 border-gain/20', label: '+30%+ upside' },
          { cls: 'bg-gold/10 border-gold/10', label: '±10% range' },
          { cls: 'bg-loss/20 border-loss/20', label: '-25%+ downside' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${cls}`} />
            <span className="text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
