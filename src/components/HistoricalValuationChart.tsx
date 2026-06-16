'use client';

import { useEffect, useState, useMemo } from 'react';
import { Activity } from '@/lib/icons';
import { Company } from '@/lib/types';
import { getSectorProfile, getCompanyProfile } from '@/lib/sectorModelMap';
import Tooltip from '@/components/Tooltip';

interface DataPoint {
  date: string;
  price: number;
  pe: number | null;
  pb: number | null;
}

interface ValStats {
  min: number; max: number; median: number;
  p25: number; p75: number; mean: number;
}

interface HistoricalData {
  symbol: string;
  points: DataPoint[];
  stats: { pe: ValStats; pb: ValStats };
}

interface Props {
  company: Company;
}

// ─── SVG line chart ───────────────────────────────────────────────────────────
function LineChart({
  values, dates, stats, currentVal, color,
}: {
  values: (number | null)[];
  dates: string[];
  stats: ValStats;
  currentVal: number;
  color: string;
}) {
  const W = 560;
  const H = 120;
  const PAD = { t: 8, r: 8, b: 24, l: 36 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const validPairs = values
    .map((v, i) => ({ v, d: dates[i] }))
    .filter(x => x.v !== null && x.v !== undefined) as { v: number; d: string }[];

  if (validPairs.length < 3) return (
    <div className="flex items-center justify-center h-[120px] text-xs text-muted">
      Insufficient data
    </div>
  );

  // Y range — pad 10% above max and below min so lines don't clip edges
  const allV    = validPairs.map(x => x.v);
  const yMin    = Math.min(...allV) * 0.9;
  const yMax    = Math.max(...allV) * 1.1;
  const yRange  = yMax - yMin || 1;

  // X positions (evenly spaced by index across full width)
  const n = validPairs.length;
  function xOf(i: number) { return PAD.l + (i / (n - 1)) * innerW; }
  function yOf(v: number) { return PAD.t + (1 - (v - yMin) / yRange) * innerH; }

  // Build SVG path
  const pathD = validPairs
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(pt.v).toFixed(1)}`)
    .join(' ');

  // Band positions
  const yMedian = yOf(stats.median);
  const yP25    = yOf(stats.p25);
  const yP75    = yOf(stats.p75);
  const yMin_px = yOf(stats.min);
  const yMax_px = yOf(stats.max);

  // Current value position (last valid point)
  const curY = yOf(currentVal > 0 ? currentVal : validPairs[validPairs.length - 1].v);
  const curX = xOf(n - 1);

  // Percentile of current value
  const below  = allV.filter(v => v <= currentVal).length;
  const pctile = Math.round((below / allV.length) * 100);
  const zone   = currentVal <= 0 ? { label: 'N/A - loss-making', cls: 'text-muted' }
               : pctile >= 75 ? { label: 'Expensive',    cls: 'text-loss'  }
               : pctile >= 50 ? { label: 'Above median', cls: 'text-gold'  }
               : pctile >= 25 ? { label: 'Below median', cls: 'text-gain'  }
               :                { label: 'Cheap',        cls: 'text-gain'  };

  // X-axis tick labels (first, mid, last)
  const tickIdxs = [0, Math.floor(n / 2), n - 1];

  return (
    <div>
      {/* Row 1: Range stats */}
      <div className="flex items-center gap-3 text-[11px] text-muted font-mono mb-1">
        <span>Min <span className="text-primary font-semibold">{stats.min.toFixed(1)}x</span></span>
        <span className="text-border/60">·</span>
        <span>Median <span className="text-primary font-semibold">{stats.median.toFixed(1)}x</span></span>
        <span className="text-border/60">·</span>
        <span>Max <span className="text-primary font-semibold">{stats.max.toFixed(1)}x</span></span>
      </div>
      {/* Row 2: Current value — own line so it never overflows */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-muted">Current</span>
        <span className={`text-sm font-bold font-mono ${zone.cls}`}>
          {currentVal > 0 ? `${currentVal.toFixed(1)}x` : '—'}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
          zone.cls === 'text-gain' ? 'bg-gain/10 border-gain/30 text-gain'
          : zone.cls === 'text-loss' ? 'bg-loss/10 border-loss/30 text-loss'
          : 'bg-gold/10 border-gold/30 text-gold'
        }`}>{zone.label}</span>
      </div>

      {/* SVG chart */}
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible"
        preserveAspectRatio="none"
      >
        {/* P25–P75 band */}
        {yP25 < yP75 && (
          <rect
            x={PAD.l} y={yP75}
            width={innerW} height={yP25 - yP75}
            fill={color} fillOpacity="0.07"
          />
        )}

        {/* Median line */}
        <line
          x1={PAD.l} y1={yMedian} x2={PAD.l + innerW} y2={yMedian}
          stroke={color} strokeWidth="0.8" strokeDasharray="4 3" strokeOpacity="0.5"
        />

        {/* Min/Max lines */}
        <line x1={PAD.l} y1={yMin_px} x2={PAD.l + innerW} y2={yMin_px}
          stroke="rgb(var(--color-border))" strokeWidth="0.8" strokeDasharray="2 4" />
        <line x1={PAD.l} y1={yMax_px} x2={PAD.l + innerW} y2={yMax_px}
          stroke="rgb(var(--color-border))" strokeWidth="0.8" strokeDasharray="2 4" />

        {/* Y-axis labels */}
        {[stats.min, stats.median, stats.max].map((v, i) => (
          <text
            key={i}
            x={PAD.l - 4}
            y={yOf(v) + 3}
            textAnchor="end"
            fontSize="8"
            fill="rgb(var(--color-muted))"
            fontFamily="JetBrains Mono, monospace"
          >
            {v.toFixed(0)}
          </text>
        ))}

        {/* Main line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />

        {/* Fill under line */}
        <path
          d={`${pathD} L${xOf(n - 1).toFixed(1)},${(PAD.t + innerH).toFixed(1)} L${PAD.l},${(PAD.t + innerH).toFixed(1)} Z`}
          fill={color} fillOpacity="0.06"
        />

        {/* Current price dot */}
        {currentVal > 0 && (
          <circle cx={curX} cy={curY} r="3.5" fill={color} />
        )}

        {/* X-axis ticks */}
        {tickIdxs.map(idx => (
          <text
            key={idx}
            x={xOf(idx)}
            y={H - 4}
            textAnchor="middle"
            fontSize="8"
            fill="rgb(var(--color-muted))"
            fontFamily="JetBrains Mono, monospace"
          >
            {validPairs[idx]?.d.slice(0, 7) || ''}
          </text>
        ))}
      </svg>

      {/* Percentile bar */}
      <div className="mt-2">
        <div className="flex justify-between text-[10px] text-muted mb-0.5">
          <span className="text-gain/70">◀ Cheap</span>
          <span>{pctile}th %ile</span>
          <span className="text-loss/70">Pricey ▶</span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gain via-gold to-loss opacity-40 rounded-full" />
          <div
            className="absolute top-0 bottom-0 w-2 rounded-full -translate-x-1/2"
            style={{ left: `${pctile}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HistoricalValuationChart({ company }: Props) {
  const [data, setData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<'pe' | 'pb'>('pe');

  const profile = getCompanyProfile(company);
  // Banks/NBFCs → default to P/B; others → P/E
  const defaultMetric: 'pe' | 'pb' = profile.model === 'pb' ? 'pb' : 'pe';

  useEffect(() => {
    const controller = new AbortController();
    setActiveMetric(defaultMetric);
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/historical/${company.symbol}`, { cache: 'no-store', signal: controller.signal })
      .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.error || 'Failed'); }))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { if (e?.name !== 'AbortError') { setError(e.message); setLoading(false); } });

    return () => controller.abort();
  }, [company.symbol, defaultMetric]);

  const { peValues, pbValues, dates } = useMemo(() => {
    if (!data || !Array.isArray(data.points)) {
      return { peValues: [], pbValues: [], dates: [] };
    }
    return {
      peValues: data.points.map(p => p.pe),
      pbValues: data.points.map(p => p.pb),
      dates:    data.points.map(p => p.date),
    };
  }, [data]);

  // No 5-year history for this stock (e.g. small/new listings) — hide the whole
  // card rather than shouting a red error. Nothing to show, so show nothing.
  if (error) return null;

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Activity size={14} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Is it cheap vs its own history?</h3>
            <p className="text-[10px] text-muted mt-0.5">5-year valuation range</p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {(['pe', 'pb'] as const).map(m => (
            <span key={m} className="inline-flex items-center gap-0.5">
              <button
                onClick={() => setActiveMetric(m)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                  activeMetric === m
                    ? 'bg-gold text-terminal'
                    : 'text-muted border border-border hover:text-primary'
                }`}
              >
                {m === 'pe' ? 'P/E' : 'P/B'}
              </button>
              <Tooltip
                text={m === 'pe' ? 'Price ÷ Earnings — how much you pay for ₹1 of profit' : 'Price ÷ Book — how much you pay for ₹1 of net assets'}
                position="bottom"
              />
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-10 gap-2">
          <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted">Loading 5-year history…</span>
        </div>
      )}

      {error && (
        <div className="py-6 text-center">
          <p className="text-xs text-loss">{error}</p>
          <p className="text-[11px] text-muted mt-1">Historical data unavailable — check that the data server is running</p>
        </div>
      )}

      {data && data.stats && !loading && (
        <>
          {activeMetric === 'pe' && (
            <LineChart
              values={peValues}
              dates={dates}
              stats={data.stats.pe}
              currentVal={company.pe}

              color="#3b82f6"
            />
          )}
          {activeMetric === 'pb' && (
            <LineChart
              values={pbValues}
              dates={dates}
              stats={data.stats.pb}
              currentVal={company.pb}

              color="#3B82F6"
            />
          )}

          {/* Context blurb */}
          <div className="text-[11px] text-muted border-t border-border pt-3 space-y-1.5 leading-relaxed">
            <p>
              <span className="text-primary font-medium">Shaded zone</span>
              {' '}= the "normal" range for this stock over 5 years. If the line is inside the zone, it's trading normally.
            </p>
            <p>
              <span className="text-primary font-medium">Bar at the bottom</span>
              {' '}= where today's price sits vs history. Left (green) = cheap by its own standards. Right (red) = expensive vs its own history.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
