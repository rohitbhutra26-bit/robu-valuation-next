'use client';

import { useState, useEffect } from 'react';
import {
  getPortfolio, removeFromPortfolio, updatePortfolioEntry, PortfolioEntry,
} from '@/lib/portfolio';
import { Briefcase, Trash2, AlertCircle, TrendingUp, TrendingDown, Minus, RefreshCw, Edit2, Check, X } from '@/lib/icons';

interface LiveData {
  currentPrice: number;
  fairValue: number;
  upside: number;
  loading: boolean;
  error: boolean;
}

interface PortfolioViewProps {
  onSelectSymbol: (symbol: string) => void;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h >= 1) return `${h}h ago`;
  return 'just now';
}

function fmt(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

// ── Editable row for buy price / qty ─────────────────────────────────────────
function EditRow({
  entry, onSave, onCancel,
}: { entry: PortfolioEntry; onSave: (bp: number, qty: number) => void; onCancel: () => void }) {
  const [bp, setBp] = useState(entry.buyPrice.toString());
  const [qty, setQty] = useState(entry.qty.toString());

  function save() {
    const bpN = parseFloat(bp);
    const qtyN = parseFloat(qty);
    if (bpN > 0 && qtyN > 0) onSave(bpN, qtyN);
  }

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted">Buy ₹</span>
        <input
          type="number" value={bp} min="0.01" step="0.01"
          onChange={e => setBp(e.target.value)}
          className="w-24 text-xs font-mono bg-border/30 border border-border rounded px-2 py-1 text-primary focus:outline-none focus:border-gold"
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted">Qty</span>
        <input
          type="number" value={qty} min="1" step="1"
          onChange={e => setQty(e.target.value)}
          className="w-20 text-xs font-mono bg-border/30 border border-border rounded px-2 py-1 text-primary focus:outline-none focus:border-gold"
        />
      </div>
      <button onClick={save} className="flex items-center gap-1 px-2 py-1 rounded bg-gain/10 border border-gain/30 text-gain text-xs">
        <Check size={11} /> Save
      </button>
      <button onClick={onCancel} className="flex items-center gap-1 px-2 py-1 rounded bg-border text-muted text-xs">
        <X size={11} /> Cancel
      </button>
    </div>
  );
}

// ── Single holding row ────────────────────────────────────────────────────────
function HoldingRow({
  entry, live, onSelect, onRemove, onUpdate,
}: {
  entry: PortfolioEntry;
  live: LiveData;
  onSelect: () => void;
  onRemove: () => void;
  onUpdate: (bp: number, qty: number) => void;
}) {
  const [editing, setEditing] = useState(false);

  const invested = entry.buyPrice * entry.qty;
  const currentVal = live.currentPrice > 0 ? live.currentPrice * entry.qty : 0;
  const pnl = currentVal - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const isUp = pnl >= 0;

  // Valuation signal vs fair value
  const valuationSignal =
    live.upside >= 20  ? { text: 'Undervalued', cls: 'text-gain bg-gain/10 border-gain/20',  Icon: TrendingDown } :
    live.upside <= -20 ? { text: 'Overvalued',  cls: 'text-loss bg-loss/10 border-loss/20',  Icon: TrendingUp  } :
                         { text: 'Fair Value',  cls: 'text-gold bg-gold/10 border-gold/20',  Icon: Minus       };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Top row: symbol + name + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-gold bg-gold/10 border border-gold/30 px-2 py-0.5 rounded">
              {entry.symbol}
            </span>
            <span className="text-[10px] text-muted bg-border px-1.5 py-0.5 rounded truncate max-w-[140px]">
              {entry.sector}
            </span>
          </div>
          <p className="text-sm font-semibold text-primary mt-1 truncate">{entry.name}</p>
          <p className="text-[10px] text-muted/60 mt-0.5">Added {timeAgo(entry.addedAt)}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setEditing(v => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted/50 hover:text-gold hover:bg-gold/10 border border-transparent hover:border-gold/20 transition-all"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted/50 hover:text-loss hover:bg-loss/10 border border-transparent hover:border-loss/20 transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Edit row */}
      {editing && (
        <EditRow
          entry={entry}
          onSave={(bp, qty) => { onUpdate(bp, qty); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* P&L section */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-border/20 rounded-lg p-2.5">
          <p className="text-[10px] text-muted mb-0.5">Invested</p>
          <p className="text-sm font-bold font-mono text-primary">{fmt(invested)}</p>
          <p className="text-[10px] text-muted mt-0.5">
            {entry.qty} shares @ ₹{entry.buyPrice.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-border/20 rounded-lg p-2.5">
          <p className="text-[10px] text-muted mb-0.5">Current Value</p>
          {live.loading ? (
            <div className="h-5 w-16 bg-border/50 rounded animate-pulse" />
          ) : live.error ? (
            <p className="text-xs text-muted/50">—</p>
          ) : (
            <>
              <p className="text-sm font-bold font-mono text-primary">{fmt(currentVal)}</p>
              <p className={`text-[10px] font-semibold font-mono mt-0.5 ${isUp ? 'text-gain' : 'text-loss'}`}>
                {isUp ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                {' '}({isUp ? '+' : ''}{pnlPct.toFixed(1)}%)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Fair value signal */}
      {!live.loading && !live.error && live.fairValue > 0 && (
        <div className={`flex items-center justify-between rounded-lg px-3 py-2 border text-[11px] ${valuationSignal.cls}`}>
          <div className="flex items-center gap-1.5">
            <valuationSignal.Icon size={12} className="flex-shrink-0" />
            <span className="font-semibold">{valuationSignal.text}</span>
          </div>
          <div className="text-right">
            <span className="font-mono">Fair ₹{live.fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span className="ml-1 opacity-70">({live.upside >= 0 ? '+' : ''}{live.upside.toFixed(1)}%)</span>
          </div>
        </div>
      )}

      {/* Current price chip */}
      {!live.loading && !live.error && live.currentPrice > 0 && (
        <p className="text-[10px] text-muted text-right font-mono">
          CMP ₹{live.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </p>
      )}
    </div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────
function SummaryBar({ portfolio, liveMap }: { portfolio: PortfolioEntry[]; liveMap: Record<string, LiveData> }) {
  let totalInvested = 0;
  let totalCurrent = 0;
  let loaded = 0;

  for (const e of portfolio) {
    totalInvested += e.buyPrice * e.qty;
    const live = liveMap[e.symbol];
    if (live && !live.loading && !live.error && live.currentPrice > 0) {
      totalCurrent += live.currentPrice * e.qty;
      loaded++;
    }
  }

  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const isUp = totalPnl >= 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-primary">Portfolio Summary</h3>
        <span className="text-[10px] text-muted">{portfolio.length} holdings</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted mb-0.5">Total Invested</p>
          <p className="text-base font-bold font-mono text-primary">{fmt(totalInvested)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted mb-0.5">Current Value</p>
          {loaded > 0 ? (
            <p className="text-base font-bold font-mono text-primary">{fmt(totalCurrent)}</p>
          ) : (
            <div className="h-5 w-16 bg-border/50 rounded animate-pulse" />
          )}
        </div>
        <div>
          <p className="text-[10px] text-muted mb-0.5">Total P&L</p>
          {loaded > 0 ? (
            <p className={`text-base font-bold font-mono ${isUp ? 'text-gain' : 'text-loss'}`}>
              {isUp ? '+' : ''}{totalPnlPct.toFixed(1)}%
            </p>
          ) : (
            <div className="h-5 w-12 bg-border/50 rounded animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PortfolioView({ onSelectSymbol }: PortfolioViewProps) {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [liveMap, setLiveMap] = useState<Record<string, LiveData>>({});
  const [refreshing, setRefreshing] = useState(false);

  function load() {
    setPortfolio(getPortfolio());
  }

  useEffect(() => {
    load();
    window.addEventListener('robu_portfolio_change', load);
    return () => window.removeEventListener('robu_portfolio_change', load);
  }, []);

  // Fetch live price + fair value for each holding
  async function fetchLive(symbols: string[]) {
    setRefreshing(true);
    const results: Record<string, LiveData> = {};

    // Mark all as loading
    for (const sym of symbols) {
      results[sym] = { currentPrice: 0, fairValue: 0, upside: 0, loading: true, error: false };
    }
    setLiveMap({ ...results });

    await Promise.allSettled(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(`/api/company-v2/${sym}`);
          if (!res.ok) throw new Error('fetch failed');
          const data = await res.json();
          const currentPrice = data.currentPrice ?? 0;
          // Simple forward PE fair value from the API data if available
          const pe = data.pe ?? 0;
          const eps = pe > 0 ? currentPrice / pe : 0;
          // Use sector median PE × EPS as a quick fair value proxy
          const sectorPE = 22; // broad market fallback
          const fairValue = eps > 0 ? eps * sectorPE : 0;
          const upside = fairValue > 0 && currentPrice > 0 ? ((fairValue / currentPrice) - 1) * 100 : 0;
          results[sym] = { currentPrice, fairValue, upside, loading: false, error: false };
        } catch {
          results[sym] = { currentPrice: 0, fairValue: 0, upside: 0, loading: false, error: true };
        }
        setLiveMap(prev => ({ ...prev, [sym]: results[sym] }));
      })
    );

    setRefreshing(false);
  }

  useEffect(() => {
    if (portfolio.length > 0) {
      fetchLive(portfolio.map(e => e.symbol));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio.length]);

  if (portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Briefcase size={24} className="text-gold" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-primary">No holdings yet</h3>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            Search a stock, open it, and click the <span className="text-gold font-medium">+ Portfolio</span> button to track it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Warning */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-gold/5 border border-gold/20 rounded-xl">
        <AlertCircle size={13} className="text-gold flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted/80 leading-relaxed">
          Portfolio is saved in <span className="text-gold font-medium">this browser only</span>.
          Clearing browser data or switching browsers will remove it.
        </p>
      </div>

      {/* Summary */}
      <SummaryBar portfolio={portfolio} liveMap={liveMap} />

      {/* Refresh */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Your holdings</p>
        <button
          onClick={() => fetchLive(portfolio.map(e => e.symbol))}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-gold transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          Refresh prices
        </button>
      </div>

      {/* Holdings list */}
      {portfolio.map(entry => (
        <HoldingRow
          key={entry.symbol}
          entry={entry}
          live={liveMap[entry.symbol] ?? { currentPrice: 0, fairValue: 0, upside: 0, loading: true, error: false }}
          onSelect={() => onSelectSymbol(entry.symbol)}
          onRemove={() => removeFromPortfolio(entry.symbol)}
          onUpdate={(bp, qty) => updatePortfolioEntry(entry.symbol, bp, qty)}
        />
      ))}
    </div>
  );
}
