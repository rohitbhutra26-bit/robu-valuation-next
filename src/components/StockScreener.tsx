'use client';

import { useState } from 'react';
import { Filter, TrendingUp, Search, AlertCircle } from '@/lib/icons';

interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  marketCap: number;
  pe: number | null;
  roe: number;
  debtToEquity: number;
  netMargin: number;
  score: number;
}

interface FilterState {
  minRoe: string;
  maxPe: string;
  minNetMargin: string;
  maxDebtEquity: string;
  sector: string;
}

const PRESETS: { label: string; desc: string; filters: FilterState }[] = [
  {
    label: 'Quality Compounders',
    desc: 'High ROE, profitable, low debt',
    filters: { minRoe: '20', maxPe: '50', minNetMargin: '10', maxDebtEquity: '1', sector: '' },
  },
  {
    label: 'Value Picks',
    desc: 'Low P/E, decent ROE',
    filters: { minRoe: '12', maxPe: '20', minNetMargin: '5', maxDebtEquity: '2', sector: '' },
  },
  {
    label: 'Debt-Free Growth',
    desc: 'Zero debt, growing margins',
    filters: { minRoe: '15', maxPe: '60', minNetMargin: '8', maxDebtEquity: '0.3', sector: '' },
  },
  {
    label: 'High ROE Giants',
    desc: 'ROE > 25%, established',
    filters: { minRoe: '25', maxPe: '9999', minNetMargin: '0', maxDebtEquity: '9999', sector: '' },
  },
];

function fmt(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L Cr`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K Cr`;
  return `₹${n.toLocaleString('en-IN')} Cr`;
}

interface StockScreenerProps {
  onSelectSymbol: (symbol: string) => void;
}

export default function StockScreener({ onSelectSymbol }: StockScreenerProps) {
  const [filters, setFilters] = useState<FilterState>({
    minRoe: '15', maxPe: '40', minNetMargin: '8', maxDebtEquity: '2', sector: '',
  });
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(false);

  function setFilter(key: keyof FilterState, val: string) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  async function runScreener() {
    setLoading(true);
    setError(false);
    setHasSearched(true);

    const params = new URLSearchParams({
      min_roe:         filters.minRoe      || '0',
      max_pe:          filters.maxPe       || '9999',
      min_net_margin:  filters.minNetMargin || '-999',
      max_debt_equity: filters.maxDebtEquity || '9999',
      sector:          filters.sector || '',
      limit:           '30',
    });

    try {
      const res = await fetch(`/api/screener?${params}`);
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
      setResults([]);
    }

    setLoading(false);
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setFilters(preset.filters);
    setHasSearched(false);
    setResults([]);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Filter size={14} className="text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-primary">Stock Screener</h3>
          <p className="text-[10px] text-muted mt-0.5">Filter stocks from recently viewed universe</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-accent/5 border border-accent/20 rounded-xl">
        <AlertCircle size={12} className="text-accent flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted/80 leading-relaxed">
          Screener runs over stocks <span className="text-accent font-medium">already viewed</span> in this session.
          The more stocks you search, the richer the results. Full universe screener coming soon.
        </p>
      </div>

      {/* Quick presets */}
      <div>
        <p className="text-[10px] text-muted uppercase tracking-wider mb-2 font-semibold">Quick filters</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="text-left px-3 py-2.5 rounded-xl border border-border hover:border-accent/40 hover:bg-accent/5 transition-all"
            >
              <p className="text-xs font-semibold text-primary">{p.label}</p>
              <p className="text-[10px] text-muted mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filter inputs */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-primary">Custom filters</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted mb-1 block">Min ROE (%)</label>
            <input
              type="number" value={filters.minRoe} min="0" step="1"
              onChange={e => setFilter('minRoe', e.target.value)}
              placeholder="e.g. 15"
              className="w-full bg-border/30 border border-border rounded-lg px-2.5 py-2 text-sm font-mono text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted mb-1 block">Max P/E</label>
            <input
              type="number" value={filters.maxPe} min="0" step="1"
              onChange={e => setFilter('maxPe', e.target.value)}
              placeholder="e.g. 40"
              className="w-full bg-border/30 border border-border rounded-lg px-2.5 py-2 text-sm font-mono text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted mb-1 block">Min Net Margin (%)</label>
            <input
              type="number" value={filters.minNetMargin} step="1"
              onChange={e => setFilter('minNetMargin', e.target.value)}
              placeholder="e.g. 8"
              className="w-full bg-border/30 border border-border rounded-lg px-2.5 py-2 text-sm font-mono text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted mb-1 block">Max Debt/Equity</label>
            <input
              type="number" value={filters.maxDebtEquity} min="0" step="0.1"
              onChange={e => setFilter('maxDebtEquity', e.target.value)}
              placeholder="e.g. 1"
              className="w-full bg-border/30 border border-border rounded-lg px-2.5 py-2 text-sm font-mono text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted mb-1 block">Sector (optional)</label>
          <input
            type="text" value={filters.sector}
            onChange={e => setFilter('sector', e.target.value)}
            placeholder="e.g. IT, Banking, Pharma…"
            className="w-full bg-border/30 border border-border rounded-lg px-2.5 py-2 text-sm text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <button
          onClick={runScreener}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-bold bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              Screening…
            </>
          ) : (
            <>
              <Search size={13} />
              Run Screen
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {hasSearched && !loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">
              {results.length > 0 ? `${results.length} stocks found` : 'No stocks match'}
            </p>
            {results.length > 0 && (
              <p className="text-[10px] text-muted">Sorted by quality score</p>
            )}
          </div>

          {error && (
            <p className="text-xs text-muted text-center py-4">
              Screener unavailable — search more stocks first to populate the cache.
            </p>
          )}

          {results.length === 0 && !error && (
            <div className="text-center py-8">
              <p className="text-sm text-muted">No stocks match these criteria yet.</p>
              <p className="text-[11px] text-muted/60 mt-1">
                Try relaxing the filters, or search more stocks to build the screener database.
              </p>
            </div>
          )}

          {results.map(r => {
            const scoreColor =
              r.score >= 70 ? 'text-gain bg-gain/10 border-gain/20' :
              r.score >= 50 ? 'text-gold bg-gold/10 border-gold/20' :
                              'text-muted bg-border border-border';
            return (
              <button
                key={r.symbol}
                onClick={() => onSelectSymbol(r.symbol)}
                className="w-full text-left bg-card border border-border rounded-xl p-3.5 hover:border-accent/40 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-gold">{r.symbol}</span>
                      <span className="text-[10px] text-muted bg-border/60 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                        {r.sector}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-primary mt-0.5 truncate">{r.name}</p>
                    <p className="text-[10px] text-muted mt-1 font-mono">{fmt(r.marketCap)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold font-mono text-primary">
                      ₹{r.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 justify-end flex-wrap">
                      {r.pe && <span className="text-[9px] font-mono text-muted">PE {r.pe.toFixed(1)}x</span>}
                      <span className="text-[9px] font-mono text-muted">ROE {r.roe.toFixed(1)}%</span>
                    </div>
                    <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${scoreColor}`}>
                      {r.score}/100
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-border/40">
                  <div className="text-center">
                    <p className="text-[9px] text-muted">ROE</p>
                    <p className={`text-[11px] font-bold font-mono ${r.roe >= 20 ? 'text-gain' : r.roe >= 12 ? 'text-gold' : 'text-loss'}`}>
                      {r.roe.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted">Net Margin</p>
                    <p className="text-[11px] font-bold font-mono text-primary">{r.netMargin.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted">D/E</p>
                    <p className={`text-[11px] font-bold font-mono ${r.debtToEquity < 0.5 ? 'text-gain' : r.debtToEquity < 1.5 ? 'text-gold' : 'text-loss'}`}>
                      {r.debtToEquity.toFixed(2)}x
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
