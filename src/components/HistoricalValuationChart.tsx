'use client';

import { useEffect, useState, useMemo } from 'react';
import { Company } from '@/lib/types';
import { getSectorProfile } from '@/lib/sectorModelMap';

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
  values, dates, stats, currentVal, label, color,
}: {
  values: (number | null)[];
  dates: string[];
  stats: ValStats;
  currentVal: number;
  label: string;
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
  const zone   = pctile >= 75 ? { label: 'Expensive',    cls: 'text-loss'  }
               : pctile >= 50 ? { label: 'Above median', cls: 'text-gold'  }
               : pctile >= 25 ? { label: 'Below median', cls: 'text-gain'  }
               :                { label: 'Historically cheap', cls: 'text-gain' };

  // X-axis tick labels (first, mid, last)
  const tickIdxs = [0, Math.floor(n / 2), n - 1];

  return (
    <div>
      {/* Stats row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 text-[11px] text-muted font-mono">
          <span>Min <span className="text-primary">{stats.min.toFixed(1)}x</span></span>
          <span>Median <span className="text-primary">{stats.median.toFixed(1)}x</span></span>
          <span>Max <span className="text-primary">{stats.max.toFixed(1)}x</span></span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-muted">Current </span>
          <span className={`text-[11px] font-bold font-mono ${zone.cls}`}>
            {currentVal > 0 ? `${currentVal.toFixed(1)}x` : '—'}
          </span>
          <span className={`text-[10px] ml-1.5 ${zone.cls}`}>({zone.label})</span>
        </div>
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
          stroke="#0f2d18" strokeWidth="0.6" strokeDasharray="2 4" />
        <line x1={PAD.l} y1={yMax_px} x2={PAD.l + innerW} y2={yMax_px}
          stroke="#0f2d18" strokeWidth="0.6" strokeDasharray="2 4" />

        {/* Y-axis labels */}
        {[stats.min, stats.median, stats.max].map((v, i) => (
          <text
            key={i}
            x={PAD.l - 4}
            y={yOf(v) + 3}
            textAnchor="end"
            fontSize="8"
            fill="#6ee7b7"
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
            fill="#6ee7b7"
            fontFamily="JetBrains Mono, monospace"
          >
            {validPairs[idx]?.d.slice(0, 7) || ''}
          </text>
        ))}
      </svg>

      {/* Percentile bar */}
      <div className="mt-2">
        <div className="flex justify-between text-[10px] text-muted mb-0.5">
          <span>Historically cheap</span>
          <span>{pctile}th percentile</span>
          <span>Historically expensive</span>
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

  const profile = getSectorProfile(company.sector);
  // Banks/NBFCs → default to P/B; others → P/E
  const defaultMetric: 'pe' | 'pb' = profile.model === 'pb' ? 'pb' : 'pe';

  useEffect(() => {
    setActiveMetric(defaultMetric);
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/historical/${company.symbol}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.error || 'Failed'); }))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [company.symbol, defaultMetric]);

  const { peValues, pbValues, dates } = useMemo(() => {
    if (!data) return { peValues: [], pbValues: [], dates: [] };
    return {
      peValues: data.points.map(p => p.pe),
      pbValues: data.points.map(p => p.pb),
      dates:    data.points.map(p => p.date),
    };
  }, [data]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <h3 className="text-sm font-semibold text-primary">Historical Valuation</h3>
        </div>
        <div className="flex gap-1">
          {(['pe', 'pb'] as const).map(m => (
            <button
              key={m}
              onClick={() => setActiveMetric(m)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                activeMetric === m
                  ? 'bg-gold text-terminal'
                  : 'text-muted border border-border hover:text-primary'
              }`}
            >
              {m === 'pe' ? 'P/E' : 'P/B'}
            </button>
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
          <p className="text-[11px] text-muted mt-1">Historical data requires Render to be deployed with latest code</p>
        </div>
      )}

      {data && !loading && (
        <>
          {activeMetric === 'pe' && (
            <LineChart
              values={peValues}
              dates={dates}
              stats={data.stats.pe}
              currentVal={company.pe}
              label="P/E Ratio"
              color="#34d399"
            />
          )}
          {activeMetric === 'pb' && (
            <LineChart
              values={pbValues}
              dates={dates}
              stats={data.stats.pb}
              currentVal={company.pb}
              label="P/B Ratio"
              color="#3B82F6"
            />
          )}

          {/* Context blurb */}
          <div className="text-[11px] text-muted border-t border-border pt-3 space-y-1 leading-relaxed">
            <p>
              <span className="text-primary font-medium">Shaded band</span>
              {' '}= 25th–75th percentile range (middle half of historical values).
              Trading inside the band is considered normal for this stock.
            </p>
            <p>
              <span className="text-primary font-medium">Percentile bar</span>
              {' '}= where today's multiple sits vs the full 5-year range. Below 25th = historically cheap. Above 75th = historically expensive.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
