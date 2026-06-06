'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
} from 'lightweight-charts';
import { BarChart3 } from '@/lib/icons';
import { Company } from '@/lib/types';

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface PEStats {
  p25: number;
  median: number;
  p75: number;
}

interface Props {
  company: Company;
}

const PERIODS: { label: string; value: string }[] = [
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
  { label: '5Y', value: '5y' },
];

// Read a theme CSS variable (stored as "R G B") and return a canvas-safe color.
function cssColor(name: string, alpha = 1): string {
  let triplet = '136,136,136';
  if (typeof window !== 'undefined') {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v) triplet = v.replace(/\s+/g, ',');
  }
  return alpha >= 1 ? `rgb(${triplet})` : `rgba(${triplet},${alpha})`;
}

const inr = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n >= 100 ? 0 : 1 })}`;

export default function PriceChart({ company }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [peStats, setPeStats] = useState<PEStats | null>(null);
  const [period, setPeriod] = useState('2y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [themeTick, setThemeTick] = useState(0);

  const [showFair, setShowFair] = useState(true);
  const [showBands, setShowBands] = useState(true);
  const [show52, setShow52] = useState(false);

  // EPS used to translate P/E levels into price levels
  const eps = useMemo(() => {
    if (company.eps && company.eps > 0) return company.eps;
    if (company.pe > 0 && company.currentPrice > 0) return company.currentPrice / company.pe;
    return 0;
  }, [company.eps, company.pe, company.currentPrice]);

  const bands = useMemo(() => {
    if (!peStats || eps <= 0) return null;
    return {
      cheap: peStats.p25 * eps,
      fair: peStats.median * eps,
      expensive: peStats.p75 * eps,
    };
  }, [peStats, eps]);

  // ── Fetch candles + P/E history when the company or period changes ──────────
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/ohlc/${company.symbol}?period=${period}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('no-ohlc'))))
      .then(data => {
        const list: Candle[] = Array.isArray(data?.candles) ? data.candles : [];
        if (list.length === 0) throw new Error('empty');
        setCandles(list);
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          setCandles([]);
          setError('Price data unavailable for this stock right now.');
        }
      })
      .finally(() => setLoading(false));

    // P/E stats power the valuation bands — best-effort, non-blocking
    fetch(`/api/historical/${company.symbol}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const pe = data?.stats?.pe;
        if (pe && typeof pe.median === 'number') {
          setPeStats({ p25: pe.p25, median: pe.median, p75: pe.p75 });
        } else {
          setPeStats(null);
        }
      })
      .catch(() => setPeStats(null));

    return () => controller.abort();
  }, [company.symbol, period]);

  // ── Watch for light/dark theme changes so the chart recolors ────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const obs = new MutationObserver(() => setThemeTick(t => t + 1));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });
    return () => obs.disconnect();
  }, []);

  // ── Build / rebuild the chart ───────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el || candles.length === 0) return;

    const gridColor = cssColor('--color-border', 0.25);
    const textColor = cssColor('--color-muted');
    const gain = cssColor('--color-gain');
    const loss = cssColor('--color-loss');
    const gold = cssColor('--color-gold');

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontFamily: 'inherit',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor, timeVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addCandlestickSeries({
      upColor: gain,
      downColor: loss,
      borderUpColor: gain,
      borderDownColor: loss,
      wickUpColor: gain,
      wickDownColor: loss,
    });
    series.setData(candles as any);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    // Overlay lines
    const lines: IPriceLine[] = [];
    const addLine = (price: number, color: string, title: string, dashed = true) => {
      if (!Number.isFinite(price) || price <= 0) return;
      lines.push(
        series.createPriceLine({
          price,
          color,
          lineWidth: 2,
          lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
          axisLabelVisible: true,
          title,
        })
      );
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
    priceLinesRef.current = lines;

    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w) chart.applyOptions({ width: Math.floor(w) });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, [candles, showFair, showBands, show52, bands, company.week52High, company.week52Low, themeTick]);

  const last = candles.length ? candles[candles.length - 1].close : company.currentPrice;
  const gapToFair = bands && bands.fair > 0 ? (bands.fair / last - 1) * 100 : null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <BarChart3 size={14} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Price chart</h3>
            <p className="text-xs text-muted">
              {company.symbol} · daily candles
              {gapToFair !== null && (
                <span className={gapToFair >= 0 ? 'text-gain' : 'text-loss'}>
                  {' '}· {gapToFair >= 0 ? '+' : ''}{gapToFair.toFixed(0)}% to fair value
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'text-muted border border-border hover:text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overlay toggles */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { on: showFair, set: setShowFair, label: 'Fair value', disabled: !bands },
          { on: showBands, set: setShowBands, label: 'P/E bands', disabled: !bands },
          { on: show52, set: setShow52, label: '52W high/low', disabled: false },
        ].map(t => (
          <button
            key={t.label}
            disabled={t.disabled}
            onClick={() => t.set(v => !v)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              t.disabled
                ? 'text-muted/40 border border-border/50 cursor-not-allowed'
                : t.on
                ? 'bg-accent/10 text-accent border border-accent/30'
                : 'text-muted border border-border hover:text-primary'
            }`}
          >
            {t.on && !t.disabled ? '✓ ' : ''}{t.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="relative">
        <div ref={containerRef} className="w-full" style={{ height: 360 }} />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
            Loading price history…
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted text-center px-6">
            {error}
          </div>
        )}
      </div>

      {bands && (
        <p className="text-[11px] text-muted leading-relaxed">
          Fair value here = the stock&apos;s 5-year median P/E ({peStats?.median.toFixed(1)}x) × current EPS.
          Cheap/pricey bands use the 25th/75th percentile P/E. It&apos;s a quick &ldquo;is the price
          rich or cheap vs its own history&rdquo; gauge, not a forecast.
        </p>
      )}
    </div>
  );
}
