'use client';

import { FinancialYear } from '@/lib/types';

interface FinancialsTableProps {
  financials: FinancialYear[];
}

function ColoredGrowth({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted">—</span>;
  const color = value >= 15 ? 'text-gain' : value >= 0 ? 'text-warning' : 'text-loss';
  return (
    <span className={`${color} font-mono`}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

function ColoredMargin({ value, type }: { value: number; type: 'ebitda' | 'net' }) {
  const thresholds = type === 'ebitda'
    ? { good: 20, ok: 12 }
    : { good: 15, ok: 8 };
  const color = value >= thresholds.good ? 'text-gain' : value >= thresholds.ok ? 'text-warning' : 'text-loss';
  return <span className={`${color} font-mono`}>{value.toFixed(1)}%</span>;
}

export default function FinancialsTable({ financials }: FinancialsTableProps) {
  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">{financials.length}-Year Financials</h3>
        <span className="text-xs text-muted hidden sm:block">All figures in ₹ Crore except EPS</span>
        <span className="text-xs text-muted sm:hidden">₹ Crore</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-border/20">
              <th className="sticky left-0 bg-card text-left px-4 py-2.5 text-muted font-medium uppercase tracking-wide whitespace-nowrap z-10 border-r border-border/40">
                Metric
              </th>
              {financials.map((f) => (
                <th key={f.year} className="text-right px-3 py-2.5 text-muted font-medium uppercase tracking-wide whitespace-nowrap">
                  {f.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            <tr className="hover:bg-border/10 transition-colors">
              <td className="sticky left-0 bg-card px-4 py-2.5 text-muted font-medium z-10 whitespace-nowrap">Revenue</td>
              {financials.map((f) => (
                <td key={f.year} className="text-right px-3 py-2.5 font-mono text-primary whitespace-nowrap">
                  {f.revenue.toLocaleString('en-IN')}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-border/10 transition-colors">
              <td className="sticky left-0 bg-card px-4 py-2.5 text-muted font-medium z-10 whitespace-nowrap">Rev. Growth %</td>
              {financials.map((f, i) => (
                <td key={f.year} className="text-right px-3 py-2.5 whitespace-nowrap">
                  {i === 0 ? <span className="text-muted">Base</span> : <ColoredGrowth value={f.revenueGrowth} />}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-border/10 transition-colors">
              <td className="sticky left-0 bg-card px-4 py-2.5 text-muted font-medium z-10 whitespace-nowrap">EBITDA</td>
              {financials.map((f) => (
                <td key={f.year} className="text-right px-3 py-2.5 font-mono text-primary whitespace-nowrap">
                  {f.ebitda.toLocaleString('en-IN')}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-border/10 transition-colors">
              <td className="sticky left-0 bg-card px-4 py-2.5 text-muted font-medium z-10 whitespace-nowrap">EBITDA Margin</td>
              {financials.map((f) => (
                <td key={f.year} className="text-right px-3 py-2.5 whitespace-nowrap">
                  <ColoredMargin value={f.ebitdaMargin} type="ebitda" />
                </td>
              ))}
            </tr>
            <tr className="hover:bg-border/10 transition-colors">
              <td className="sticky left-0 bg-card px-4 py-2.5 text-muted font-medium z-10 whitespace-nowrap">PAT</td>
              {financials.map((f) => (
                <td key={f.year} className="text-right px-3 py-2.5 font-mono text-primary whitespace-nowrap">
                  {f.pat.toLocaleString('en-IN')}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-border/10 transition-colors">
              <td className="sticky left-0 bg-card px-4 py-2.5 text-muted font-medium z-10 whitespace-nowrap">Net Margin</td>
              {financials.map((f) => (
                <td key={f.year} className="text-right px-3 py-2.5 whitespace-nowrap">
                  <ColoredMargin value={f.netMargin} type="net" />
                </td>
              ))}
            </tr>
            <tr className="hover:bg-border/10 transition-colors">
              <td className="sticky left-0 bg-card px-4 py-2.5 text-muted font-medium z-10 whitespace-nowrap">EPS (₹)</td>
              {financials.map((f) => (
                <td key={f.year} className="text-right px-3 py-2.5 font-mono text-gold whitespace-nowrap">
                  {f.eps.toFixed(1)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-border/10 transition-colors">
              <td className="sticky left-0 bg-card px-4 py-2.5 text-muted font-medium z-10 whitespace-nowrap">Shares (Cr)</td>
              {financials.map((f) => (
                <td key={f.year} className="text-right px-3 py-2.5 font-mono text-muted whitespace-nowrap">
                  {f.shares.toFixed(1)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
