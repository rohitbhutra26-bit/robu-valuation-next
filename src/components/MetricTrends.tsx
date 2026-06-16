'use client';
import { FinancialYear } from '@/lib/types';
import SectionCard from './SectionCard';
import { TrendingUp } from '@/lib/icons';

function fmtCr(v: number): string {
  const a = Math.abs(v);
  if (a >= 100000) return `₹${(v / 100000).toFixed(2)}L Cr`;
  if (a >= 1000) return `₹${(v / 1000).toFixed(1)}k Cr`;
  return `₹${Math.round(v).toLocaleString('en-IN')} Cr`;
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const w = 104, h = 30, pad = 3;
  const vals = values.filter(v => Number.isFinite(v));
  if (vals.length < 2) return <svg width={w} height={h} aria-hidden="true" />;
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * (w - pad * 2) + pad;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function cagr(values: number[]): number | null {
  const v = values.filter(x => Number.isFinite(x));
  if (v.length < 2) return null;
  const first = v[0], last = v[v.length - 1];
  if (first <= 0 || last <= 0) return null;
  return (Math.pow(last / first, 1 / (v.length - 1)) - 1) * 100;
}

export default function MetricTrends({ financials }: { financials: FinancialYear[] }) {
  if (!financials?.length) return null;
  const f = financials;
  const latest = f[f.length - 1];
  const years = f.length;

  const rows = [
    { label: 'Revenue',    values: f.map(x => x.revenue),   latest: fmtCr(latest.revenue),            kind: 'level' as const },
    { label: 'Net profit', values: f.map(x => x.pat),       latest: fmtCr(latest.pat),                kind: 'level' as const },
    { label: 'Net margin', values: f.map(x => x.netMargin), latest: `${latest.netMargin.toFixed(1)}%`, kind: 'pct'   as const },
    { label: 'EPS',        values: f.map(x => x.eps),       latest: `₹${latest.eps.toFixed(1)}`,       kind: 'level' as const },
  ];

  return (
    <SectionCard title="The numbers at a glance" eyebrow={`${years}-year trends`} Icon={TrendingUp} tone="neutral">
      <div>
        {rows.map((r, i) => {
          const first = r.values[0], last = r.values[r.values.length - 1];
          const flat = Math.abs(last - first) < (Math.abs(first) * 0.03 || 0.5);
          const up = last >= first;
          const color = flat ? 'rgb(var(--color-warning))' : up ? 'rgb(var(--color-gain))' : 'rgb(var(--color-loss))';
          const tCls = flat ? 'text-warning' : up ? 'text-gain' : 'text-loss';
          const c = cagr(r.values);
          let chip: string;
          if (r.kind === 'pct') chip = flat ? '▬ steady' : `${up ? '▲' : '▼'} ${last - first >= 0 ? '+' : ''}${(last - first).toFixed(1)}pp`;
          else chip = c === null ? '—' : `${c >= 0 ? '▲ +' : '▼ '}${c.toFixed(0)}% / yr`;
          return (
            <div key={r.label} className={`flex items-center gap-3 sm:gap-4 py-3 ${i < rows.length - 1 ? 'border-b border-border/60' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-primary font-medium">{r.label}</div>
                <div className="text-[11.5px] text-muted">{years}-year trend</div>
              </div>
              <Spark values={r.values} color={color} />
              <div className="text-right min-w-[80px]">
                <div className="text-[15px] font-bold font-mono text-primary leading-none">{r.latest}</div>
                <div className={`text-[11.5px] mt-1 ${tCls}`}>{chip}</div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
