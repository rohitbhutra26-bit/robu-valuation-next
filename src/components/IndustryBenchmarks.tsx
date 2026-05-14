'use client';

import { Company, FinancialYear } from '@/lib/types';

interface IndustryBenchmarksProps {
  company: Company;
  financials: FinancialYear[];
}

// Indian market industry benchmarks (NSE/BSE universe medians)
export const BENCHMARKS: Record<string, {
  label: string;
  pe: number;
  pb: number;
  roe: number;
  revenueGrowth: number;
  netMargin: number;
  epsGrowth: number;
  debtToEquity: number;
}> = {
  'Information Technology': { label: 'IT / Software', pe: 28, pb: 7.2, roe: 25, revenueGrowth: 12, netMargin: 18, epsGrowth: 14, debtToEquity: 0.05 },
  'Technology': { label: 'IT / Software', pe: 28, pb: 7.2, roe: 25, revenueGrowth: 12, netMargin: 18, epsGrowth: 14, debtToEquity: 0.05 },
  'Banking': { label: 'Banking', pe: 14, pb: 2.2, roe: 14, revenueGrowth: 16, netMargin: 22, epsGrowth: 16, debtToEquity: 8.5 },
  'Financial Services': { label: 'Financial Services', pe: 22, pb: 4.5, roe: 18, revenueGrowth: 20, netMargin: 24, epsGrowth: 18, debtToEquity: 4.2 },
  'NBFC': { label: 'NBFC', pe: 22, pb: 4.5, roe: 18, revenueGrowth: 20, netMargin: 24, epsGrowth: 18, debtToEquity: 4.2 },
  'FMCG': { label: 'FMCG', pe: 52, pb: 12, roe: 30, revenueGrowth: 8, netMargin: 14, epsGrowth: 10, debtToEquity: 0.1 },
  'Pharmaceuticals': { label: 'Pharma', pe: 32, pb: 5.5, roe: 18, revenueGrowth: 11, netMargin: 14, epsGrowth: 12, debtToEquity: 0.3 },
  'Healthcare': { label: 'Healthcare', pe: 45, pb: 8, roe: 16, revenueGrowth: 14, netMargin: 10, epsGrowth: 18, debtToEquity: 0.8 },
  'Automobiles': { label: 'Auto', pe: 22, pb: 3.8, roe: 16, revenueGrowth: 12, netMargin: 6, epsGrowth: 18, debtToEquity: 0.6 },
  'Energy': { label: 'Energy / Oil & Gas', pe: 16, pb: 1.8, roe: 12, revenueGrowth: 10, netMargin: 6, epsGrowth: 8, debtToEquity: 1.2 },
  'Infrastructure': { label: 'Infrastructure', pe: 30, pb: 4.5, roe: 14, revenueGrowth: 18, netMargin: 8, epsGrowth: 22, debtToEquity: 1.8 },
  'Metals': { label: 'Metals & Mining', pe: 10, pb: 1.5, roe: 14, revenueGrowth: 8, netMargin: 7, epsGrowth: 10, debtToEquity: 1.4 },
  'Metals & Mining': { label: 'Metals & Mining', pe: 10, pb: 1.5, roe: 14, revenueGrowth: 8, netMargin: 7, epsGrowth: 10, debtToEquity: 1.4 },
  'Cement': { label: 'Cement', pe: 28, pb: 4.2, roe: 14, revenueGrowth: 10, netMargin: 11, epsGrowth: 14, debtToEquity: 0.5 },
  'Telecom': { label: 'Telecom', pe: 35, pb: 4, roe: 10, revenueGrowth: 9, netMargin: 6, epsGrowth: 20, debtToEquity: 3.5 },
  'Utilities': { label: 'Power / Utilities', pe: 18, pb: 2.2, roe: 12, revenueGrowth: 8, netMargin: 15, epsGrowth: 10, debtToEquity: 2.5 },
  'Consumer': { label: 'Consumer Discretionary', pe: 45, pb: 8, roe: 22, revenueGrowth: 14, netMargin: 10, epsGrowth: 16, debtToEquity: 0.2 },
  'Consumer Discretionary': { label: 'Consumer Discretionary', pe: 45, pb: 8, roe: 22, revenueGrowth: 14, netMargin: 10, epsGrowth: 16, debtToEquity: 0.2 },
  'Electronics': { label: 'Electronics / EMS', pe: 55, pb: 10, roe: 20, revenueGrowth: 25, netMargin: 4, epsGrowth: 28, debtToEquity: 0.4 },
  'Conglomerate': { label: 'Conglomerate', pe: 35, pb: 5, roe: 12, revenueGrowth: 14, netMargin: 8, epsGrowth: 12, debtToEquity: 1.2 },
  'Insurance': { label: 'Insurance', pe: 60, pb: 8, roe: 16, revenueGrowth: 18, netMargin: 10, epsGrowth: 18, debtToEquity: 0.1 },
  'Mining': { label: 'Mining', pe: 10, pb: 1.5, roe: 12, revenueGrowth: 6, netMargin: 18, epsGrowth: 8, debtToEquity: 0.6 },
};

export const DEFAULT_BENCHMARK = { label: 'Broad Market', pe: 22, pb: 3.5, roe: 15, revenueGrowth: 12, netMargin: 12, epsGrowth: 12, debtToEquity: 1.0 };

function CompareRow({
  label,
  company,
  industry,
  format,
  higherIsBetter = true,
}: {
  label: string;
  company: number;
  industry: number;
  format: (v: number) => string;
  higherIsBetter?: boolean;
}) {
  const diff = company - industry;
  const pct = industry !== 0 ? (diff / Math.abs(industry)) * 100 : 0;
  const isBetter = higherIsBetter ? diff >= 0 : diff <= 0;
  const isNeutral = Math.abs(pct) < 10;

  const color = isNeutral ? 'text-gold' : isBetter ? 'text-gain' : 'text-loss';
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '—';

  return (
    <div className="grid grid-cols-4 items-center py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted col-span-1">{label}</span>
      <span className="text-xs font-mono text-primary text-right">{format(company)}</span>
      <span className="text-xs font-mono text-muted text-right">{format(industry)}</span>
      <div className={`flex items-center justify-end gap-1 text-xs font-mono font-semibold ${color}`}>
        <span>{arrow}</span>
        <span>{Math.abs(pct).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function IndustryBenchmarks({ company, financials }: IndustryBenchmarksProps) {
  const bench = BENCHMARKS[company.sector] || DEFAULT_BENCHMARK;
  const latest = financials.length > 0 ? financials[financials.length - 1] : null;

  // Calculate EPS CAGR from financials
  let epsGrowth = 0;
  if (financials.length >= 2) {
    const first = financials[0];
    const last = financials[financials.length - 1];
    const years = financials.length - 1;
    if (first.eps > 0 && last.eps > 0) {
      epsGrowth = (Math.pow(last.eps / first.eps, 1 / years) - 1) * 100;
    }
  }

  // Revenue growth CAGR
  let revGrowthCAGR = 0;
  if (financials.length >= 2) {
    const first = financials[0];
    const last = financials[financials.length - 1];
    const years = financials.length - 1;
    if (first.revenue > 0 && last.revenue > 0) {
      revGrowthCAGR = (Math.pow(last.revenue / first.revenue, 1 / years) - 1) * 100;
    }
  }

  // PE premium/discount
  const pePremium = company.pe > 0 && bench.pe > 0
    ? ((company.pe / bench.pe) - 1) * 100
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-primary">Industry Comparison</h3>
        <span className="text-xs px-2 py-0.5 bg-gold/10 border border-gold/20 rounded text-gold font-mono">
          {bench.label}
        </span>
      </div>
      <p className="text-xs text-muted mb-3">Company vs {bench.label} sector median</p>

      {/* Column headers */}
      <div className="grid grid-cols-4 mb-1">
        <span className="text-xs text-muted uppercase tracking-wide"></span>
        <span className="text-xs text-muted uppercase tracking-wide text-right">{company.symbol}</span>
        <span className="text-xs text-muted uppercase tracking-wide text-right">Sector</span>
        <span className="text-xs text-muted uppercase tracking-wide text-right">vs</span>
      </div>

      <CompareRow
        label="P/E Ratio"
        company={company.pe}
        industry={bench.pe}
        format={(v) => `${v.toFixed(1)}x`}
        higherIsBetter={false}
      />
      <CompareRow
        label="P/B Ratio"
        company={company.pb}
        industry={bench.pb}
        format={(v) => `${v.toFixed(1)}x`}
        higherIsBetter={false}
      />
      <CompareRow
        label="ROE"
        company={company.roe}
        industry={bench.roe}
        format={(v) => `${v.toFixed(1)}%`}
        higherIsBetter={true}
      />
      {latest && (
        <CompareRow
          label="Net Margin"
          company={latest.netMargin}
          industry={bench.netMargin}
          format={(v) => `${v.toFixed(1)}%`}
          higherIsBetter={true}
        />
      )}
      <CompareRow
        label="Rev CAGR"
        company={revGrowthCAGR}
        industry={bench.revenueGrowth}
        format={(v) => `${v.toFixed(1)}%`}
        higherIsBetter={true}
      />
      <CompareRow
        label="EPS CAGR"
        company={epsGrowth}
        industry={bench.epsGrowth}
        format={(v) => `${v.toFixed(1)}%`}
        higherIsBetter={true}
      />
      <CompareRow
        label="D/E Ratio"
        company={company.debtToEquity}
        industry={bench.debtToEquity}
        format={(v) => `${v.toFixed(2)}x`}
        higherIsBetter={false}
      />

      {/* PE premium/discount summary */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-muted">Sector Median P/E</span>
          <span className="text-xs font-mono text-primary">{bench.pe}x</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-muted">Suggested Growth Range</span>
          <span className="text-xs font-mono text-gold">
            {(bench.revenueGrowth - 3).toFixed(0)}–{(bench.revenueGrowth + 5).toFixed(0)}%
          </span>
        </div>
        <div className={`text-xs rounded-lg px-3 py-2 ${pePremium > 20 ? 'bg-loss/10 text-loss' : pePremium < -20 ? 'bg-gain/10 text-gain' : 'bg-gold/10 text-gold'}`}>
          {company.pe > 0 ? (
            pePremium > 20
              ? `Trading at ${pePremium.toFixed(0)}% premium to sector — priced for high growth`
              : pePremium < -20
              ? `Trading at ${Math.abs(pePremium).toFixed(0)}% discount to sector — potential value`
              : `Trading near sector average P/E — fairly valued`
          ) : 'P/E not available'}
        </div>
      </div>
    </div>
  );
}
