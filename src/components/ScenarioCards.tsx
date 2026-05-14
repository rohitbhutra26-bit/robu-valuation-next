'use client';

import { ValuationAssumptions, ValuationResult, ScenarioResult } from '@/lib/types';
import { FinancialYear } from '@/lib/types';

interface ScenarioCardsProps {
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
  currentPrice: number;
}

function computeValuation(
  latestRevenue: number,
  shares: number,
  currentPrice: number,
  growthRate: number,
  netMargin: number,
  exitPE: number,
  years: number
): ValuationResult {
  const futureRevenue = latestRevenue * Math.pow(1 + growthRate / 100, years);
  const futurePAT = futureRevenue * (netMargin / 100);
  const futurePATPerShare = futurePAT / shares;
  const fairValue = futurePATPerShare * exitPE;
  const cagr = (Math.pow(fairValue / currentPrice, 1 / years) - 1) * 100;
  const upside = (fairValue / currentPrice - 1) * 100;
  return { futureRevenue, futurePAT, futurePATPerShare, fairValue, cagr, upside, currentPrice, years };
}

export default function ScenarioCards({ financials, assumptions, currentPrice }: ScenarioCardsProps) {
  if (!financials.length) return null;
  const latest = financials[financials.length - 1];
  const safeShares = Math.max(latest.shares ?? 1, 0.001); // prevent div/0

  const scenarios: ScenarioResult[] = [
    {
      name: 'Bear',
      revenueGrowth: assumptions.revenueGrowthRate - 2,
      netMargin: assumptions.netMarginAssumption - 2,
      exitPE: assumptions.exitPE - 5,
      color: '#EF4444',
      fairValue: 0,
      upside: 0,
      cagr: 0,
    },
    {
      name: 'Base',
      revenueGrowth: assumptions.revenueGrowthRate,
      netMargin: assumptions.netMarginAssumption,
      exitPE: assumptions.exitPE,
      color: '#F59E0B',
      fairValue: 0,
      upside: 0,
      cagr: 0,
    },
    {
      name: 'Bull',
      revenueGrowth: assumptions.revenueGrowthRate + 3,
      netMargin: assumptions.netMarginAssumption + 2,
      exitPE: assumptions.exitPE + 5,
      color: '#10B981',
      fairValue: 0,
      upside: 0,
      cagr: 0,
    },
  ];

  const computedScenarios = scenarios.map((s) => {
    const result = computeValuation(
      latest.revenue,
      safeShares,
      currentPrice,
      Math.max(s.revenueGrowth, 1),
      Math.max(s.netMargin, 1),
      Math.max(s.exitPE, 5),
      assumptions.years
    );
    return { ...s, fairValue: result.fairValue, upside: result.upside, cagr: result.cagr };
  });

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-primary">Scenario Analysis</h3>
        <span className="text-xs text-muted font-mono">
          Current ₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* 3 cards horizontal */}
      <div className="grid grid-cols-3 gap-4">
        {computedScenarios.map((s) => {
          const isPositive = s.upside >= 0;
          return (
            <div
              key={s.name}
              className="rounded-xl p-4 border"
              style={{ backgroundColor: `${s.color}08`, borderColor: `${s.color}30` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-bold" style={{ color: s.color }}>{s.name} Case</span>
                </div>
                <span className="text-sm font-mono font-bold" style={{ color: s.color }}>
                  {isPositive ? '+' : ''}{s.upside.toFixed(1)}%
                </span>
              </div>

              <p className="text-2xl font-bold font-mono text-primary mb-1">
                ₹{s.fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-muted mb-3">
                CAGR <span className="font-mono font-semibold" style={{ color: s.color }}>{s.cagr.toFixed(1)}%</span> p.a.
              </p>

              <div className="space-y-1 pt-3 border-t border-border/50">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Rev Growth</span>
                  <span className="font-mono text-primary">{s.revenueGrowth.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Net Margin</span>
                  <span className="font-mono text-primary">{s.netMargin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Exit PE</span>
                  <span className="font-mono text-primary">{s.exitPE.toFixed(0)}x</span>
                </div>
              </div>

              <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: s.color,
                    width: `${Math.min(Math.max((s.fairValue / currentPrice) * 40, 5), 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
