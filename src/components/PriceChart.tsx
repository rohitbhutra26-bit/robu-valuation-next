'use client';

<<<<<<< Updated upstream
import { useEffect, useRef, useMemo, useState } from 'react';
import { BarChart3 } from '@/lib/icons';
import { Company, FinancialYear } from '@/lib/types';

interface Props {
  company: Company;
  financials?: FinancialYear[];
}
=======
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type Time,
} from 'lightweight-charts';
import { BarChart3 } from '@/lib/icons';
import { Company, FinancialYear } from '@/lib/types';
>>>>>>> Stashed changes

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface HistoricalError {
  error: 'NOT_FOUND' | string;
  message: string;
}

<<<<<<< Updated upstream
type TF = '1W' | '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL';
const TF_DAYS: Record<TF, number> = {
  '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '3Y': 1095, 'ALL': 99999,
};
=======
interface Props {
  company: Company;
  financials?: FinancialYear[];
}

type DrawMode = 'none' | 'trend' | 'hori';
type Pt = { time: Time; value: number };
type Drawing =
  | { id: number; type: 'trend'; p1: Pt; p2: Pt }
  | { id: number; type: 'hori'; price: number };

const PERIODS = [
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
  { label: '5Y', value: '5y' },
];

const DRAW_COLOR = '#3b82f6';

function cssColor(name: string, alpha = 1): string {
  let triplet = '136,136,136';
  if (typeof window !== 'undefined') {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v) triplet = v.replace(/\s+/g, ',');
  }
  return alpha >= 1 ? `rgb(${triplet})` : `rgba(${triplet},${alpha})`;
}
>>>>>>> Stashed changes

const inr = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n >= 100 ? 0 : 1 })}`;

<<<<<<< Updated upstream
function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function PriceChart({ company, financials = [] }: Props) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  const [allCandles, setAllCandles]     = useState<Candle[]>([]);
  const [tf, setTf]                     = useState<TF>('1Y');
  const [isLoading, setIsLoading]       = useState(true);
  const [fetchError, setFetchError]     = useState<HistoricalError | null>(null);
=======
// "FY24" / "FY2024" / "Mar 2024" → fiscal-year-ending calendar year (2024)
function parseFinYearEnd(label: string): number | null {
  const m4 = label.match(/(20\d{2})/);
  if (m4) return parseInt(m4[1], 10);
  const m2 = label.match(/(\d{2})\b/);
  if (m2) return 2000 + parseInt(m2[1], 10);
  return null;
}

// Indian FY ends 31 Mar; a date in Apr–Dec belongs to next year's FY
function fyEndYear(dateStr: string): number {
  const d = new Date(dateStr);
  return d.getUTCMonth() + 1 >= 4 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[i];
}

export default function PriceChart({ company, financials = [] }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Drawing state kept in refs so it survives chart rebuilds without losing zoom
  const drawingsRef = useRef<Drawing[]>([]);
  const drawnObjRef = useRef<{ id: number; series?: ISeriesApi<'Line'>; line?: IPriceLine }[]>([]);
  const pendingRef = useRef<Pt | null>(null);
  const modeRef = useRef<DrawMode>('none');
  const nextId = useRef(1);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [fallbackPe, setFallbackPe] = useState<PEStats | null>(null);
  const [period, setPeriod] = useState('2y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [themeTick, setThemeTick] = useState(0);
  const [drawCount, setDrawCount] = useState(0);

  const [showFair, setShowFair] = useState(true);
  const [showBands, setShowBands] = useState(true);
  const [show52, setShow52] = useState(false);
  const [mode, setMode] = useState<DrawMode>('none');

  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Reset drawings when the stock changes
  useEffect(() => {
    drawingsRef.current = [];
    pendingRef.current = null;
    setMode('none');
    setDrawCount(c => c + 1);
  }, [company.symbol]);

  // Current trailing EPS for translating P/E → price
  const currentEps = useMemo(() => {
    const finEps = [...financials]
      .map(f => ({ end: parseFinYearEnd(f.year) ?? 0, eps: f.eps }))
      .filter(x => x.end && x.eps > 0)
      .sort((a, b) => b.end - a.end)[0]?.eps;
    if (company.eps && company.eps > 0) return company.eps;
    if (finEps && finEps > 0) return finEps;
    if (company.pe > 0 && company.currentPrice > 0) return company.currentPrice / company.pe;
    return 0;
  }, [company.eps, company.pe, company.currentPrice, financials]);

  // P/E stats computed from real candles + annual EPS (robust, no Screener needed)
  const peStats = useMemo<PEStats | null>(() => {
    const epsByEnd = new Map<number, number>();
    financials.forEach(f => {
      const end = parseFinYearEnd(f.year);
      if (end && f.eps > 0) epsByEnd.set(end, f.eps);
    });
    const ends = [...epsByEnd.keys()].sort((a, b) => a - b);

    if (ends.length >= 2 && candles.length > 20) {
      const epsAsOf = (endYear: number): number => {
        // trailing reported annual = most recent FY that ended on/before prior FY
        let pick = 0;
        for (const e of ends) if (e <= endYear - 1) pick = epsByEnd.get(e)!;
        if (!pick) pick = epsByEnd.get(ends[0])!;
        return pick;
      };
      const pes: number[] = [];
      for (const c of candles) {
        const eps = epsAsOf(fyEndYear(c.time));
        if (eps > 0) {
          const pe = c.close / eps;
          if (pe > 0 && pe < 200) pes.push(pe);
        }
      }
      if (pes.length > 20) {
        const s = pes.sort((a, b) => a - b);
        return { p25: percentile(s, 0.25), median: percentile(s, 0.5), p75: percentile(s, 0.75) };
      }
    }
    return fallbackPe;
  }, [financials, candles, fallbackPe]);
>>>>>>> Stashed changes

  // ── P/E bands ────────────────────────────────────────────────────────────
  const bands = useMemo(() => {
<<<<<<< Updated upstream
    const validFins = financials.filter(f => f.eps > 0);
    const eps =
      validFins.length > 0 ? validFins[validFins.length - 1].eps
      : company.eps && company.eps > 0 ? company.eps
      : company.pe > 0 && company.currentPrice > 0 ? company.currentPrice / company.pe
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

  // ── Fetch OHLC ────────────────────────────────────────────────────────────
=======
    if (!peStats || currentEps <= 0) return null;
    return {
      cheap: peStats.p25 * currentEps,
      fair: peStats.median * currentEps,
      expensive: peStats.p75 * currentEps,
    };
  }, [peStats, currentEps]);

  // ── Fetch candles + (fallback) P/E history ──────────────────────────────────
>>>>>>> Stashed changes
  useEffect(() => {
    setIsLoading(true);
    setFetchError(null);
    fetch(`/api/historical/${company.symbol}`)
      .then(async r => {
        const json = await r.json();
        if (!r.ok) throw json as HistoricalError;
        return json as Candle[];
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setAllCandles(data);
        else throw { error: 'NOT_FOUND', message: 'No candle data returned' };
      })
      .catch((e: HistoricalError) => setFetchError(e))
      .finally(() => setIsLoading(false));
  }, [company.symbol]);

<<<<<<< Updated upstream
  // ── Slice to timeframe ───────────────────────────────────────────────────
  const visibleCandles = useMemo(() => {
    if (!allCandles.length) return [];
    const days = TF_DAYS[tf];
    if (days >= 99999) return allCandles;
    const cut = cutoffDate(days);
    return allCandles.filter(c => c.time >= cut);
  }, [allCandles, tf]);

  // ── Chart ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el || !visibleCandles.length) return;
=======
    fetch(`/api/historical/${company.symbol}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const pe = data?.stats?.pe;
        if (pe && typeof pe.median === 'number') {
          setFallbackPe({ p25: pe.p25, median: pe.median, p75: pe.p75 });
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [company.symbol, period]);

  // ── Recolor on theme change ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const obs = new MutationObserver(() => setThemeTick(t => t + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    return () => obs.disconnect();
  }, []);
>>>>>>> Stashed changes

    let cancelled = false;
    let cleanupFn: (() => void) | null = null;

    import('lightweight-charts').then(({ createChart, ColorType, CrosshairMode, LineStyle }) => {
      if (cancelled || !chartContainerRef.current) return;
      const container = chartContainerRef.current;

<<<<<<< Updated upstream
      const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
      const textColor = isDark ? '#888888' : '#666666';
      const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      const upColor   = '#22c55e';
      const downColor = '#ef4444';
      const isMobile  = window.innerWidth < 640;
      const chartH    = isMobile ? 300 : 460;

      const chart = createChart(container, {
        width:  container.clientWidth,
        height: chartH,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 11,
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
        visibleCandles.map(c => ({
          time: c.time as import('lightweight-charts').Time,
          open: c.open, high: c.high, low: c.low, close: c.close,
        }))
      );

      // Volume histogram
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
=======
    const chart = createChart(el, {
      width: el.clientWidth,
      height: 380,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor, fontFamily: 'inherit', fontSize: 11 },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor, timeVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const series = chart.addCandlestickSeries({
      upColor: gain, downColor: loss,
      borderUpColor: gain, borderDownColor: loss,
      wickUpColor: gain, wickDownColor: loss,
    });
    series.setData(candles as any);
    chart.timeScale().fitContent();
    chartRef.current = chart;
    seriesRef.current = series;

    // valuation overlays
    const addLine = (price: number, color: string, title: string, dashed = true) => {
      if (!Number.isFinite(price) || price <= 0) return;
      series.createPriceLine({ price, color, lineWidth: 2, lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid, axisLabelVisible: true, title });
    };
    if (showFair && bands) addLine(bands.fair, gold, `Fair ${inr(bands.fair)}`, false);
    if (showBands && bands) {
      addLine(bands.cheap, gain, `Cheap ${inr(bands.cheap)}`);
      addLine(bands.expensive, loss, `Pricey ${inr(bands.expensive)}`);
    }
    if (show52) {
      addLine(company.week52High, cssColor('--color-muted', 0.7), `52W High ${inr(company.week52High)}`);
      addLine(company.week52Low, cssColor('--color-muted', 0.7), `52W Low ${inr(company.week52Low)}`);
    }

    // re-render saved drawings (survive rebuilds)
    drawnObjRef.current = [];
    const renderDrawing = (d: Drawing) => {
      if (d.type === 'hori') {
        const line = series.createPriceLine({ price: d.price, color: DRAW_COLOR, lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: inr(d.price) });
        drawnObjRef.current.push({ id: d.id, line });
      } else {
        const ls = chart.addLineSeries({ color: DRAW_COLOR, lineWidth: 2, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
        const pts = [d.p1, d.p2].sort((a, b) => (String(a.time) < String(b.time) ? -1 : 1));
        ls.setData(pts as any);
        drawnObjRef.current.push({ id: d.id, series: ls });
      }
    };
    drawingsRef.current.forEach(renderDrawing);

    // click handler for drawing
    const onClick = (param: any) => {
      const m = modeRef.current;
      if (m === 'none' || !param?.point) return;
      const price = series.coordinateToPrice(param.point.y);
      const time: Time | null = param.time ?? chart.timeScale().coordinateToTime(param.point.x);
      if (price == null || time == null) return;

      if (m === 'hori') {
        const d: Drawing = { id: nextId.current++, type: 'hori', price: Number(price) };
        drawingsRef.current.push(d);
        renderDrawing(d);
        setDrawCount(c => c + 1);
      } else if (m === 'trend') {
        if (!pendingRef.current) {
          pendingRef.current = { time, value: Number(price) };
        } else {
          const d: Drawing = { id: nextId.current++, type: 'trend', p1: pendingRef.current, p2: { time, value: Number(price) } };
          pendingRef.current = null;
          drawingsRef.current.push(d);
          renderDrawing(d);
          setDrawCount(c => c + 1);
        }
      }
    };
    chart.subscribeClick(onClick);
>>>>>>> Stashed changes

      // P/E dashed lines
      if (bands) {
        ([
          { price: bands.cheap,     color: '#22c55e', title: `Cheap ${bands.cheapPE}x`  },
          { price: bands.fair,      color: '#f59e0b', title: `Fair ${bands.fairPE}x`    },
          { price: bands.expensive, color: '#ef4444', title: `Pricey ${bands.priceyPE}x`},
        ] as const).forEach(({ price: p, color, title }) =>
          cSeries.createPriceLine({ price: p, color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title })
        );
      }

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(entries => {
        if (entries[0]) chart.applyOptions({ width: entries[0].contentRect.width });
      });
      ro.observe(container);
      cleanupFn = () => { ro.disconnect(); chart.remove(); };
    });

<<<<<<< Updated upstream
    return () => { cancelled = true; cleanupFn?.(); };
  }, [visibleCandles, bands]);

  // ── Error states ─────────────────────────────────────────────────────────
  function ErrorPanel() {
    if (!fetchError) return null;

    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-xs text-muted/60">Chart unavailable for {company.symbol}</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
=======
    return () => {
      ro.disconnect();
      chart.unsubscribeClick(onClick);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      drawnObjRef.current = [];
    };
  }, [candles, showFair, showBands, show52, bands, company.week52High, company.week52Low, themeTick]);

  const clearDrawings = () => {
    drawingsRef.current = [];
    pendingRef.current = null;
    setMode('none');
    setDrawCount(c => c + 1);
    setThemeTick(t => t + 1); // force a clean rebuild
  };

  const last = candles.length ? candles[candles.length - 1].close : company.currentPrice;
  const gapToFair = bands && bands.fair > 0 ? (bands.fair / last - 1) * 100 : null;

  const toggleBtn = (active: boolean, disabled: boolean) =>
    `px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
      disabled ? 'text-muted/40 border border-border/50 cursor-not-allowed'
      : active ? 'bg-accent/10 text-accent border border-accent/30'
      : 'text-muted border border-border hover:text-primary'
    }`;

>>>>>>> Stashed changes
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
              {company.symbol} · candlestick + volume · BSE/NSE
              {gapToFair !== null && (
                <span className={gapToFair >= 0 ? ' text-gain' : ' text-loss'}>
                  {' '}· {gapToFair >= 0 ? '+' : ''}{gapToFair.toFixed(0)}% to fair
                </span>
              )}
            </p>
          </div>
        </div>
<<<<<<< Updated upstream
        {/* Timeframe buttons — only show if chart is loaded */}
        {allCandles.length > 0 && (
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
        )}
      </div>

      {/* Chart or error */}
      <div className="w-full px-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-xs text-muted/60">
            Loading price data…
          </div>
        ) : fetchError ? (
          <ErrorPanel />
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
            {([
              { label: 'Cheap',  price: bands.cheap,     pe: bands.cheapPE,  pct: (bands.cheap     / price - 1) * 100, bg: 'bg-gain/10', border: 'border-gain/25', text: 'text-gain' },
              { label: 'Fair',   price: bands.fair,      pe: +bands.fairPE,  pct: gapToFair!,                           bg: 'bg-gold/10', border: 'border-gold/25', text: 'text-gold' },
              { label: 'Pricey', price: bands.expensive, pe: bands.priceyPE, pct: (bands.expensive / price - 1) * 100, bg: 'bg-loss/10', border: 'border-loss/25', text: 'text-loss' },
            ] as const).map(b => (
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
          {allCandles.length > 0 && (
            <p className="text-[10px] text-muted/60 leading-relaxed">
              Dashed lines on chart show each level. EPS ₹{bands.eps} × 70% / 100% / 135% of {bands.fairPE}x P/E.
            </p>
          )}
        </div>
      ) : (
        <div className="px-4 pb-3 pt-2 border-t border-border mt-1">
          <p className="text-[11px] text-muted/60">
            Valuation bands require valid EPS and P/E — unavailable for {company.symbol}.
          </p>
        </div>
=======
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} className={toggleBtn(period === p.value, false)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overlay toggles */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[11px] text-muted mr-0.5">Overlays:</span>
        <button disabled={!bands} onClick={() => setShowFair(v => !v)} className={toggleBtn(showFair, !bands)}>
          {showFair && bands ? '✓ ' : ''}Fair value
        </button>
        <button disabled={!bands} onClick={() => setShowBands(v => !v)} className={toggleBtn(showBands, !bands)}>
          {showBands && bands ? '✓ ' : ''}P/E bands
        </button>
        <button onClick={() => setShow52(v => !v)} className={toggleBtn(show52, false)}>
          {show52 ? '✓ ' : ''}52W high/low
        </button>
      </div>

      {/* Drawing tools */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[11px] text-muted mr-0.5">Draw:</span>
        <button onClick={() => setMode(m => (m === 'trend' ? 'none' : 'trend'))} className={toggleBtn(mode === 'trend', false)}>
          ╱ Trendline
        </button>
        <button onClick={() => setMode(m => (m === 'hori' ? 'none' : 'hori'))} className={toggleBtn(mode === 'hori', false)}>
          — Horizontal
        </button>
        <button
          onClick={clearDrawings}
          disabled={drawingsRef.current.length === 0}
          className={toggleBtn(false, drawingsRef.current.length === 0)}
        >
          ✕ Clear{drawingsRef.current.length ? ` (${drawingsRef.current.length})` : ''}
        </button>
        {mode !== 'none' && (
          <span className="text-[11px] text-accent">
            {mode === 'trend'
              ? (pendingRef.current ? 'click the end point…' : 'click the start point…')
              : 'click a price level…'}
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="relative">
        <div ref={containerRef} className="w-full" style={{ height: 380, cursor: mode !== 'none' ? 'crosshair' : 'default' }} />
        {loading && <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">Loading price history…</div>}
        {!loading && error && <div className="absolute inset-0 flex items-center justify-center text-xs text-muted text-center px-6">{error}</div>}
      </div>

      {bands && (
        <p className="text-[11px] text-muted leading-relaxed">
          Fair value = the stock&apos;s median P/E ({peStats?.median.toFixed(1)}x) × current EPS.
          Cheap / pricey bands use the 25th / 75th percentile P/E from its own price history.
          A quick &ldquo;rich or cheap vs its past&rdquo; gauge — not a forecast.
        </p>
>>>>>>> Stashed changes
      )}

    </div>
  );
}
