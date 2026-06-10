'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { ChevronsUp, ChevronUp, Minus, ChevronDown, ChevronsDown } from '@/lib/icons';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel } from '@/lib/forecastUtils';
import { generateInsight } from '@/lib/aiInsight';
import { scaleIn } from '@/lib/animations';

interface Props {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

export default function VerdictCard({ company, financials, assumptions }: Props) {
  const fairValue = useMemo(() => {
    if (!financials.length || !company.currentPrice) return 0;
    try {
      const profile = getCompanyProfile(company);
      const result = runPrimaryModel(
        profile.model,
        financials,
        company,
        assumptions.revenueGrowthRate,
        assumptions.netMarginAssumption,
        assumptions.exitMultiple,
        assumptions.years,
      );
      return Math.max(result.fairValue, 0);
    } catch {
      return 0;
    }
  }, [
    company,
    financials,
    assumptions.revenueGrowthRate,
    assumptions.netMarginAssumption,
    assumptions.exitMultiple,
    assumptions.years,
  ]);

  if (!fairValue || !company.currentPrice) return null;

  const current = company.currentPrice;
  const upside = ((fairValue - current) / current) * 100;

  // ── Verdict logic ────────────────────────────────────────────────────────
  const isStrongBuy   = upside > 30;
  const isUndervalued = upside > 10;
  const isFair        = upside >= -10 && upside <= 10;
  const isExpensive   = upside < -30;

  const verdict =
    isStrongBuy   ? { label: 'Looks very undervalued',  sub: 'Strong potential upside based on your assumptions', color: 'text-gain', bg: 'bg-gain/5', border: 'border-gain/20', dot: 'rgb(var(--color-gain))', Icon: ChevronsUp   } :
    isUndervalued ? { label: 'Looks undervalued',       sub: 'Stock may be trading below fair value',             color: 'text-gain', bg: 'bg-gain/5', border: 'border-gain/20', dot: 'rgb(var(--color-gain))', Icon: ChevronUp    } :
    isFair        ? { label: 'Fairly priced',           sub: 'Trading close to estimated fair value',             color: 'text-gold', bg: 'bg-gold/5', border: 'border-gold/20', dot: 'rgb(var(--color-gold))', Icon: Minus        } :
    isExpensive   ? { label: 'Looks very expensive',    sub: 'Significant downside to estimated fair value',      color: 'text-loss', bg: 'bg-loss/5', border: 'border-loss/20', dot: 'rgb(var(--color-loss))', Icon: ChevronsDown } :
                    { label: 'Looks overvalued',         sub: 'May be trading above fair value',                  color: 'text-loss', bg: 'bg-loss/5', border: 'border-loss/20', dot: 'rgb(var(--color-loss))', Icon: ChevronDown  };

  const upsideLabel = upside >= 0
    ? `+${upside.toFixed(1)}% upside`
    : `${upside.toFixed(1)}% downside`;

  const fvKey = Math.round(fairValue);

  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className={`${verdict.bg} border ${verdict.border} rounded-xl p-4`}
    >
      {/* Row 1: icon + label + upside — always horizontal */}
      <div className="flex items-center gap-3">
        <motion.div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${verdict.dot}18`, border: `1.5px solid ${verdict.dot}40` }}
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ duration: 0.4, ease: 'easeInOut', delay: 0.1 }}
        >
          <verdict.Icon size={18} className={verdict.color} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${verdict.color} leading-tight`}>{verdict.label}</p>
          <p className="text-xs text-muted mt-0.5 leading-snug">{verdict.sub}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-sm font-bold font-mono ${verdict.color} whitespace-nowrap`}>
            {upsideLabel}
          </p>
        </div>
      </div>

      {/* Row 2: target vs current price */}
      <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-current/10 text-xs flex-wrap">
        <span className="text-muted">Target</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={fvKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={`font-mono font-semibold ${verdict.color}`}
          >
            ₹{fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </motion.span>
        </AnimatePresence>
        <span className="text-muted">·</span>
        <span className="text-muted">Now</span>
        <span className="font-mono text-primary">
          ₹{current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
        {(() => {
          try {
            const conf = generateInsight(company, financials).confidence;
            const cls = conf === 'High' ? 'text-gain border-gain/30 bg-gain/10'
                      : conf === 'Medium' ? 'text-gold border-gold/30 bg-gold/10'
                      : 'text-loss border-loss/30 bg-loss/10';
            return (
              <span
                className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}
                title="How much the different valuation methods agree with each other"
              >
                {conf} confidence
              </span>
            );
          } catch { return null; }
        })()}
      </div>
    </motion.div>
  );
}
