'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { BarChart3 } from '@/lib/icons';
import { Company, FinancialYear } from '@/lib/types';

interface Props {
  company: Company;
  financials?: FinancialYear[];
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type TF = '1W' | '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL';

const TF_DAYS: Record<TF, number> = {
  '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '3Y': 1095, 'ALL': 99999,
};

const inr = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n >= 100 ? 0 : 1 })}`;

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function PriceChart({ company, financials = [] }: Props) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [tf, setTf]                 = useState<TF>('1Y');
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── P/E bands ─────────────────────────────────────────────────────────────
  const bands = useMemo(() => {
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
    const fairPE = company.pe;
    return {
      cheap:     Math.round(eps * fairPE * 0.70),
      fair:      Math.round(eps * fairPE),
      expensive: Math.round(eps * fairPE * 1.35),
      eps:       eps.toFixed(1),
      fairPE:    fairPE.toFixed(1),
      cheapPE:   +(fairPE * 0.70).toFixed(1),
      priceyPE:  +(fairPE * 1.35).toFixed(1),
    };
  }, [company, financials]);

  const price     = company.currentPrice;
  const gapToFair = bands ? ((bands.fair / price - 1) * 100) : null;

  // ── Fetch OHLC from Yahoo Finance via our proxy ───────────────────────────
  useEffect(() => {
    setIsLoading(true);
    setFetchError(null);
    fetch(`/api/historical/${company.symbol}`)
      .then(r => r.ok ? r.json() : r.json().then((e: { error?: string }) => { throw new Error(e.error || 'Failed'); }))
      .then((data: Candle[]) => {
        if (Array.isArray(data) && data.length > 0) setAllCandles(data);
        else throw new Error('No candle data');
      })
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setIsLoading(false));
  }, [company.symbol]);

  // ── Slice candles to timeframe ────────────────────────────────────────────
  const visibleCandles = useMemo(() => {
    if (!allCandles.length) return [];
    const days = TF_DAYS[tf];
    if (days >= 99999) return allCandles;
    const cut = cutoffDate(days);
    return allCandles.filter(c => c.time >= cut);
  }, [allCandles, tf]);

  // ── Build / rebuild chart whenever visible candles or bands change ─────────
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el || !visibleCandles.length) return;

    let cancelled = false;
    let cleanupFn: (() => void) | null = null;

    import('lightweight-charts').then(({ createChart, ColorType, CrosshairMode, LineStyle }) => {
      if (cancelled || !chartContainerRef.current) return;
      const container = chartContainerRef.current;

      const isDark     = document.documentElement.getAttribute('data-theme') === 'dark';
      const textColor  = isDark ? '#888888' : '#666666';
      const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      const upColor    = '#22c55e';
      const downColor  = '#ef4444';
      const isMobile   = window.innerWidth < 640;
      const chartH     = isMobile ? 300 : 460;

      const chart = createChart(container, {
        width:  container.clientWidth,
        height: chartH,
        layout: {
          background:  { type: ColorType.Solid, color: 'transparent' },
          textColor,
          fontFamily:  "'Inter', system-ui, sans-serif",
          fontSize:    11,
        },
        grid: {
          vertLines: { color: gridColor, style: LineStyle.Dotted },
          horzLines: { color: gridColor, style: LineStyle.Dotted },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: gridColor,
          scaleMargins: { top: 0.08, bottom: 0.22 },
        },
        timeScale: {
          borderColor: gridColor,
          timeVisible: true,
          secondsVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale:  { mouseWheel: true, pinch: true },
      });

      // Candlestick series
      const cSeries = chart.addCandlestickSeries({
        upColor, downColor,
        borderUpColor: upColor, borderDownColor: downColor,
        wickUpColor: upColor,   wickDownColor: downColor,
        priceScaleId: 'right',
      });
      cSeries.setData(
        visibleCandles.map(c => ({ time: c.time as import('lightweight-charts').Time, open: c.open, high: c.high, low: c.low, close: c.close }))
      );

      // Volume histogram (separate overlay scale)
      const vSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      vSeries.setData(
        visibleCandles.map(c => ({
          time:  c.time as import('lightweight-charts').Time,
          value: c.volume ?? 0,
          color: c.close >= c.open
            ? (isDark ? 'rgba(34,197,94,0.22)' : 'rgba(34,197,94,0.18)')
            : (isDark ? 'rgba(239,68,68,0.22)'  : 'rgba(239,68,68,0.18)'),
        }))
      );

      // P/E dashed lines on the price chart
      if (bands) {
        const lines: Array<{ price: number; color: string; title: string }> = [
          { price: bands.cheap,     color: '#22c55e', title: `Cheap ${bands.cheapPE}x` },
          { price: bands.fair,      color: '#f59e0b', title: `Fair ${bands.fairPE}x`   },
          { price: bands.expensive, color: '#ef4444', title: `Pricey ${bands.priceyPE}x` },
        ];
        lines.forEach(({ price: p, color, title }) =>
          cSeries.createPriceLine({ price: p, color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title })
        );
      }

      chart.timeScale().fitContent();

      // Responsive resize
      const ro = new ResizeObserver(entries => {
        if (entries[0]) chart.applyOptions({ width: entries[0].contentRect.width });
      });
      ro.observe(container);

      cleanupFn = () => { ro.disconnect(); chart.remove(); };
    });

    return () => {
      cancelled = true;
      cleanupFn?.();
    };
  }, [visibleCandles, bands]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={14} className="text-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-primary">Price Chart</h3>
            <p className="text-xs text-muted truncate">
              {company.symbol} · candlestick + volume
              {gapToFair !== null && (
                <span className={gapToFair >= 0 ? ' text-gain' : ' text-loss'}>
                  {' '}· {gapToFair >= 0 ? '+' : ''}{gapToFair.toFixed(0)}% to fair
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {(Object.keys(TF_DAYS) as TF[]).map(t => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                tf === t
                  ? 'bg-gold text-terminal'
                  : 'text-muted hover:text-primary hover:bg-border/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="w-full px-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-xs text-muted/60">Loading price data…</div>
        ) : fetchError ? (
          <div className="flex items-center justify-center h-32 text-xs text-muted/60">Chart unavailable — {fetchError}</div>
        ) : (
          <div ref={chartContainerRef} className="w-full" />
        )}
      </div>

      {/* P/E valuation bands */}
      {bands ? (
        <div className="px-4 pb-4 pt-3 border-t border-border space-y-3 mt-1">
          <p className="text-[10px] uppercase tracking-[1.5px] font-semibold text-muted">
            P/E Valuation Levels · EPS ₹{bands.eps} × P/E range
          </p>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {(
              [
                { label: 'Cheap',  price: bands.cheap,     pe: bands.cheapPE,  pct: (bands.cheap     / price - 1) * 100, bg: 'bg-gain/10', border: 'border-gain/25', text: 'text-gain' },
                { label: 'Fair',   price: bands.fair,      pe: +bands.fairPE,  pct: gapToFair!,                           bg: 'bg-gold/10', border: 'border-gold/25', text: 'text-gold' },
                { label: 'Pricey', price: bands.expensive, pe: bands.priceyPE, pct: (bands.expensive / price - 1) * 100, bg: 'bg-loss/10', border: 'border-loss/25', text: 'text-loss' },
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
            Dashed lines on chart show each level. EPS ₹{bands.eps} × 70% / 100% / 135% of {bands.fairPE}x P/E.
          </p>
        </div>
      ) : (
        <div className="px-4 pb-3 pt-2 border-t border-border mt-1">
          <p className="text-[11px] text-muted/60">
            Valuation bands require valid EPS and P/E — unavailable for {company.symbol}.
          </p>
        </div>
      )}

    </div>
  );
}
