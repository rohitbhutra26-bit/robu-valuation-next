'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FinancialYear } from '@/lib/types';

interface MarginTrendChartProps {
  financials: FinancialYear[];
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
            <span className="text-primary font-mono">{p.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function MarginTrendChart({ financials }: MarginTrendChartProps) {
  const data = financials.map((f) => ({
    year: f.year,
    'EBITDA Margin': f.ebitdaMargin,
    'Net Margin': f.netMargin,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-primary">Margin Trends</h3>
        <span className="text-xs text-muted">% of Revenue</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
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
            tickFormatter={(v) => `${v}%`}
            width={40}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#6B7280', paddingTop: '8px' }}
          />
          <Line
            type="monotone"
            dataKey="EBITDA Margin"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={{ fill: '#8B5CF6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Net Margin"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
