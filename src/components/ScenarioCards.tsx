'use client';

import { ValuationAssumptions, ScenarioResult } from '@/lib/types';
import { FinancialYear } from '@/lib/types';
import { Company } from '@/lib/types';
import { getSectorProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel } from '@/lib/forecastUtils';

interface ScenarioCardsProps {
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
  currentPrice: number;
  company: Company;
}

interface Scenario {
  name: 'Bear' | 'Base' | 'Bull';
  probability: number;
  color: string;
  growthRate: number;
  marginAssumption: number;
  exitMultiple: number;
  fairValue: number;
  upside: number;
  cagr: number;
}

export default function ScenarioCards({ financials, assumptions, currentPrice, company }: ScenarioCardsProps) {
  if (!financials.length) return null;

  const profile = getSectorProfile(company.sector);
  const years   = assumptions.years;

  // ── Build three scenario configs ─────────────────────────────────────────
  const configs: Omit<Scenario, 'fairValue' | 'upside' | 'cagr'>[] = [
    {
      name: 'Bear',
      probability: 25,
      color: '#EF4444',
      growthRate:      Math.max(assumptions.revenueGrowthRate + profile.bearGrowthDelta,  1),
      marginAssumption:Math.max(assumptions.netMarginAssumption + profile.bearMarginDelta, 1),
      exitMultiple:    Math.max(assumptions.exitMultiple + profile.bearMultipleDelta,       profile.exitMultipleMin),
    },
    {
      name: 'Base',
      probability: 50,
      color: '#F59E0B',
      growthRate:      assumptions.revenueGrowthRate,
      marginAssumption:assumptions.netMarginAssumption,
      exitMultiple:    assumptions.exitMultiple,
    },
    {
      name: 'Bull',
      probability: 25,
      color: '#10B981',
      growthRate:      assumptions.revenueGrowthRate + profile.bullGrowthDelta,
      marginAssumption:assumptions.netMarginAssumption + profile.bullMarginDelta,
      exitMultiple:    Math.min(assumptions.exitMultiple + profile.bullMultipleDelta, profile.exitMultipleMax),
    },
  ];

  // ── Run sector-appropriate model for each scenario ────────────────────────
  const scenarios: Scenario[] = configs.map(cfg => {
    const result = runPrimaryModel(
      profile.model,
      financials,
      company,
      cfg.growthRate,
      cfg.marginAssumption,
      cfg.exitMultiple,
      years,
    );
    const fairValue = Math.max(result.fairValue, 0);
    const upside    = fairValue > 0 ? (fairValue / currentPrice - 1) * 100 : -100;
    const cagr      = fairValue > 0
      ? (Math.pow(Math.max(fairValue / currentPrice, 0.001), 1 / years) - 1) * 100
      : -100;
    return { ...cfg, fairValue, upside, cagr };
  });

  // ── Weighted expected value (probability-weighted) ────────────────────────
  const weightedFV = scenarios.reduce(
    (sum, s) => sum + (s.fairValue * s.probability) / 100, 0
  );
  const weightedUpside = weightedFV > 0 ? (weightedFV / currentPrice - 1) * 100 : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-primary">Scenario Analysis</h3>
          <p className="text-[11px] text-muted mt-0.5">
            Model: <span className="text-gold font-medium">{profile.exitMultipleLabel}</span>
            {' · '}probabilities set by analyst
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted">Weighted Expected Value</p>
          <p className={`text-base font-bold font-mono ${weightedUpside >= 0 ? 'text-gain' : 'text-loss'}`}>
            ₹{weightedFV.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            <span className="text-sm ml-1">
              ({weightedUpside >= 0 ? '+' : ''}{weightedUpside.toFixed(1)}%)
            </span>
          </p>
        </div>
      </div>

      {/* ── Three scenario cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {scenarios.map((s) => {
          const isPositive = s.upside >= 0;
          return (
            <div
              key={s.name}
              className="rounded-xl p-4 border"
              style={{ backgroundColor: `${s.color}08`, borderColor: `${s.color}30` }}
            >
              {/* Name + probability + upside */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-bold" style={{ color: s.color }}>{s.name}</span>
                  <span
                    className="text-[10px] font-bold px-1 rounded"
                    style={{ color: s.color, backgroundColor: `${s.color}20` }}
                  >
                    {s.probability}%
                  </span>
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: s.color }}>
                  {isPositive ? '+' : ''}{s.upside.toFixed(1)}%
                </span>
              </div>

              {/* Fair value */}
              <p className="text-2xl font-bold font-mono text-primary mb-0.5">
                ₹{s.fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-muted mb-3">
                CAGR{' '}
                <span className="font-mono font-semibold" style={{ color: s.color }}>
                  {s.cagr.toFixed(1)}%
                </span>{' '}
                p.a.
              </p>

              {/* Assumption breakdown */}
              <div className="space-y-1 pt-3 border-t border-border/50">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Rev Growth</span>
                  <span className="font-mono text-primary">{s.growthRate.toFixed(1)}%</span>
                </div>
                {profile.model !== 'pb' && profile.model !== 'ev_sales' && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Net Margin</span>
                    <span className="font-mono text-primary">{s.marginAssumption.toFixed(1)}%</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted">{profile.exitMultipleLabel}</span>
                  <span className="font-mono text-primary">
                    {s.exitMultiple.toFixed(profile.model === 'pb' ? 1 : 0)}x
                  </span>
                </div>
              </div>

              {/* Probability bar */}
              <div className="mt-3 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ backgroundColor: s.color, width: `${s.probability * 2}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Probability bar visual ── */}
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-[11px] text-muted mb-2">Probability distribution</p>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          {scenarios.map(s => (
            <div
              key={s.name}
              style={{ width: `${s.probability}%`, backgroundColor: s.color }}
              title={`${s.name}: ${s.probability}%`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {scenarios.map(s => (
            <span key={s.name} className="text-[10px] font-mono" style={{ color: s.color }}>
              {s.name} {s.probability}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
