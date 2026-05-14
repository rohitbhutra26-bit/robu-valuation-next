'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FinancialYear } from '@/lib/types';

interface RevenueChartProps {
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
            <span className="text-primary font-mono">₹{p.value.toLocaleString('en-IN')} Cr</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ financials }: RevenueChartProps) {
  const data = financials.map((f) => ({
    year: f.year,
    Revenue: f.revenue,
    PAT: f.pat,
    EBITDA: f.ebitda,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-primary">Revenue & Profitability</h3>
        <span className="text-xs text-muted">₹ Crore</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
            width={45}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#6B7280', paddingTop: '8px' }}
          />
          <Bar yAxisId="left" dataKey="Revenue" fill="#3B82F6" radius={[3, 3, 0, 0]} opacity={0.8} />
          <Bar yAxisId="left" dataKey="EBITDA" fill="#8B5CF6" radius={[3, 3, 0, 0]} opacity={0.8} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="PAT"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={{ fill: '#F59E0B', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
