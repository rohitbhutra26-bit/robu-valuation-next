'use client';

import { FinancialYear, ValuationAssumptions } from '@/lib/types';

interface SensitivityMatrixProps {
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
  currentPrice: number;
}

function computeFairValue(
  latestRevenue: number,
  shares: number,
  growthRate: number,
  netMargin: number,
  exitPE: number,
  years: number
): number {
  const futureRevenue = latestRevenue * Math.pow(1 + growthRate / 100, years);
  const futurePAT = futureRevenue * (netMargin / 100);
  const futurePATPerShare = futurePAT / shares;
  return futurePATPerShare * exitPE;
}

function getCellColor(fairValue: number, currentPrice: number): string {
  const upside = (fairValue / currentPrice - 1) * 100;
  if (upside >= 30) return 'bg-gain/20 text-gain border-gain/20';
  if (upside >= 10) return 'bg-gain/10 text-gain/80 border-gain/10';
  if (upside >= -10) return 'bg-gold/10 text-gold border-gold/10';
  if (upside >= -25) return 'bg-loss/10 text-loss/80 border-loss/10';
  return 'bg-loss/20 text-loss border-loss/20';
}

export default function SensitivityMatrix({
  financials,
  assumptions,
  currentPrice,
}: SensitivityMatrixProps) {
  if (!financials.length) return null;
  const latest = financials[financials.length - 1];
  const safeShares = Math.max(latest.shares ?? 1, 0.001);
  const g = assumptions.revenueGrowthRate;
  const pe = assumptions.exitPE;
  const margin = assumptions.netMarginAssumption;
  const years = assumptions.years;

  // Rows: Revenue Growth from g-4% to g+4% in 2% steps → 5 values
  const growthSteps = [g - 4, g - 2, g, g + 2, g + 4].map((v) => Math.max(v, 1));
  // Cols: Exit PE from pe-10 to pe+10 in 5x steps → 5 values
  const peSteps = [pe - 10, pe - 5, pe, pe + 5, pe + 10].map((v) => Math.max(v, 5));

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-primary">Sensitivity Matrix</h3>
        <span className="text-xs text-muted">Fair Value vs Current ₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
      </div>
      <p className="text-xs text-muted mb-3">
        Revenue Growth % (rows) × Exit P/E Multiple (cols) — Net Margin fixed at {margin.toFixed(1)}%
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left pb-2 pr-2 text-muted font-medium w-16 whitespace-nowrap">
                Growth ↓ / PE →
              </th>
              {peSteps.map((p) => (
                <th
                  key={p}
                  className={`pb-2 px-1 text-center font-medium whitespace-nowrap ${
                    p === pe ? 'text-gold' : 'text-muted'
                  }`}
                >
                  {p.toFixed(0)}x{p === pe ? ' *' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {growthSteps.map((gr) => (
              <tr key={gr}>
                <td className={`py-1 pr-2 font-mono font-medium whitespace-nowrap ${
                  gr === g ? 'text-gold' : 'text-muted'
                }`}>
                  {gr.toFixed(1)}%{gr === g ? ' *' : ''}
                </td>
                {peSteps.map((p) => {
                  const fv = computeFairValue(
                    latest.revenue,
                    safeShares,
                    gr,
                    margin,
                    p,
                    years
                  );
                  const upside = ((fv / currentPrice) - 1) * 100;
                  const cellClass = getCellColor(fv, currentPrice);
                  return (
                    <td
                      key={p}
                      className={`py-1 px-1 text-center font-mono text-xs rounded border ${cellClass} ${
                        gr === g && p === pe ? 'ring-1 ring-gold ring-offset-1 ring-offset-card' : ''
                      }`}
                      title={`Fair Value: ₹${fv.toFixed(0)} | Upside: ${upside.toFixed(1)}%`}
                    >
                      <div className="font-semibold">
                        ₹{fv >= 1000
                          ? `${(fv / 1000).toFixed(1)}K`
                          : fv.toFixed(0)}
                      </div>
                      <div className="text-xs opacity-75">
                        {upside >= 0 ? '+' : ''}{upside.toFixed(0)}%
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
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gain/20 border border-gain/20" />
          <span className="text-muted">+30%+ upside</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gold/10 border border-gold/10" />
          <span className="text-muted">±10% range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-loss/20 border border-loss/20" />
          <span className="text-muted">-25%+ downside</span>
        </div>
      </div>
    </div>
  );
}
