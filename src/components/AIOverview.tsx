'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Company, FinancialYear } from '@/lib/types';
import { generateInsight, StockInsight } from '@/lib/aiInsight';
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle,
  ShieldAlert, Eye, PauseCircle, ThumbsUp,
} from '@/lib/icons';

// Module-level cache — persists across tab switches, avoids re-fetching same stock
const aiCache = new Map<string, StockInsight>();

interface AIOverviewProps {
  company: Company;
  financials?: FinancialYear[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LucideIcon = React.ComponentType<any>;

const VERDICT_CONFIG: Record<string, {
  label: string;
  Icon: LucideIcon;
  color: string; bg: string; border: string;
}> = {
  'Strong Buy': { label: 'Great opportunity',  Icon: TrendingUp,    color: 'text-gain', bg: 'bg-gain/10', border: 'border-gain/25' },
  'Buy':        { label: 'Looks attractive',   Icon: ThumbsUp,      color: 'text-gain', bg: 'bg-gain/10', border: 'border-gain/25' },
  'Accumulate': { label: 'Worth watching',     Icon: Eye,           color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/25' },
  'Hold':       { label: 'Hold what you have', Icon: PauseCircle,   color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/25' },
  'Reduce':     { label: 'Consider trimming',  Icon: AlertTriangle, color: 'text-loss', bg: 'bg-loss/10', border: 'border-loss/25' },
  'Sell':       { label: 'Time to step back',  Icon: ShieldAlert,   color: 'text-loss', bg: 'bg-loss/10', border: 'border-loss/25' },
  'Avoid':      { label: 'Risky right now',    Icon: ShieldAlert,   color: 'text-loss', bg: 'bg-loss/10', border: 'border-loss/25' },
};

export default function AIOverview({ company, financials = [] }: AIOverviewProps) {
  // Rule-based insight — synchronous, instant, always available
  const ruleInsight = generateInsight(company, financials);

  // Gemini-upgraded insight — loads async, replaces rule-based silently
  const [aiInsight, setAiInsight]   = useState<StockInsight | null>(
    aiCache.get(company.symbol) ?? null
  );
  const [aiLoading, setAiLoading]   = useState(!aiCache.has(company.symbol));

  useEffect(() => {
    // Already have it cached for this symbol — use immediately
    if (aiCache.has(company.symbol)) {
      setAiInsight(aiCache.get(company.symbol)!);
      setAiLoading(false);
      return;
    }

    setAiLoading(true);
    setAiInsight(null);

    const controller = new AbortController();

    fetch('/api/ai-analysis', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ company, financials }),
      signal:  controller.signal,
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data?.verdict && data?.summary) {
          const upgraded: StockInsight = {
            verdict:      data.verdict,
            confidence:   data.confidence ?? 'Medium',
            summary:      data.summary,
            bull:         data.bull,
            bear:         data.bear,
            verdictColor: '',  // driven by VERDICT_CONFIG
            thesis:       data.thesis ?? [],
            watch:        data.watch ?? [],
          };
          aiCache.set(company.symbol, upgraded);
          setAiInsight(upgraded);
        }
      })
      .catch((e) => {
        // Silent fallback — rule-based stays visible; ignore abort errors
        if (e?.name === 'AbortError') return;
      })
      .finally(() => setAiLoading(false));

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.symbol]);

  // Show AI insight if ready, otherwise show rule-based instantly
  const insight = aiInsight ?? ruleInsight;
  const isAI    = !!aiInsight;
  const cfg     = VERDICT_CONFIG[insight.verdict] ?? VERDICT_CONFIG['Hold'];

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
          <Sparkles size={14} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-primary leading-none">AI Analysis</h3>
          <p className="text-[10px] text-muted mt-0.5">
            {isAI
              ? 'Gemini AI · not financial advice'
              : aiLoading
              ? 'Analysing with Gemini…'
              : 'Rule-based analysis · not financial advice'}
          </p>
        </div>

        {/* Loading spinner while Gemini fetches */}
        {aiLoading && (
          <div className="w-3.5 h-3.5 border border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}

        {/* Gemini badge once loaded */}
        {isAI && !aiLoading && (
          <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded text-accent font-mono flex-shrink-0">
            Gemini
          </span>
        )}
      </div>

      {/* Verdict pill */}
      <AnimatePresence mode="wait">
      <motion.div
        key={insight.verdict}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        transition={{ duration: 0.22 }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${cfg.bg} ${cfg.border}`}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
          <cfg.Icon size={14} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
          <p className="text-[10px] text-muted/70 mt-0.5">Rating: {insight.verdict}</p>
        </div>
        <span className="text-[10px] text-muted/50 font-mono flex-shrink-0">
          {insight.confidence}
        </span>
      </motion.div>
      </AnimatePresence>

      {/* Summary */}
      <p className="text-[12px] text-muted leading-relaxed">{insight.summary}</p>

      {/* Bull & Bear */}
      <div className="space-y-2">
        <div className="bg-gain/5 border border-gain/20 rounded-lg p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={12} className="text-gain flex-shrink-0" />
            <span className="text-[10px] font-bold text-gain">If things go well…</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">{insight.bull}</p>
        </div>
        <div className="bg-loss/5 border border-loss/20 rounded-lg p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={12} className="text-loss flex-shrink-0" />
            <span className="text-[10px] font-bold text-loss">If things go badly…</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">{insight.bear}</p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-muted/70 text-center">
        Based on {financials.length} years of data · always do your own research
      </p>
    </div>
  );
}
