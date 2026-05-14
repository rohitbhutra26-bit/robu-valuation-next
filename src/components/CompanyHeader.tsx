'use client';

import { Company } from '@/lib/types';

interface CompanyHeaderProps {
  company: Company;
}

function formatCr(value: number): string {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L Cr`;
  }
  return `₹${value.toLocaleString('en-IN')} Cr`;
}

export default function CompanyHeader({ company }: CompanyHeaderProps) {
  const isPositive = company.changePercent >= 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-gold/10 text-gold border border-gold/30 rounded">
              {company.symbol}
            </span>
            <span className="text-xs px-2 py-0.5 bg-border rounded text-muted border border-border/50">
              {company.sector}
            </span>
            <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent border border-accent/30 rounded">
              NSE
            </span>
          </div>
          <h1 className="mt-2 text-xl font-bold text-primary leading-tight">{company.name}</h1>
        </div>

        <div className="text-right">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary">
              ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className={`text-base font-semibold font-mono ${isPositive ? 'text-gain' : 'text-loss'}`}>
              {isPositive ? '+' : ''}{company.change.toFixed(2)} ({isPositive ? '+' : ''}{company.changePercent.toFixed(2)}%)
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            52W: ₹{company.week52Low.toLocaleString('en-IN')} — ₹{company.week52High.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-border/40 rounded-lg border border-border">
          <span className="text-xs text-muted">Mkt Cap</span>
          <span className="text-xs font-semibold text-primary font-mono">{formatCr(company.marketCap)}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-border/40 rounded-lg border border-border">
          <span className="text-xs text-muted">P/E</span>
          <span className="text-xs font-semibold text-primary font-mono">{company.pe.toFixed(1)}x</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-border/40 rounded-lg border border-border">
          <span className="text-xs text-muted">P/B</span>
          <span className="text-xs font-semibold text-primary font-mono">{company.pb.toFixed(1)}x</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-border/40 rounded-lg border border-border">
          <span className="text-xs text-muted">ROE</span>
          <span className={`text-xs font-semibold font-mono ${company.roe >= 20 ? 'text-gain' : company.roe >= 12 ? 'text-gold' : 'text-loss'}`}>
            {company.roe.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-border/40 rounded-lg border border-border">
          <span className="text-xs text-muted">D/E</span>
          <span className={`text-xs font-semibold font-mono ${company.debtToEquity < 1 ? 'text-gain' : company.debtToEquity < 3 ? 'text-gold' : 'text-loss'}`}>
            {company.debtToEquity.toFixed(2)}x
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-border/40 rounded-lg border border-border">
          <span className="text-xs text-muted">Div Yield</span>
          <span className="text-xs font-semibold text-primary font-mono">{company.dividendYield.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}
