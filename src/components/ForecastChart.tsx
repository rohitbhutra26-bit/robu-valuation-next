'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { FinancialYear, ValuationAssumptions } from '@/lib/types';

interface ForecastChartProps {
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-gold font-semibold mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted">{p.name}:</span>
            <span className="text-primary font-mono">₹{p.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ForecastChart({ financials, assumptions }: ForecastChartProps) {
  const latest = financials[financials.length - 1];
  const growthRate = assumptions.revenueGrowthRate / 100;
  const margin = assumptions.netMarginAssumption / 100;

  const projectedRevenue = latest.revenue * Math.pow(1 + growthRate, assumptions.years);
  const projectedPAT = projectedRevenue * margin;

  const latestFYNum = parseInt(latest.year.replace('FY', '')) || 24;
  const projectedYear = `FY${latestFYNum + assumptions.years}E`;

  const data = [
    {
      year: `${latest.year} (Actual)`,
      Revenue: latest.revenue,
      PAT: latest.pat,
      type: 'historical',
    },
    {
      year: projectedYear,
      Revenue: Math.round(projectedRevenue),
      PAT: Math.round(projectedPAT),
      type: 'projected',
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-primary">Revenue &amp; PAT Forecast</h3>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gold/10 border border-gold/30 rounded text-xs text-gold">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m22 7-8.5 8.5-5-5L1 17" />
          </svg>
          {assumptions.years}Y Projection
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-border/30 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Projected Revenue</p>
          <p className="text-base font-bold font-mono text-accent">
            ₹{(projectedRevenue / 1000).toFixed(0)}K Cr
          </p>
          <p className="text-xs text-muted mt-0.5">
            {((projectedRevenue / latest.revenue - 1) * 100).toFixed(0)}% growth
          </p>
        </div>
        <div className="bg-border/30 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Projected PAT</p>
          <p className="text-base font-bold font-mono text-gain">
            ₹{(projectedPAT / 1000).toFixed(0)}K Cr
          </p>
          <p className="text-xs text-muted mt-0.5">
            {((projectedPAT / latest.pat - 1) * 100).toFixed(0)}% growth
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#6B7280', paddingTop: '8px' }} />
          <Bar dataKey="Revenue" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`rev-${index}`}
                fill={entry.type === 'historical' ? '#3B82F6' : '#60A5FA'}
                opacity={entry.type === 'projected' ? 0.7 : 1}
              />
            ))}
          </Bar>
          <Bar dataKey="PAT" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`pat-${index}`}
                fill={entry.type === 'historical' ? '#10B981' : '#34D399'}
                opacity={entry.type === 'projected' ? 0.7 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-accent/80" />
          <span>Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-accent/40" />
          <span>Projected (Base)</span>
        </div>
      </div>
    </div>
  );
}
