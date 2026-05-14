'use client';

import { Company, FinancialYear } from '@/lib/types';

interface KeyMetricsProps {
  company: Company;
  financials: FinancialYear[];
}

function MetricCard({
  label,
  value,
  subValue,
  color = 'text-primary',
  trend,
}: {
  label: string;
  value: string;
  subValue?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex-1 min-w-0">
      <p className="text-xs text-muted uppercase tracking-wide mb-1 truncate">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
      {subValue && (
        <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
          {trend === 'up' && <span className="text-gain">▲</span>}
          {trend === 'down' && <span className="text-loss">▼</span>}
          {subValue}
        </p>
      )}
    </div>
  );
}

function calcCAGR(start: number, end: number, years: number): number {
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

export default function KeyMetrics({ company, financials }: KeyMetricsProps) {
  const fin = financials;
  if (!fin || fin.length === 0) return null;
  const latest: FinancialYear = fin[fin.length - 1];
  const first: FinancialYear = fin[0];
  const years = Math.max(fin.length - 1, 1);

  const revCAGR = calcCAGR(first.revenue, latest.revenue, years);
  const patCAGR = calcCAGR(first.pat, latest.pat, years);
  const epsCAGR = calcCAGR(first.eps, latest.eps, years);

  return (
    <div className="flex flex-wrap gap-2">
      <MetricCard
        label="Revenue (FY24)"
        value={`₹${(latest.revenue / 1000).toFixed(0)}K Cr`}
        subValue={`${revCAGR.toFixed(1)}% 4Y CAGR`}
        trend={revCAGR > 0 ? 'up' : 'down'}
        color="text-primary"
      />
      <MetricCard
        label="PAT (FY24)"
        value={`₹${(latest.pat / 1000).toFixed(1)}K Cr`}
        subValue={`${patCAGR.toFixed(1)}% 4Y CAGR`}
        trend={patCAGR > 0 ? 'up' : 'down'}
        color={latest.pat > 0 ? 'text-gain' : 'text-loss'}
      />
      <MetricCard
        label="EBITDA Margin"
        value={`${latest.ebitdaMargin.toFixed(1)}%`}
        subValue={`Net: ${latest.netMargin.toFixed(1)}%`}
        color={latest.ebitdaMargin >= 20 ? 'text-gain' : latest.ebitdaMargin >= 12 ? 'text-gold' : 'text-primary'}
      />
      <MetricCard
        label="EPS (FY24)"
        value={`₹${latest.eps.toFixed(1)}`}
        subValue={`${epsCAGR.toFixed(1)}% 4Y CAGR`}
        trend={epsCAGR > 0 ? 'up' : 'down'}
        color="text-primary"
      />
      <MetricCard
        label="ROE"
        value={`${company.roe.toFixed(1)}%`}
        subValue={company.roe >= 20 ? 'Excellent' : company.roe >= 12 ? 'Good' : 'Below avg'}
        color={company.roe >= 20 ? 'text-gain' : company.roe >= 12 ? 'text-gold' : 'text-loss'}
      />
      <MetricCard
        label="Debt / Equity"
        value={`${company.debtToEquity.toFixed(2)}x`}
        subValue={company.debtToEquity < 1 ? 'Low leverage' : company.debtToEquity < 3 ? 'Moderate' : 'High leverage'}
        color={company.debtToEquity < 1 ? 'text-gain' : company.debtToEquity < 3 ? 'text-gold' : 'text-loss'}
      />
    </div>
  );
}
