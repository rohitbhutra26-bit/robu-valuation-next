'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, TrendingUp, Search, AlertCircle, ChevronDown, ChevronUp, Zap } from '@/lib/icons';
import { staggerContainer, staggerItem, fadeUp, scaleIn } from '@/lib/animations';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScreenerResult {
  symbol: string;
  name: string;
  screenerSlug: string;
  price: number;
  marketCap: number;
  pe: number | null;
  roe: number;
  roce: number;
  netMargin: number;
  debtToEquity: number;
  revenueGrowth5Y: number;
  patGrowth5Y: number;
  dividendYield: number;
  promoterHolding: number;
  score: number;
}

interface Filters {
  minRoe: string;
  maxPe: string;
  minNetMargin: string;
  maxDebtEquity: string;
  minMarketCap: string;
  maxMarketCap: string;
  minRevGrowth: string;
  minRoce: string;
  sector: string;
  sortBy: string;
}

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESETS = [
  {
    label: 'Quality Compounders',
    emoji: '⚡',
    desc: 'High ROE, low debt, profitable',
    filters: { minRoe:'20', maxPe:'60', minNetMargin:'12', maxDebtEquity:'0.5',
                minMarketCap:'500', maxMarketCap:'9999999', minRevGrowth:'10', minRoce:'15', sector:'' },
  },
  {
    label: 'Value Picks',
    emoji: '💎',
    desc: 'Low P/E, decent returns',
    filters: { minRoe:'12', maxPe:'18', minNetMargin:'5', maxDebtEquity:'2',
                minMarketCap:'200', maxMarketCap:'9999999', minRevGrowth:'0', minRoce:'0', sector:'' },
  },
  {
    label: 'Debt-Free Growth',
    emoji: '🚀',
    desc: 'Zero debt, growing fast',
    filters: { minRoe:'15', maxPe:'9999', minNetMargin:'8', maxDebtEquity:'0.1',
                minMarketCap:'100', maxMarketCap:'9999999', minRevGrowth:'15', minRoce:'20', sector:'' },
  },
  {
    label: 'Large Cap Stalwarts',
    emoji: '🏛️',
    desc: 'Blue chips, Nifty-scale',
    filters: { minRoe:'15', maxPe:'40', minNetMargin:'10', maxDebtEquity:'1',
                minMarketCap:'20000', maxMarketCap:'9999999', minRevGrowth:'5', minRoce:'12', sector:'' },
  },
  {
    label: 'Small Cap Gems',
    emoji: '💡',
    desc: 'Small-cap, high growth',
    filters: { minRoe:'18', maxPe:'50', minNetMargin:'8', maxDebtEquity:'0.5',
                minMarketCap:'100', maxMarketCap:'5000', minRevGrowth:'20', minRoce:'18', sector:'' },
  },
  {
    label: 'Dividend Harvest',
    emoji: '💰',
    desc: 'Consistent dividend payers',
    filters: { minRoe:'12', maxPe:'30', minNetMargin:'8', maxDebtEquity:'1.5',
                minMarketCap:'1000', maxMarketCap:'9999999', minRevGrowth:'0', minRoce:'12', sector:'' },
  },
] as const;

const DEFAULT_FILTERS: Filters = {
  minRoe: '', maxPe: '', minNetMargin: '', maxDebtEquity: '',
  minMarketCap: '', maxMarketCap: '', minRevGrowth: '', minRoce: '',
  sector: '', sortBy: 'Market Capitalization',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCap(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L Cr`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K Cr`;
  return `₹${n.toLocaleString('en-IN')} Cr`;
}

function FilterInput({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] text-muted mb-1 block">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Any'}
        className="w-full bg-border/30 border border-border rounded-lg px-2.5 py-2 text-sm font-mono text-primary focus:outline-none focus:border-accent"
      />
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function SkeletonRow({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.4, repeat: Infinity, delay, ease: 'easeInOut' }}
      className="flex items-center gap-4 px-4 py-3 border-b border-border/30"
    >
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 w-16 bg-border/60 rounded" />
        <div className="h-2 w-36 bg-border/40 rounded" />
      </div>
      <div className="h-3 w-20 bg-border/50 rounded" />
      <div className="hidden sm:block h-3 w-10 bg-border/40 rounded" />
      <div className="hidden sm:block h-3 w-10 bg-border/40 rounded" />
      <div className="hidden sm:block h-3 w-10 bg-border/40 rounded" />
      <div className="hidden sm:block h-3 w-8 bg-border/40 rounded" />
    </motion.div>
  );
}

// ── Quality bar ───────────────────────────────────────────────────────────────
function QualityBar({ score }: { score: number }) {
  const color = score >= 70 ? 'rgb(var(--color-gain))' : score >= 50 ? 'rgb(var(--color-gold))' : 'rgb(var(--color-muted))';
  const pct = Math.min(100, score);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-border/40 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="text-[9px] font-bold font-mono" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface StockScreenerProps {
  onSelectSymbol: (symbol: string) => void;
}

export default function StockScreener({ onSelectSymbol }: StockScreenerProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [sortCol, setSortCol] = useState<keyof ScreenerResult>('score');
  const [sortAsc, setSortAsc] = useState(false);

  function setF(key: keyof Filters, val: string) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  function applyPreset(preset: typeof PRESETS[number]) {
    setFilters(f => ({ ...f, ...preset.filters }));
  }

  async function runScreener() {
    setLoading(true);
    setError(null);
    setHasRun(true);
    setShowFilters(false);

    const params = new URLSearchParams({ limit: '60' });
    if (filters.minRoe)       params.set('min_roe',         filters.minRoe);
    if (filters.maxPe)        params.set('max_pe',          filters.maxPe);
    if (filters.minNetMargin) params.set('min_net_margin',  filters.minNetMargin);
    if (filters.maxDebtEquity)params.set('max_debt_equity', filters.maxDebtEquity);
    if (filters.minMarketCap) params.set('min_market_cap',  filters.minMarketCap);
    if (filters.maxMarketCap && filters.maxMarketCap !== '9999999')
                              params.set('max_market_cap',  filters.maxMarketCap);
    if (filters.minRevGrowth) params.set('min_rev_growth',  filters.minRevGrowth);
    if (filters.minRoce)      params.set('min_roce',        filters.minRoce);
    if (filters.sector)       params.set('sector',          filters.sector);
    if (filters.sortBy)       params.set('sort_by',         filters.sortBy);

    try {
      const res = await fetch(`/api/screener-v2?${params}`);
      if (res.status === 503) {
        // Cache still warming up on server — retry after 8 seconds
        setError('⏳ Stock data is loading on the server (first start takes ~60s). Retrying automatically…');
        setResults([]);
        setLoading(false);
        setTimeout(() => { runScreener(); }, 8000);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Error ${res.status}`);
      }
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Screener failed');
      setResults([]);
    }
    setLoading(false);
  }

  function handleClickResult(r: ScreenerResult) {
    // Use NSE symbol for company lookup (maps to NSE Bhavcopy + Screener data)
    // screenerSlug is kept for display only — NSE symbol is the reliable lookup key
    const sym = r.symbol || r.screenerSlug;
    onSelectSymbol(sym);
  }

  function toggleSort(col: keyof ScreenerResult) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
  }

  const sorted = [...results].sort((a, b) => {
    const va = (a[sortCol] as number) ?? 0;
    const vb = (b[sortCol] as number) ?? 0;
    return sortAsc ? va - vb : vb - va;
  });

  const activeFilterCount = [
    filters.minRoe, filters.maxPe, filters.minNetMargin, filters.maxDebtEquity,
    filters.minMarketCap, filters.maxMarketCap, filters.minRevGrowth, filters.minRoce, filters.sector,
  ].filter(v => v && v !== '9999999' && v !== '9999').length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">

      {/* ── Header ── */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="visible"
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
            <Filter size={15} className="text-accent" />
          </div>
          <div>
            <h2 className="text-base font-bold text-primary">Stock Screener</h2>
            <p className="text-[11px] text-muted">Filter all NSE stocks by metrics · powered by Screener.in</p>
          </div>
        </div>
        {hasRun && (
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-primary px-3 py-1.5 rounded-lg border border-border hover:border-accent/30 transition-all flex-shrink-0"
          >
            <Filter size={11} />
            Filters
            {activeFilterCount > 0 && (
              <span className="text-[9px] font-bold bg-accent text-terminal px-1 rounded">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
      </motion.div>

      {/* ── Presets ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            key="presets"
            variants={fadeUp} initial="hidden" animate="visible" exit="exit"
          >
            <p className="text-[10px] text-muted uppercase tracking-wide mb-2">Quick Presets</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {PRESETS.map((p, i) => (
                <motion.button
                  key={p.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => applyPreset(p)}
                  whileHover={{ y: -2 }}
                  className="flex-shrink-0 text-left bg-card border border-border rounded-xl px-3 py-2.5 hover:border-accent/40 transition-colors min-w-[130px]"
                >
                  <p className="text-sm mb-0.5">{p.emoji} <span className="text-[11px] font-bold text-primary">{p.label}</span></p>
                  <p className="text-[10px] text-muted leading-snug">{p.desc}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter panel ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            key="filterpanel"
            variants={scaleIn} initial="hidden" animate="visible" exit="exit"
            className="bg-card border border-border rounded-xl p-4 space-y-4"
          >
            <p className="text-xs font-semibold text-primary">
              Filters <span className="text-muted font-normal">(leave blank = no limit)</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FilterInput label="Min ROE %"             value={filters.minRoe}        onChange={v => setF('minRoe', v)}        placeholder="e.g. 15" />
              <FilterInput label="Max P/E"               value={filters.maxPe}         onChange={v => setF('maxPe', v)}         placeholder="e.g. 40" />
              <FilterInput label="Min Net Margin %"      value={filters.minNetMargin}  onChange={v => setF('minNetMargin', v)}  placeholder="e.g. 8" />
              <FilterInput label="Max Debt/Equity"       value={filters.maxDebtEquity} onChange={v => setF('maxDebtEquity', v)} placeholder="e.g. 1" />
              <FilterInput label="Min ROCE %"            value={filters.minRoce}       onChange={v => setF('minRoce', v)}       placeholder="e.g. 15" />
              <FilterInput label="Min 5Y Rev Growth %"   value={filters.minRevGrowth}  onChange={v => setF('minRevGrowth', v)}  placeholder="e.g. 10" />
              <FilterInput label="Min Mkt Cap (₹ Cr)"   value={filters.minMarketCap}  onChange={v => setF('minMarketCap', v)}  placeholder="e.g. 500" />
              <FilterInput label="Max Mkt Cap (₹ Cr)"   value={filters.maxMarketCap}  onChange={v => setF('maxMarketCap', v)}  placeholder="e.g. 50000" />
            </div>

            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="text-[10px] text-muted mb-1 block">Sector (optional)</label>
                <input
                  type="text" value={filters.sector}
                  onChange={e => setF('sector', e.target.value)}
                  placeholder="e.g. Technology, Banking, Pharma"
                  className="w-full bg-border/30 border border-border rounded-lg px-2.5 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted mb-1 block">Sort by</label>
                <select
                  value={filters.sortBy}
                  onChange={e => setF('sortBy', e.target.value)}
                  className="bg-border/30 border border-border rounded-lg px-2.5 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                >
                  <option value="Market Capitalization">Market Cap</option>
                  <option value="Return on equity">ROE</option>
                  <option value="Price to Earning">P/E</option>
                  <option value="Net profit margin">Net Margin</option>
                  <option value="Sales growth 5Years">5Y Rev Growth</option>
                  <option value="Return on capital employed">ROCE</option>
                </select>
              </div>
            </div>

            <motion.button
              onClick={runScreener}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-sm font-bold bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  Screening all NSE stocks…
                </>
              ) : (
                <><Zap size={14} /> Run Screen</>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Re-run button (when filters hidden) ── */}
      {hasRun && !showFilters && (
        <button
          onClick={runScreener}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-xs font-bold bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading
            ? <><div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" /> Screening…</>
            : <><Zap size={12} /> Re-run Screen</>}
        </button>
      )}

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            variants={scaleIn} initial="hidden" animate="visible" exit="exit"
            className="flex gap-3 p-3.5 bg-loss/5 border border-loss/20 rounded-xl"
          >
            <AlertCircle size={15} className="text-loss flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-loss mb-0.5">Screener error</p>
              <p className="text-[11px] text-muted leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading skeleton ── */}
      {loading && (
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map((d, i) => (
            <SkeletonRow key={i} delay={d} />
          ))}
        </motion.div>
      )}

      {/* ── Results ── */}
      {hasRun && !loading && !error && sorted.length > 0 && (
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-primary">
              {sorted.length} stocks found
              <span className="text-muted font-normal text-xs ml-1">· click any row to analyse</span>
            </p>
            <p className="text-[10px] text-muted">Screener.in</p>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden screener-table-wrap">
            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[1fr_90px_52px_56px_60px_50px_80px] gap-x-3 px-4 py-2 bg-border/20 border-b border-border min-w-[530px]">
              {[
                { label: 'Company',    col: null },
                { label: 'Mkt Cap',    col: 'marketCap'    as keyof ScreenerResult },
                { label: 'P/E',        col: 'pe'           as keyof ScreenerResult },
                { label: 'ROE',        col: 'roe'          as keyof ScreenerResult },
                { label: 'Margin',     col: 'netMargin'    as keyof ScreenerResult },
                { label: 'D/E',        col: 'debtToEquity' as keyof ScreenerResult },
                { label: 'Quality',    col: 'score'        as keyof ScreenerResult },
              ].map(({ label, col }) =>
                col ? (
                  <button
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="text-right text-[9px] text-muted uppercase tracking-wide hover:text-primary flex items-center justify-end gap-0.5"
                  >
                    {label} {sortCol === col ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                ) : (
                  <span key={label} className="text-[9px] text-muted uppercase tracking-wide">{label}</span>
                )
              )}
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="divide-y divide-border/30"
            >
              {sorted.map((r, idx) => {
                const deColor     = r.debtToEquity < 0.5 ? 'text-gain' : r.debtToEquity < 1.5 ? 'text-gold' : 'text-loss';
                const roeColor    = r.roe >= 20 ? 'text-gain' : r.roe >= 12 ? 'text-gold' : 'text-loss';
                const marginColor = r.netMargin >= 15 ? 'text-gain' : r.netMargin >= 8 ? 'text-gold' : 'text-loss';
                const peColor     = r.pe && r.pe < 20 ? 'text-gain' : r.pe && r.pe < 40 ? 'text-gold' : 'text-muted';

                return (
                  <motion.button
                    key={`${r.screenerSlug || r.symbol}-${idx}`}
                    variants={staggerItem}
                    onClick={() => handleClickResult(r)}
                    whileHover={{ backgroundColor: 'rgb(var(--color-border) / 0.12)' }}
                    className="w-full text-left transition-colors active:scale-[0.998]"
                  >
                    {/* Desktop row */}
                    <div className="hidden sm:grid grid-cols-[1fr_90px_52px_56px_60px_50px_80px] gap-x-3 px-4 py-3 items-center min-w-[530px]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold font-mono text-gold">{r.screenerSlug || r.symbol}</span>
                          {r.dividendYield > 1 && (
                            <span className="text-[8px] bg-gold/10 text-gold border border-gold/20 rounded px-1 py-0.5">DIV</span>
                          )}
                        </div>
                        <p className="text-xs text-primary truncate mt-0.5">{r.name}</p>
                        <p className="text-[9px] text-muted font-mono">
                          ₹{r.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          {r.revenueGrowth5Y !== 0 && (
                            <span className={r.revenueGrowth5Y > 0 ? ' text-gain' : ' text-loss'}>
                              {' '}· {r.revenueGrowth5Y > 0 ? '+' : ''}{r.revenueGrowth5Y.toFixed(0)}% 5Y
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-primary">{fmtCap(r.marketCap)}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[11px] font-bold font-mono ${peColor}`}>{r.pe ? r.pe.toFixed(1) : '—'}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[11px] font-bold font-mono ${roeColor}`}>{r.roe.toFixed(1)}%</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[11px] font-bold font-mono ${marginColor}`}>{r.netMargin.toFixed(1)}%</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[11px] font-bold font-mono ${deColor}`}>{r.debtToEquity.toFixed(1)}x</span>
                      </div>
                      <div className="min-w-0">
                        <QualityBar score={r.score} />
                      </div>
                    </div>

                    {/* Mobile card row */}
                    <div className="sm:hidden px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-gold">{r.screenerSlug || r.symbol}</span>
                            {r.dividendYield > 1 && (
                              <span className="text-[8px] bg-gold/10 text-gold border border-gold/20 rounded px-1">DIV</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-primary truncate mt-0.5">{r.name}</p>
                          <p className="text-[10px] text-muted mt-0.5">{fmtCap(r.marketCap)}</p>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                          <p className="text-sm font-bold font-mono text-primary">
                            ₹{r.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-[10px] text-muted font-mono">{r.pe ? `PE ${r.pe.toFixed(1)}x` : ''}</p>
                          <span style={{ color:'rgba(var(--color-muted)/0.4)', fontSize:12 }}>›</span>
                        </div>
                      </div>
                      <div className="mt-2.5 space-y-1.5">
                        <QualityBar score={r.score} />
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          <div className="text-center">
                            <p className="text-[8px] text-muted">ROE</p>
                            <p className={`text-[10px] font-bold font-mono ${roeColor}`}>{r.roe.toFixed(1)}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[8px] text-muted">ROCE</p>
                            <p className="text-[10px] font-bold font-mono text-primary">{r.roce > 0 ? `${r.roce.toFixed(1)}%` : '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[8px] text-muted">Margin</p>
                            <p className={`text-[10px] font-bold font-mono ${marginColor}`}>{r.netMargin.toFixed(1)}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[8px] text-muted">D/E</p>
                            <p className={`text-[10px] font-bold font-mono ${deColor}`}>{r.debtToEquity.toFixed(1)}x</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>

            <div className="px-4 py-2.5 border-t border-border/50 bg-border/5">
              <p className="text-[10px] text-muted">{sorted.length} results · Click any row to open full analysis</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── No results ── */}
      <AnimatePresence>
        {hasRun && !loading && !error && sorted.length === 0 && (
          <motion.div
            variants={scaleIn} initial="hidden" animate="visible" exit="exit"
            className="text-center py-12"
          >
            <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
              <Search size={20} className="text-muted/40" />
            </div>
            <p className="text-sm font-medium text-primary mb-1">No matches</p>
            <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
              Try relaxing your filters — raise the Max P/E, lower the Min ROE, or remove the Market Cap limit.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Initial empty state ── */}
      {!hasRun && (
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="text-center py-16"
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4"
          >
            <TrendingUp size={22} className="text-accent" />
          </motion.div>
          <p className="text-sm font-semibold text-primary mb-1">Screen all NSE stocks</p>
          <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
            Pick a preset or set your own filters, then hit Run Screen to scan the entire NSE universe for matching stocks.
          </p>
        </motion.div>
      )}
    </div>
  );
}
