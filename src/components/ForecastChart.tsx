'use client';

/**
 * ForecastChart.tsx
 *
 * Grouped bar chart — Revenue (blue) + PAT (green) per year.
 * Historical years from `financials`. Projected years computed live from `assumptions`.
 * Amber dashed divider shows exactly where history ends and projection begins.
 * Growth % labels float above each bar so users instantly see if the projection
 * is a continuation or a step-change from historical performance.
 */

import { useMemo } from 'react';
import { FinancialYear, ValuationAssumptions } from '@/lib/types';
import { BarChart3 } from '@/lib/icons';

interface ForecastPoint {
  year: string;
  revenue: number;
  pat: number;
  revenueGrowth: number;
  isProjected: boolean;
}

interface Props {
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

// ─── Build data ───────────────────────────────────────────────────────────────
function buildForecast(fin: FinancialYear[], a: ValuationAssumptions): ForecastPoint[] {
  const hist: ForecastPoint[] = fin.map(f => ({
    year: f.year,
    revenue: f.revenue,
    pat: f.pat,
    revenueGrowth: f.revenueGrowth,
    isProjected: false,
  }));

  const latest  = fin[fin.length - 1];
  const rawYY   = parseInt(latest.year.replace('FY', '').replace('P', '')) || 24;
  const baseYear = rawYY > 50 ? 1900 + rawYY : 2000 + rawYY;
  const nProj   = Math.min(a.years, 5);

  for (let i = 1; i <= nProj; i++) {
    const rev = latest.revenue * Math.pow(1 + a.revenueGrowthRate / 100, i);
    hist.push({
      year: `FY${String(baseYear + i).slice(2)}P`,
      revenue: rev,
      pat: rev * (a.netMarginAssumption / 100),
      revenueGrowth: a.revenueGrowthRate,
      isProjected: true,
    });
  }
  return hist;
}

function fmtY(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${(n / 1000).toFixed(0)}K`;
  return `${n.toFixed(0)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ForecastChart({ financials, assumptions }: Props) {
  const points = useMemo(() => buildForecast(financials, assumptions), [financials, assumptions]);
  if (!points.length) return null;

  const W      = 640;
  const H      = 210;
  const PAD    = { t: 28, r: 12, b: 36, l: 44 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const N      = points.length;
  const colW   = innerW / N;
  const barW   = Math.max((colW * 0.82) / 2 - 1.5, 5);
  const gap    = 3;
  const firstP = points.findIndex(p => p.isProjected);
  const maxVal = Math.max(...points.map(p => p.revenue)) * 1.15;

  function sy(v: number) { return (v / maxVal) * innerH; }
  function baseY()       { return PAD.t + innerH; }
  function revX(i: number) { return PAD.l + i * colW + (colW - barW * 2 - gap) / 2; }
  function patX(i: number) { return revX(i) + barW + gap; }

  const yTicks = [0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));
  const REV = '#22d3ee';
  const PAT = '#4ade80';

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gain/10 border border-gain/20 flex items-center justify-center">
            <BarChart3 size={13} className="text-gain" />
          </div>
          <h3 className="text-sm font-semibold text-primary">Revenue & Profit Forecast</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2 rounded-sm inline-block" style={{ backgroundColor: REV }} />
            Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2 rounded-sm inline-block" style={{ backgroundColor: PAT }} />
            PAT
          </span>
          <span className="text-[10px] font-mono bg-border/50 px-1.5 py-0.5 rounded">P = Projected</span>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>

        {/* Grid + Y labels */}
        {yTicks.map(v => {
          const y = PAD.t + innerH - sy(v);
          return (
            <g key={v}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#0a1f0f" strokeWidth="0.8" />
              <text x={PAD.l - 5} y={y + 3.5} textAnchor="end" fontSize="8.5" fill="#4a9a6f"
                fontFamily="JetBrains Mono, monospace">{fmtY(v)}</text>
            </g>
          );
        })}

        {/* Base axis */}
        <line x1={PAD.l} y1={baseY()} x2={W - PAD.r} y2={baseY()} stroke="#0f2d18" strokeWidth="1" />

        {/* Unit label */}
        <text x={PAD.l - 6} y={PAD.t - 6} textAnchor="end" fontSize="8" fill="#4a9a6f"
          fontFamily="JetBrains Mono, monospace">₹ Cr</text>

        {/* Historical / Projected divider */}
        {firstP > 0 && (
          <>
            <line
              x1={PAD.l + firstP * colW - 4} y1={PAD.t - 16}
              x2={PAD.l + firstP * colW - 4} y2={baseY() + 4}
              stroke="#34d399" strokeWidth="1" strokeDasharray="4 3" strokeOpacity="0.55"
            />
            <text x={PAD.l + 4} y={PAD.t - 6} fontSize="8" fill="#4a9a6f">Historical</text>
            <text x={PAD.l + firstP * colW + 2} y={PAD.t - 6} fontSize="8" fill="#34d399" fillOpacity="0.8">
              Projected →
            </text>
          </>
        )}

        {/* Bars */}
        {points.map((pt, i) => {
          const isP  = pt.isProjected;
          const revH = sy(pt.revenue);
          const patH = sy(pt.pat);
          const rx   = revX(i);
          const px   = patX(i);
          const cx   = PAD.l + i * colW + colW / 2;

          return (
            <g key={pt.year}>
              {/* Revenue */}
              <rect x={rx} y={baseY() - revH} width={barW} height={revH}
                fill={REV} fillOpacity={isP ? 0.38 : 0.9} rx="2" />

              {/* PAT */}
              <rect x={px} y={baseY() - patH} width={barW} height={patH}
                fill={PAT} fillOpacity={isP ? 0.38 : 0.9} rx="2" />

              {/* Growth % above revenue bar */}
              {pt.revenueGrowth !== 0 && revH > 4 && (
                <text x={rx + barW / 2} y={baseY() - revH - 3}
                  textAnchor="middle" fontSize="7" fontFamily="JetBrains Mono, monospace"
                  fill={isP ? '#34d399' : '#6ee7b7'} fillOpacity={isP ? 0.9 : 0.85}>
                  {pt.revenueGrowth > 0 ? '+' : ''}{pt.revenueGrowth.toFixed(0)}%
                </text>
              )}

              {/* X label */}
              <text x={cx} y={baseY() + 13} textAnchor="middle" fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fill={isP ? '#34d399' : '#6ee7b7'} fillOpacity={isP ? 0.85 : 1}>
                {pt.year}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="text-[11px] text-muted text-center mt-1">
        Projected at{' '}
        <span className="text-accent font-mono font-semibold">{assumptions.revenueGrowthRate}%</span>
        {' '}revenue growth ·{' '}
        <span className="text-gain font-mono font-semibold">{assumptions.netMarginAssumption}%</span>
        {' '}net margin — adjusts live with sliders above
      </p>
    </div>
  );
}
