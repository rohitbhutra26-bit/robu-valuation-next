'use client';

import { motion } from 'framer-motion';
import { Company, FinancialYear } from '@/lib/types';
import { staggerContainer, staggerItem } from '@/lib/animations';

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
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="bg-card border border-border rounded-xl p-3 flex-1 min-w-0"
    >
      <p className="text-xs text-muted uppercase tracking-wide mb-1 truncate">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
      {subValue && (
        <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
          {trend === 'up' && <span className="text-gain">▲</span>}
          {trend === 'down' && <span className="text-loss">▼</span>}
          {subValue}
        </p>
      )}
    </motion.div>
  );
}

function calcCAGR(start: number, end: number, years: number): number {
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

// Adaptive ₹ Crore formatting — small caps were showing "₹0K Cr" before
function fmtCr(v: number): string {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L Cr`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K Cr`;
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
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
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap gap-2"
    >
      <MetricCard
        label={`Revenue (${latest.year})`}
        value={fmtCr(latest.revenue)}
        subValue={`${revCAGR.toFixed(1)}% ${years}Y CAGR`}
        trend={revCAGR > 0 ? 'up' : 'down'}
        color="text-primary"
      />
      <MetricCard
        label={`Profit (${latest.year})`}
        value={fmtCr(latest.pat)}
        subValue={`${patCAGR.toFixed(1)}% ${years}Y CAGR`}
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
        label={`EPS (${latest.year})`}
        value={`₹${latest.eps.toFixed(1)}`}
        subValue={`${epsCAGR.toFixed(1)}% ${years}Y CAGR`}
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
    </motion.div>
  );
}
