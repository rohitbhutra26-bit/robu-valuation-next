'use client';

import { useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Company, FinancialYear } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { redFlags } from '@/lib/advancedModels';
import { Bookmark, Briefcase } from '@/lib/icons';
import { slideDown } from '@/lib/animations';
import Tooltip from '@/components/Tooltip';

interface CompanyHeaderProps {
  company: Company;
  financials?: FinancialYear[];
  isWatchlisted?: boolean;
  onWatchlistToggle?: () => void;
  isInPortfolio?: boolean;
  onPortfolioToggle?: () => void;
  /** Action rendered inside the header (e.g. the export/report button) so it
   *  stays aligned within the card instead of floating beside it. */
  headerAction?: ReactNode;
}

function formatCr(value: number): string {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L Cr`;
  }
  return `₹${value.toLocaleString('en-IN')} Cr`;
}

export default function CompanyHeader({ company, financials, isWatchlisted, onWatchlistToggle, isInPortfolio, onPortfolioToggle, headerAction }: CompanyHeaderProps) {
  const isPositive = company.changePercent >= 0;
  const smartProfile = getCompanyProfile(company);
  const smartSectorLabel = smartProfile.sectorLabel;
  const has52W = company.week52Low > 0 && company.week52High > 0;

  // Red-flag count badge — danger visible without scrolling
  const flagSummary = useMemo(() => {
    if (!financials?.length) return null;
    try {
      const r = redFlags(financials, company, smartProfile.model);
      return { fails: r.failCount, warns: r.warnCount };
    } catch { return null; }
  }, [financials, company, smartProfile.model]);

  function scrollToFlags() {
    document.getElementById('red-flags-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Metric chip with semantic color + plain kid-level meaning (tap the ⓘ)
  const chips: { label: string; value: string; tone?: 'gain' | 'warning' | 'loss'; tip: string }[] = [
    { label: 'Mkt Cap', value: formatCr(company.marketCap), tip: 'Total price tag to buy the whole company — all its shares together.' },
    { label: 'P/E', value: company.pe > 0 ? `${company.pe.toFixed(1)}x` : '— (loss-making)', tip: 'What you pay for ₹1 of yearly profit. P/E 20 = ₹20 paid per ₹1 earned. Lower is usually cheaper.' },
    { label: 'P/B', value: company.pb > 0 ? `${company.pb.toFixed(1)}x` : '—', tip: 'Price compared to the company\'s own net assets ("book"). P/B 2 = paying double what the assets are worth on paper.' },
    {
      label: 'ROE',
      value: company.roe > 0 ? `${company.roe.toFixed(1)}%` : '—',
      tone: company.roe <= 0 ? undefined : company.roe >= 20 ? 'gain' : company.roe >= 12 ? 'warning' : 'loss',
      tip: 'Profit made per ₹100 of shareholders\' money. 20%+ is excellent, under 12% is weak.',
    },
    {
      label: 'D/E',
      value: company.debtToEquity > 0 ? `${company.debtToEquity.toFixed(2)}x` : '—',
      tone: company.debtToEquity <= 0 ? undefined : company.debtToEquity < 1 ? 'gain' : company.debtToEquity < 3 ? 'warning' : 'loss',
      tip: 'Loans vs own money. D/E 1 = ₹1 of debt per ₹1 of own funds. Under 1 is comfortable (banks are naturally higher).',
    },
    { label: 'Div Yield', value: company.dividendYield > 0 ? `${company.dividendYield.toFixed(2)}%` : '—', tip: 'Yearly cash paid to you per ₹100 of share price — like rent from a flat you own.' },
  ];

  const toneClass: Record<string, string> = { gain: 'text-gain', warning: 'text-warning', gold: 'text-gold', loss: 'text-loss' };

  return (
    <motion.div
      key={company.symbol}
      variants={slideDown}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="bg-card border border-border rounded-xl p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-gold/10 text-gold border border-gold/30 rounded">
              {company.symbol}
            </span>
            <span className="text-xs px-2 py-0.5 bg-border/50 rounded text-primary/80 border border-border/50 font-medium">
              {smartSectorLabel}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded border ${
              company.exchange === 'BSE'
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'bg-accent/10 text-accent border-accent/30'
            }`}>
              {company.exchange || 'NSE'}
            </span>
            {/* Red-flag badge — click scrolls to the full checklist */}
            {flagSummary && (
              <button
                onClick={scrollToFlags}
                title="See the full red-flag checklist"
                className={`text-xs px-2 py-0.5 rounded border font-semibold transition-all hover:opacity-80 ${
                  flagSummary.fails > 0
                    ? 'bg-loss/10 text-loss border-loss/30'
                    : flagSummary.warns > 0
                    ? 'bg-gold/10 text-gold border-gold/30'
                    : 'bg-gain/10 text-gain border-gain/30'
                }`}
              >
                {flagSummary.fails > 0
                  ? `⚠ ${flagSummary.fails} red flag${flagSummary.fails === 1 ? '' : 's'}`
                  : flagSummary.warns > 0
                  ? `${flagSummary.warns} caution${flagSummary.warns === 1 ? '' : 's'}`
                  : '✓ health checks pass'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <h1 className="text-xl font-bold text-primary leading-tight">{company.name}</h1>
            <div className="flex items-center gap-1.5">
              {onWatchlistToggle && (
                <button
                  onClick={onWatchlistToggle}
                  aria-label={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
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
          {has52W && (
            <p className="text-xs text-muted mt-0.5 whitespace-nowrap">
              52W: ₹{company.week52Low.toLocaleString('en-IN')} – ₹{company.week52High.toLocaleString('en-IN')}
            </p>
          )}
          {headerAction && (
            <div className="mt-3 flex justify-end">{headerAction}</div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 items-center">
        {chips.map(c => (
          <div key={c.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-border/40 rounded-lg border border-border">
            <span className="text-[11px] text-muted font-medium inline-flex items-center gap-0.5">
              {c.label}
              <Tooltip text={c.tip} />
            </span>
            <span className={`text-xs font-semibold font-mono ${c.tone ? toneClass[c.tone] : 'text-primary'}`}>
              {c.value}
            </span>
          </div>
        ))}
        {/* Color legend — one glance teaches the whole app's color language */}
        <span className="text-[10px] text-muted/70 ml-auto hidden sm:flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gain inline-block" />good</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />okay</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-loss inline-block" />weak</span>
        </span>
      </div>
    </motion.div>
  );
}
