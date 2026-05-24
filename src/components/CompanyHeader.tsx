'use client';

import { Company } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { Bookmark, Briefcase } from '@/lib/icons';

interface CompanyHeaderProps {
  company: Company;
  isWatchlisted?: boolean;
  onWatchlistToggle?: () => void;
  isInPortfolio?: boolean;
  onPortfolioToggle?: () => void;
}

function formatCr(value: number): string {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L Cr`;
  }
  return `₹${value.toLocaleString('en-IN')} Cr`;
}

export default function CompanyHeader({ company, isWatchlisted, onWatchlistToggle, isInPortfolio, onPortfolioToggle }: CompanyHeaderProps) {
  const isPositive = company.changePercent >= 0;
  const smartProfile = getCompanyProfile(company);
  const smartSectorLabel = smartProfile.sectorLabel;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-gold/10 text-gold border border-gold/30 rounded">
              {company.symbol}
            </span>
            <span className="text-xs px-2 py-0.5 bg-border rounded text-muted border border-border/50">
              {smartSectorLabel}
            </span>
            <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent border border-accent/30 rounded">
              NSE
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <h1 className="text-xl font-bold text-primary leading-tight">{company.name}</h1>
            <div className="flex items-center gap-1.5">
              {onWatchlistToggle && (
                <button
                  onClick={onWatchlistToggle}
                  title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isWatchlisted
                      ? 'text-gold bg-gold/15 border border-gold/30'
                      : 'text-muted/40 hover:text-gold hover:bg-gold/10 border border-transparent hover:border-gold/20'
                  }`}
                >
                  <Bookmark size={14} className={isWatchlisted ? 'fill-gold' : ''} />
                </button>
              )}
              {onPortfolioToggle && (
                <button
                  onClick={onPortfolioToggle}
                  title={isInPortfolio ? 'Edit portfolio position' : 'Add to portfolio'}
                  className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all border ${
                    isInPortfolio
                      ? 'text-accent bg-accent/10 border-accent/30'
                      : 'text-muted/50 hover:text-accent hover:bg-accent/10 border-transparent hover:border-accent/20'
                  }`}
                >
                  <Briefcase size={11} />
                  {isInPortfolio ? 'In Portfolio' : '+ Portfolio'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="flex items-baseline gap-1.5 flex-wrap justify-end">
            <span className="text-2xl font-bold font-mono text-primary">
              ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className={`text-sm font-semibold font-mono ${isPositive ? 'text-gain' : 'text-loss'}`}>
              {isPositive ? '+' : ''}{company.changePercent.toFixed(2)}%
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5 whitespace-nowrap">
            52W: ₹{company.week52Low.toLocaleString('en-IN')} – ₹{company.week52High.toLocaleString('en-IN')}
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
