// Shared bear/base/bull scenario definitions.
// One source of truth used by ScenarioCards, WealthProjection, and the print report —
// the user must never see two different "Bull" numbers for the same stock.

import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile, getDynamicDeltas } from '@/lib/sectorModelMap';
import { revenueVolatility, earningsQualityScore } from '@/lib/forecastUtils';

export interface ScenarioConfig {
  name: 'Bear' | 'Base' | 'Bull';
  emoji: string;
  probability: number;
  color: string;
  growthRate: number;
  marginAssumption: number;
  exitMultiple: number;
}

export function buildScenarioConfigs(
  company: Company,
  financials: FinancialYear[],
  assumptions: ValuationAssumptions,
): ScenarioConfig[] {
  const profile = getCompanyProfile(company);
  const sigma   = revenueVolatility(financials);
  const deltas  = getDynamicDeltas(profile, sigma);
  const quality = earningsQualityScore(financials);
  const qualAdjMultiple = assumptions.exitMultiple * quality.multiplier;

  return [
    {
      name: 'Bear', emoji: '🐻', probability: 25, color: '#EF4444',
      growthRate:       Math.max(assumptions.revenueGrowthRate + deltas.bearGrowthDelta, 1),
      marginAssumption: Math.max(assumptions.netMarginAssumption + deltas.bearMarginDelta, 1),
      exitMultiple:     Math.max(qualAdjMultiple + deltas.bearMultipleDelta, profile.exitMultipleMin),
    },
    {
      name: 'Base', emoji: '📊', probability: 50, color: '#3b82f6',
      growthRate:       assumptions.revenueGrowthRate,
      marginAssumption: assumptions.netMarginAssumption,
      exitMultiple:     assumptions.exitMultiple,
    },
    {
      name: 'Bull', emoji: '🚀', probability: 25, color: '#10B981',
      growthRate:       assumptions.revenueGrowthRate + deltas.bullGrowthDelta,
      marginAssumption: assumptions.netMarginAssumption + deltas.bullMarginDelta,
      exitMultiple:     Math.min(qualAdjMultiple + deltas.bullMultipleDelta, profile.exitMultipleMax),
    },
  ];
}

// ₹ formatter — Indian style: ₹1.4L, ₹2.3Cr
export function fmtINR(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(v >= 1e8 ? 1 : 2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}
