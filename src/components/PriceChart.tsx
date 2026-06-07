'use client';

import { useEffect, useRef, useMemo } from 'react';
import { BarChart3 } from '@/lib/icons';
import { Company, FinancialYear } from '@/lib/types';

interface Props {
  company: Company;
  financials?: FinancialYear[];
}

function getTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

const inr = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n >= 100 ? 0 : 1 })}`;

export default function PriceChart({ company, financials = [] }: Props) {
  const widgetRef = useRef<HTMLDivElement | null>(null);

  // NSE:RELIANCE format — TradingView's native NSE coverage
  const tvSymbol = `NSE:${company.symbol}`;

  // ── P/E Valuation bands ────────────────────────────────────────────────────
  // Calculated purely from fundamentals — no data-server call needed.
  // Uses trailing EPS from financials (more accurate than company.eps which
  // can be TTM from Yahoo) × 70% / 100% / 135% of current P/E as proxy for
  // cheap / fair / pricey historical re-rating range.
  const bands = useMemo(() => {
    // Best EPS: last financial year with eps > 0
    const validFins = financials.filter(f => f.eps > 0);
    const eps =
      validFins.length > 0
        ? validFins[validFins.length - 1].eps
        : company.eps && company.eps > 0
        ? company.eps
        : company.pe > 0 && company.currentPrice > 0
        ? company.currentPrice / company.pe
        : 0;

    if (eps <= 0 || company.pe <= 0) return null;

    const fairPE   = company.pe;
    const cheapPE  = +(fairPE * 0.70).toFixed(1);
    const priceyPE = +(fairPE * 1.35).toFixed(1);

    return {
      cheap:    Math.round(eps * cheapPE),
      fair:     Math.round(eps * fairPE),
      expensive: Math.round(eps * priceyPE),
      eps:      eps.toFixed(1),
      fairPE:   fairPE.toFixed(1),
      cheapPE,
      priceyPE,
    };
  }, [company, financials]);

  const price     = company.currentPrice;
  const gapToFair = bands ? ((bands.fair / price - 1) * 100) : null;

  // ── Mount TradingView widget ───────────────────────────────────────────────
  useEffect(() => {
    const el = widgetRef.current;
    if (!el) return;
    el.innerHTML = '';

    const theme = getTheme();

    // TradingView requires a wrapper div with the exact class name
    // Height: 380px on mobile, 520px on tablet+
    const isMobile = window.innerWidth < 640;
    const chartHeight = isMobile ? 380 : 520;

    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.width  = '100%';
    container.style.height = `${chartHeight}px`;

    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.height = `${chartHeight - 28}px`;
    inner.style.width  = '100%';
    container.appendChild(inner);

    const copyright = document.createElement('div');
    copyright.className = 'tradingview-widget-copyright';
    copyright.innerHTML =
      '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">' +
      '<span class="blue-text" style="font-size:10px;color:var(--color-muted,#888)">Track all markets on TradingView</span></a>';
    container.appendChild(copyright);

    const script = document.createElement('script');
    script.type  = 'text/javascript';
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    // Config passed as innerHTML of the script tag (TradingView's standard embed pattern)
    script.innerHTML = JSON.stringify({
      autosize:            true,
      symbol:              tvSymbol,
      interval:            'D',
      timezone:            'Asia/Kolkata',
      theme,
      style:               '1',      // 1 = candlestick
      locale:              'en',
      allow_symbol_change: false,
      calendar:            false,
      hide_volume:         false,
      withdateranges:      true,     // shows the 1D / 1W / 1M … range bar
      save_image:          true,
      support_host:        'https://www.tradingview.com',
    });
    container.appendChild(script);
    el.appendChild(container);

    return () => {
      if (el) el.innerHTML = '';
    };
  }, [tvSymbol]); // re-mount only when symbol changes; TradingView handles theme internally

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={14} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Price Chart</h3>
            <p className="text-xs text-muted">
              {company.symbol} · 1min → monthly · drawing tools included
              {gapToFair !== null && (
                <span className={gapToFair >= 0 ? ' text-gain' : ' text-loss'}>
                  {' '}· {gapToFair >= 0 ? '+' : ''}{gapToFair.toFixed(0)}% to fair value
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* TradingView chart container — height adapts to mobile/tablet/desktop via JS */}
      <div ref={widgetRef} className="w-full" style={{ minHeight: 380 }} />

      {/* ── Valuation bands panel ─────────────────────────────────────────── */}
      {bands ? (
        <div className="px-4 pb-4 pt-3 border-t border-border space-y-3">
          <p className="text-[10px] uppercase tracking-[1.5px] font-semibold text-muted">
            P/E Valuation Levels · EPS ₹{bands.eps} × P/E range
          </p>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {(
              [
                {
                  label: 'Cheap',
                  price: bands.cheap,
                  pe: bands.cheapPE,
                  pct: ((bands.cheap / price - 1) * 100),
                  bg: 'bg-gain/10',
                  border: 'border-gain/25',
                  text: 'text-gain',
                },
                {
                  label: 'Fair',
                  price: bands.fair,
                  pe: +bands.fairPE,
                  pct: gapToFair!,
                  bg: 'bg-gold/10',
                  border: 'border-gold/25',
                  text: 'text-gold',
                },
                {
                  label: 'Pricey',
                  price: bands.expensive,
                  pe: bands.priceyPE,
                  pct: ((bands.expensive / price - 1) * 100),
                  bg: 'bg-loss/10',
                  border: 'border-loss/25',
                  text: 'text-loss',
                },
              ] as const
            ).map(b => (
              <div key={b.label} className={`text-center p-2 sm:p-2.5 rounded-lg ${b.bg} border ${b.border}`}>
                <p className={`text-[9px] sm:text-[10px] ${b.text} font-bold uppercase tracking-wide mb-0.5`}>{b.label}</p>
                <p className={`text-xs sm:text-sm font-bold font-mono ${b.text} leading-tight`}>{inr(b.price)}</p>
                <p className="text-[9px] sm:text-[10px] text-muted mt-0.5">{b.pe}x P/E</p>
                <p className={`text-[9px] sm:text-[10px] font-mono mt-0.5 ${b.pct >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {b.pct >= 0 ? '+' : ''}{b.pct.toFixed(0)}%
                </p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted/60 leading-relaxed">
            Levels = EPS ₹{bands.eps} × 70% / 100% / 135% of current P/E ({bands.fairPE}x).
            Use as a quick re-rating gauge, not a buy/sell signal.
          </p>
        </div>
      ) : (
        <div className="px-4 pb-3 pt-2 border-t border-border">
          <p className="text-[11px] text-muted/60">
            Valuation bands require valid EPS and P/E — unavailable for {company.symbol}.
          </p>
        </div>
      )}

    </div>
  );
}
