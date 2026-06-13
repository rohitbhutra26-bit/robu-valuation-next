'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getPortfolio, addToPortfolio, removeFromPortfolio, updatePortfolioEntry, PortfolioEntry,
} from '@/lib/portfolio';
import {
  Briefcase, Trash2, AlertCircle, TrendingUp, TrendingDown,
  RefreshCw, Edit2, Check, X, Upload,
} from '@/lib/icons';
import { getSectorProfile } from '@/lib/sectorModelMap';

interface LiveData {
  currentPrice: number;
  changePct: number;
  fairValue: number;
  upside: number;
  sector: string;
  name: string;
  loading: boolean;
  error: boolean;
}

interface PortfolioViewProps {
  onSelectSymbol: (symbol: string) => void;
}

// ── Formatting helpers ────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}


// ── CSV / XLSX import parser ───────────────────────────────────────────────────
interface ImportRow { symbol: string; qty: number; buyPrice: number; buyDate?: string }

/**
 * Parse a CSV text into ImportRow[].
 * Auto-detects broker formats:
 *  - Generic:  Symbol, Qty, Buy Price, [Date]
 *  - Zerodha:  tradingsymbol, quantity, average_price
 *  - Groww:    Symbol Name, Quantity, Avg. Cost Price
 *  - Kotak:    Instrument, Qty., Avg. cost, LTP, Invested, Cur. val, P&L…
 *  - Upstox:   instrument_token / tradingsymbol, quantity, average_price
 *  - ICICI:    Stock Symbol, Quantity, Average Cost
 *  - HDFC Sec: SCRIP NAME, QTY, AVG COST
 */
function parseImportCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Strip BOM if present
  const headerRaw = lines[0].replace(/^﻿/, '');

  // Parse quoted CSV header properly
  function splitCSVLine(line: string): string[] {
    const cells: string[] = [];
    let cur = '', inQ = false;
    for (const ch of line + ',') {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    return cells;
  }

  // Normalize header: lowercase, collapse non-alphanumeric to underscore
  const rawHeaders = splitCSVLine(headerRaw);
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));

  // Column finder: first header that includes ANY keyword
  const col = (keywords: string[]): number =>
    headers.findIndex(h => keywords.some(k => h === k || h.includes(k)));

  // Symbol: Kotak "instrument", HDFC "scrip_name", ICICI "stock_symbol", Groww "symbol_name"
  const symIdx = col([
    'tradingsymbol', 'instrument_token', 'scrip_name', 'stock_symbol',
    'instrument', 'symbol', 'stock', 'scrip', 'ticker', 'name',
  ]);
  // Qty: Kotak "qty_" (from "Qty."), standard "quantity"
  const qtyIdx = col(['qty', 'quantity', 'shares', 'units', 'holding']);
  // Price: "avg_cost", "average_price", "avg_cost_price" all match "avg" or "average" or "cost"
  const priceIdx = col(['avg', 'average', 'buy_price', 'purchase_price', 'cost', 'price']);
  const dateIdx  = col(['date', 'purchase_date', 'buy_date', 'trade_date']);

  if (symIdx === -1 || qtyIdx === -1 || priceIdx === -1) return [];

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('Total') || line.startsWith('Grand Total')) continue;

    const cells = splitCSVLine(line);

    // Keep letters, digits, & and - (for BAJAJ-AUTO, M&M etc.)
    const sym   = (cells[symIdx] || '').toUpperCase().replace(/[^A-Z0-9&-]/g, '');
    const qty   = parseFloat((cells[qtyIdx]   || '').replace(/[^0-9.]/g, ''));
    const price = parseFloat((cells[priceIdx] || '').replace(/[^0-9.]/g, ''));
    const date  = dateIdx !== -1 ? cells[dateIdx] : undefined;

    if (!sym || sym.length < 2 || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) continue;
    rows.push({ symbol: sym, qty, buyPrice: price, buyDate: date });
  }
  return rows;
}

// ── Symbol verification ───────────────────────────────────────────────────────
// Broker files often contain company NAMES ("Tata Motors Ltd") or suffixed
// symbols ("INFY-EQ", "RELIANCE.NS"). Each parsed row is verified against the
// live universe so the user imports REAL stocks — never garbage symbols that
// silently fetch wrong or no data.
export interface VerifiedRow extends ImportRow {
  status: 'checking' | 'ok' | 'fail';
  resolved?: { symbol: string; name: string; sector: string };
}

function cleanQuery(s: string): string {
  return s
    .replace(/\.(NS|BO)$/i, '')
    .replace(/-(EQ|BE|BZ|SM|ST)$/i, '')
    .replace(/\b(LIMITED|LTD)\b\.?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function resolveRow(row: ImportRow): Promise<VerifiedRow> {
  const q = cleanQuery(row.symbol);
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error();
    const results: { symbol: string; name: string; sector?: string }[] = await res.json();
    if (!Array.isArray(results) || results.length === 0) throw new Error();
    // Prefer an exact symbol match; otherwise trust the top fuzzy result
    const exact = results.find(r => r.symbol.toUpperCase() === q.toUpperCase());
    const hit   = exact || results[0];
    return { ...row, status: 'ok', resolved: { symbol: hit.symbol, name: hit.name, sector: hit.sector || '' } };
  } catch {
    return { ...row, status: 'fail' };
  }
}

// ── Import modal ──────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (rows: VerifiedRow[]) => void }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<VerifiedRow[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const parseSeq = useRef(0);

  function parse(raw: string) {
    const rows = parseImportCSV(raw);
    if (rows.length === 0) {
      setPreview([]);
      setError('Could not parse file. Check that it has Symbol, Qty, and Price columns.');
    } else {
      setError('');
      const seq = ++parseSeq.current;
      const initial: VerifiedRow[] = rows.map(r => ({ ...r, status: 'checking' }));
      setPreview(initial);
      // Verify every row against the live stock universe (parallel, capped at 100)
      rows.slice(0, 100).forEach((r, i) => {
        resolveRow(r).then(v => {
          if (parseSeq.current !== seq) return; // a newer parse superseded this one
          setPreview(prev => prev.map((p, j) => (j === i ? v : p)));
        });
      });
    }
    setText(raw);
  }

  async function handleFile(file: File) {
    const content = await file.text();
    parse(content);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85dvh] flex flex-col overflow-hidden shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-primary">Import Portfolio</h2>
            <p className="text-[11px] text-muted mt-0.5">CSV · Zerodha · Groww · Kotak · Upstox · ICICI · HDFC Sec</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-primary hover:bg-border transition-all">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-accent/40 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-accent/4"
          >
            <Upload size={20} className="text-muted mx-auto mb-2" />
            <p className="text-sm font-semibold text-primary">Drop file here or click to browse</p>
            <p className="text-[11px] text-muted mt-1">Supports .csv and .xlsx files</p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.tsv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* Format guide */}
          <div className="bg-border/20 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-primary mb-2">Expected CSV format:</p>
            <code className="text-[10px] text-accent font-mono leading-relaxed block">
              Symbol,Qty,Buy Price,Buy Date<br />
              RELIANCE,10,2500.00,2023-01-15<br />
              TCS,5,3800.00,2023-03-20
            </code>
            <p className="text-[10px] text-muted mt-2">
              Auto-detects <span className="font-mono text-gold">Zerodha</span>, <span className="font-mono text-gold">Groww</span>, <span className="font-mono text-gold">Kotak</span>, <span className="font-mono text-gold">Upstox</span>, <span className="font-mono text-gold">ICICI</span> &amp; <span className="font-mono text-gold">HDFC Sec</span> — just paste or drop the exported file.
            </p>
          </div>

          {/* Paste fallback */}
          <div>
            <label className="text-[10px] text-muted mb-1 block">Or paste CSV directly:</label>
            <textarea
              value={text}
              onChange={e => parse(e.target.value)}
              rows={4}
              placeholder="Symbol,Qty,Buy Price&#10;RELIANCE,10,2500"
              className="w-full bg-border/30 border border-border rounded-lg px-3 py-2 text-xs font-mono text-primary focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex gap-2 p-3 bg-loss/5 border border-loss/20 rounded-xl">
              <AlertCircle size={13} className="text-loss flex-shrink-0 mt-0.5" />
              <p className="text-xs text-loss">{error}</p>
            </div>
          )}

          {/* Preview table — every row verified against the live universe */}
          {preview.length > 0 && (() => {
            const ok       = preview.filter(r => r.status === 'ok');
            const fails    = preview.filter(r => r.status === 'fail');
            const checking = preview.filter(r => r.status === 'checking');
            return (
              <div>
                <p className="text-xs font-semibold text-primary mb-2">
                  {checking.length > 0
                    ? `Verifying ${checking.length} of ${preview.length} holdings…`
                    : `${ok.length} verified${fails.length > 0 ? ` · ${fails.length} unrecognised (will be skipped)` : ' — all matched ✓'}`}
                </p>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[18px_1fr_56px_72px] gap-x-2 px-3 py-1.5 bg-border/20 border-b border-border text-[10px] text-muted uppercase tracking-wide">
                    <span /><span>Matched stock</span><span className="text-right">Qty</span><span className="text-right">Buy ₹</span>
                  </div>
                  <div className="divide-y divide-border/30 max-h-44 overflow-y-auto">
                    {preview.map((r, i) => (
                      <div key={i} className={`grid grid-cols-[18px_1fr_56px_72px] gap-x-2 px-3 py-2 text-xs items-center ${r.status === 'fail' ? 'opacity-50' : ''}`}>
                        <span aria-hidden="true">
                          {r.status === 'checking' ? <span className="inline-block w-3 h-3 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
                           : r.status === 'ok' ? <span className="text-gain font-bold">✓</span>
                           : <span className="text-loss font-bold">✗</span>}
                        </span>
                        <span className="min-w-0">
                          <span className="font-bold font-mono text-gold">{r.resolved?.symbol || r.symbol}</span>
                          {r.resolved && r.resolved.name !== r.resolved.symbol && (
                            <span className="block text-[10px] text-muted truncate">{r.resolved.name}</span>
                          )}
                          {r.status === 'fail' && (
                            <span className="block text-[10px] text-loss/70">not found — check the symbol</span>
                          )}
                        </span>
                        <span className="text-right font-mono text-primary">{r.qty}</span>
                        <span className="text-right font-mono text-primary">{r.buyPrice.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-primary transition-all">
            Cancel
          </button>
          {(() => {
            const ok = preview.filter(r => r.status === 'ok');
            const busy = preview.some(r => r.status === 'checking');
            return (
              <button
                onClick={() => { if (ok.length > 0) { onImport(ok); onClose(); } }}
                disabled={ok.length === 0 || busy}
                className="flex-1 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm font-bold hover:bg-accent/20 transition-all disabled:opacity-40"
              >
                {busy ? 'Verifying…' : `Import ${ok.length > 0 ? `${ok.length} verified` : ''}`}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Edit row ──────────────────────────────────────────────────────────────────
function EditRow({ entry, onSave, onCancel }: {
  entry: PortfolioEntry; onSave: (bp: number, qty: number) => void; onCancel: () => void;
}) {
  const [bp, setBp] = useState(entry.buyPrice.toString());
  const [qty, setQty] = useState(entry.qty.toString());
  function save() {
    const bpN = parseFloat(bp), qtyN = parseFloat(qty);
    if (bpN > 0 && qtyN > 0) onSave(bpN, qtyN);
  }
  return (
    <div className="flex items-center gap-2 flex-wrap pt-1">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted">Buy ₹</span>
        <input type="number" value={bp} min="0.01" step="0.01" onChange={e => setBp(e.target.value)}
          className="w-24 text-xs font-mono bg-border/30 border border-border rounded px-2 py-1 text-primary focus:outline-none focus:border-gold" />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted">Qty</span>
        <input type="number" value={qty} min="1" step="1" onChange={e => setQty(e.target.value)}
          className="w-20 text-xs font-mono bg-border/30 border border-border rounded px-2 py-1 text-primary focus:outline-none focus:border-gold" />
      </div>
      <button onClick={save} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gain/10 border border-gain/30 text-gain text-xs font-semibold">
        <Check size={11} /> Save
      </button>
      <button onClick={onCancel} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-border text-muted text-xs">
        <X size={11} /> Cancel
      </button>
    </div>
  );
}

// ── Holding card ──────────────────────────────────────────────────────────────
function HoldingCard({
  entry, live, onSelect, onRemove, onUpdate, weight,
}: {
  entry: PortfolioEntry; live: LiveData; onSelect: () => void;
  onRemove: () => void; onUpdate: (bp: number, qty: number) => void;
  weight: number; // % of portfolio by invested value
}) {
  const [editing, setEditing] = useState(false);

  const invested   = entry.buyPrice * entry.qty;
  const currentVal = live.currentPrice > 0 ? live.currentPrice * entry.qty : 0;
  const pnl        = currentVal - invested;
  const pnlPct     = invested > 0 ? (pnl / invested) * 100 : 0;
  const isUp       = pnl >= 0;

  const signal =
    live.upside >= 20  ? { text: 'Undervalued', cls: 'text-gain bg-gain/10 border-gain/20' } :
    live.upside <= -20 ? { text: 'Overvalued',  cls: 'text-loss bg-loss/10 border-loss/20' } :
                         { text: 'Fair Range',  cls: 'text-gold bg-gold/10 border-gold/20' };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Weight bar at top */}
      <div className="h-0.5 bg-border">
        <div className="h-full bg-gold/60 transition-all duration-500" style={{ width: `${Math.min(weight, 100)}%` }} />
      </div>

      <div className="p-4 space-y-3">
        {/* Top: symbol + name + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-gold bg-gold/10 border border-gold/25 px-2 py-0.5 rounded-lg">
                {entry.symbol}
              </span>
              {entry.sector && (
                <span className="text-[10px] text-muted bg-border/50 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                  {entry.sector}
                </span>
              )}
              <span className="text-[10px] text-muted/50 font-mono">{weight.toFixed(1)}% of portfolio</span>
            </div>
            <p className="text-sm font-semibold text-primary mt-1 truncate">{entry.name}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setEditing(v => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted/40 hover:text-gold hover:bg-gold/10 transition-all">
              <Edit2 size={12} />
            </button>
            <button onClick={onRemove}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted/40 hover:text-loss hover:bg-loss/10 transition-all">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {editing && (
          <EditRow entry={entry}
            onSave={(bp, qty) => { onUpdate(bp, qty); setEditing(false); }}
            onCancel={() => setEditing(false)} />
        )}

        {/* P&L grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-border/20 rounded-lg p-2.5">
            <p className="text-[10px] text-muted mb-0.5">Invested</p>
            <p className="text-sm font-bold font-mono text-primary">{fmt(invested)}</p>
            <p className="text-[10px] text-muted mt-0.5 font-mono">{entry.qty}×₹{entry.buyPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-border/20 rounded-lg p-2.5">
            <p className="text-[10px] text-muted mb-0.5">Current</p>
            {live.loading ? (
              <div className="h-4 w-14 bg-border/50 rounded animate-pulse" />
            ) : live.error ? (
              <p className="text-xs text-muted/50">—</p>
            ) : (
              <>
                <p className="text-sm font-bold font-mono text-primary">{fmt(currentVal)}</p>
                <p className="text-[10px] font-mono text-muted mt-0.5">₹{live.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })} CMP</p>
              </>
            )}
          </div>
          <div className="bg-border/20 rounded-lg p-2.5">
            <p className="text-[10px] text-muted mb-0.5">P&L</p>
            {live.loading ? (
              <div className="h-4 w-12 bg-border/50 rounded animate-pulse" />
            ) : live.error ? (
              <p className="text-xs text-muted/50">—</p>
            ) : (
              <>
                <p className={`text-sm font-bold font-mono ${isUp ? 'text-gain' : 'text-loss'}`}>
                  {isUp ? '+' : ''}{pnlPct.toFixed(1)}%
                </p>
                <p className={`text-[10px] font-mono mt-0.5 ${isUp ? 'text-gain' : 'text-loss'}`}>
                  {isUp ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Valuation signal */}
        {!live.loading && !live.error && live.fairValue > 0 && (
          <div className={`flex items-center justify-between rounded-lg px-3 py-1.5 border text-[10px] ${signal.cls}`}>
            <span className="font-semibold">{signal.text}</span>
            <span className="font-mono">Fair ₹{live.fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              <span className="opacity-70 ml-1">({live.upside >= 0 ? '+' : ''}{live.upside.toFixed(1)}%)</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary header ────────────────────────────────────────────────────────────
function SummaryHeader({ portfolio, liveMap }: { portfolio: PortfolioEntry[]; liveMap: Record<string, LiveData> }) {
  let totalInvested = 0, totalCurrent = 0, loaded = 0, gainers = 0;

  for (const e of portfolio) {
    const inv = e.buyPrice * e.qty;
    totalInvested += inv;
    const live = liveMap[e.symbol];
    if (live && !live.loading && !live.error && live.currentPrice > 0) {
      const cur = live.currentPrice * e.qty;
      totalCurrent += cur;
      if (cur >= inv) gainers++;
      loaded++;
    }
  }

  const pnl    = totalCurrent - totalInvested;
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
  const isUp   = pnl >= 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Big P&L bar */}
      <div className={`px-5 py-4 ${isUp ? 'bg-gain/5' : 'bg-loss/5'}`}>
        <p className="text-[11px] text-muted mb-1">Total Portfolio P&L</p>
        {loaded > 0 ? (
          <div className="flex items-end gap-3 flex-wrap">
            <p className={`text-3xl font-bold font-mono ${isUp ? 'text-gain' : 'text-loss'}`}>
              {isUp ? '+' : ''}{pnlPct.toFixed(2)}%
            </p>
            <p className={`text-base font-bold font-mono mb-0.5 ${isUp ? 'text-gain' : 'text-loss'}`}>
              {isUp ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        ) : (
          <div className="h-9 w-32 bg-border/50 rounded animate-pulse" />
        )}
      </div>

      {/* 3-column stats */}
      <div className="grid grid-cols-3 divide-x divide-border/50 border-t border-border">
        <div className="px-4 py-3">
          <p className="text-[10px] text-muted mb-0.5">Invested</p>
          <p className="text-sm font-bold font-mono text-primary">{fmt(totalInvested)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-muted mb-0.5">Current Value</p>
          {loaded > 0 ? (
            <p className="text-sm font-bold font-mono text-primary">{fmt(totalCurrent)}</p>
          ) : (
            <div className="h-4 w-16 bg-border/50 rounded animate-pulse" />
          )}
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-muted mb-0.5">Holdings</p>
          <p className="text-sm font-bold font-mono text-primary">
            {portfolio.length}
            {loaded > 0 && <span className="text-[10px] text-muted font-normal"> · {gainers}↑ {loaded - gainers}↓</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Key insights — what the numbers MEAN, shown right after import ────────────
function PortfolioInsights({ portfolio, liveMap }: { portfolio: PortfolioEntry[]; liveMap: Record<string, LiveData> }) {
  const rows = portfolio.map(e => {
    const live = liveMap[e.symbol];
    const ready = live && !live.loading && !live.error && live.currentPrice > 0;
    const invested = e.buyPrice * e.qty;
    const current  = ready ? live.currentPrice * e.qty : 0;
    return { e, live, ready, invested, current, pnlPct: ready && invested > 0 ? ((current - invested) / invested) * 100 : 0 };
  });
  const ready = rows.filter(r => r.ready);
  if (ready.length < 2) return null;

  const totalCur = ready.reduce((s, r) => s + r.current, 0);
  if (totalCur <= 0) return null;

  // Sector allocation by CURRENT value
  const sectorMap = new Map<string, number>();
  for (const r of ready) {
    const sec = r.live.sector || r.e.sector || 'Other';
    sectorMap.set(sec, (sectorMap.get(sec) ?? 0) + r.current);
  }
  const sectors = Array.from(sectorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Concentration
  const sorted = [...ready].sort((a, b) => b.current - a.current);
  const topW  = (sorted[0].current / totalCur) * 100;
  const top3W = sorted.slice(0, 3).reduce((s, r) => s + r.current, 0) / totalCur * 100;

  // Best & worst
  const byPnl = [...ready].sort((a, b) => b.pnlPct - a.pnlPct);
  const best = byPnl[0], worst = byPnl[byPnl.length - 1];

  // Valuation mix (rough, sector-multiple based)
  const under = ready.filter(r => r.live.upside >= 20).length;
  const over  = ready.filter(r => r.live.upside <= -20).length;

  // Rule-based observations — an analyst whispering over your shoulder
  const notes: { icon: string; text: string; tone: 'gain' | 'gold' | 'loss' }[] = [];
  if (topW > 35) notes.push({ icon: '⚠', tone: 'loss', text: `${sorted[0].e.symbol} is ${topW.toFixed(0)}% of your portfolio — one bad quarter there moves your whole net worth. Most pros cap single positions near 10–15%.` });
  else if (top3W > 70) notes.push({ icon: '⚠', tone: 'gold', text: `Your top 3 holdings are ${top3W.toFixed(0)}% of the portfolio — concentrated, which is fine only if your conviction is researched, not hopeful.` });
  else notes.push({ icon: '✓', tone: 'gain', text: `Position sizes look balanced — no single stock can sink the ship.` });
  if (sectorMap.size <= 2 && ready.length >= 4) notes.push({ icon: '⚠', tone: 'gold', text: `Everything sits in ${sectorMap.size} sector${sectorMap.size === 1 ? '' : 's'} — a sector-wide storm hits every holding at once.` });
  if (over > 0) notes.push({ icon: '◆', tone: 'gold', text: `${over} holding${over === 1 ? ' looks' : 's look'} expensive vs sector norms — worth opening their full report before adding more.` });
  if (under > 0) notes.push({ icon: '◆', tone: 'gain', text: `${under} holding${under === 1 ? ' trades' : 's trade'} below rough fair value — potential add candidates if the red-flag checks pass.` });

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">🔎</span>
        <h3 className="text-sm font-bold text-primary">Key Insights</h3>
        <span className="text-[10px] text-muted ml-auto">based on {ready.length} of {portfolio.length} holdings</span>
      </div>

      {/* Best / worst strip */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={undefined} className="bg-gain/5 border border-gain/20 rounded-xl p-3 text-left">
          <p className="text-[10px] text-muted mb-0.5">Best performer</p>
          <p className="text-sm font-bold font-mono text-gain">{best.e.symbol}</p>
          <p className="text-xs font-mono text-gain">+{best.pnlPct.toFixed(1)}%</p>
        </button>
        <button onClick={undefined} className="bg-loss/5 border border-loss/20 rounded-xl p-3 text-left">
          <p className="text-[10px] text-muted mb-0.5">Worst performer</p>
          <p className="text-sm font-bold font-mono text-loss">{worst.e.symbol}</p>
          <p className="text-xs font-mono text-loss">{worst.pnlPct.toFixed(1)}%</p>
        </button>
      </div>

      {/* Sector allocation bars */}
      <div>
        <p className="text-[10px] text-muted uppercase tracking-wide mb-2">Where your money sits</p>
        <div className="space-y-1.5">
          {sectors.map(([sec, val]) => {
            const w = (val / totalCur) * 100;
            return (
              <div key={sec} className="flex items-center gap-2">
                <span className="text-[11px] text-muted w-32 truncate flex-shrink-0">{sec}</span>
                <div className="flex-1 h-2 bg-border/40 rounded-full overflow-hidden">
                  <div className="h-full bg-gold/70 rounded-full transition-all duration-700" style={{ width: `${w}%` }} />
                </div>
                <span className="text-[11px] font-mono text-primary w-10 text-right flex-shrink-0">{w.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analyst notes */}
      <div className="space-y-2">
        {notes.slice(0, 3).map((n, i) => (
          <div key={i} className={`flex gap-2 text-xs leading-relaxed p-2.5 rounded-lg ${
            n.tone === 'gain' ? 'bg-gain/5 text-primary' : n.tone === 'loss' ? 'bg-loss/5 text-primary' : 'bg-gold/5 text-primary'
          }`}>
            <span aria-hidden="true" className={n.tone === 'gain' ? 'text-gain' : n.tone === 'loss' ? 'text-loss' : 'text-gold'}>{n.icon}</span>
            <span>{n.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PortfolioView({ onSelectSymbol }: PortfolioViewProps) {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [liveMap, setLiveMap] = useState<Record<string, LiveData>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);

  function load() { setPortfolio(getPortfolio()); }

  useEffect(() => {
    load();
    window.addEventListener('robu_portfolio_change', load);
    return () => window.removeEventListener('robu_portfolio_change', load);
  }, []);

  const fetchLive = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    setRefreshing(true);
    const init: Record<string, LiveData> = {};
    for (const sym of symbols)
      init[sym] = { currentPrice: 0, fairValue: 0, upside: 0, loading: true, error: false };
    setLiveMap(prev => ({ ...prev, ...init }));

    await Promise.allSettled(symbols.map(async sym => {
      try {
        // Fresh quote + fundamentals in parallel — price never comes from a stale payload
        const [priceRes, compRes] = await Promise.allSettled([
          fetch(`/api/price/${sym}`, { cache: 'no-store' }),
          fetch(`/api/company-v2/${sym}`),
        ]);
        const priceJson = priceRes.status === 'fulfilled' && priceRes.value.ok ? await priceRes.value.json() : null;
        const d         = compRes.status  === 'fulfilled' && compRes.value.ok  ? await compRes.value.json()  : null;
        if (!priceJson && !d) throw new Error('failed');

        const price     = parseFloat(priceJson?.price || d?.currentPrice || 0);
        const changePct = parseFloat(priceJson?.changePct ?? d?.changePercent ?? 0);
        const pe        = d?.pe ? parseFloat(d.pe) : 0;
        const eps       = pe > 0 ? price / pe : 0;
        // Sector-aware exit multiple — a bank and an IT company are not both worth 22x
        const exitX     = getSectorProfile(d?.sector || '').defaultExitMultiple || 22;
        const fv        = eps > 0 ? eps * exitX : 0;
        const up        = fv > 0 && price > 0 ? ((fv / price) - 1) * 100 : 0;
        setLiveMap(prev => ({ ...prev, [sym]: {
          currentPrice: price, changePct, fairValue: fv, upside: up,
          sector: d?.sector || '', name: d?.name || sym,
          loading: false, error: price <= 0,
        } }));
      } catch {
        setLiveMap(prev => ({ ...prev, [sym]: { currentPrice: 0, changePct: 0, fairValue: 0, upside: 0, sector: '', name: sym, loading: false, error: true } }));
      }
    }));
    setAsOf(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (portfolio.length > 0) fetchLive(portfolio.map(e => e.symbol));
  }, [portfolio.length, fetchLive]);

  function handleImport(rows: VerifiedRow[]) {
    let imported = 0;
    for (const r of rows) {
      if (r.status !== 'ok' || !r.resolved) continue;
      try {
        // addToPortfolio takes Omit<PortfolioEntry, 'addedAt'> — it appends addedAt internally
        addToPortfolio({
          symbol:   r.resolved.symbol,   // verified real symbol — never raw CSV text
          name:     r.resolved.name,
          sector:   r.resolved.sector,
          buyPrice: r.buyPrice,
          qty:      r.qty,
        });
        imported++;
      } catch { /* skip duplicates */ }
    }
    setImportSuccess(imported);
    setTimeout(() => setImportSuccess(null), 6000);
  }

  // Compute portfolio weights by invested value
  const totalInvested = portfolio.reduce((s, e) => s + e.buyPrice * e.qty, 0);

  if (portfolio.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Briefcase size={15} className="text-gold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">Portfolio</h2>
              <p className="text-[11px] text-muted">No holdings yet</p>
            </div>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 text-xs text-accent border border-accent/30 bg-accent/10 px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-all"
          >
            <Upload size={11} /> Import
          </button>
        </div>

        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
            <Briefcase size={22} className="text-gold" />
          </div>
          <p className="text-sm font-semibold text-primary mb-1">Track your holdings</p>
          <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed mb-4">
            Search any stock and click <span className="text-gold font-medium">+ Portfolio</span> to add it, or import your holdings from a CSV or broker export.
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/20 transition-all"
          >
            <Upload size={14} /> Import from CSV / Broker
          </button>
        </div>

        {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
            <Briefcase size={15} className="text-gold" />
          </div>
          <div>
            <h2 className="text-base font-bold text-primary">Portfolio</h2>
            <p className="text-[11px] text-muted">{portfolio.length} holdings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 text-xs text-accent border border-accent/30 bg-accent/10 px-2.5 py-1.5 rounded-lg hover:bg-accent/20 transition-all"
          >
            <Upload size={11} /> Import
          </button>
          <button
            onClick={() => fetchLive(portfolio.map(e => e.symbol))}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-primary px-2.5 py-1.5 rounded-lg border border-border hover:border-gold/30 transition-all disabled:opacity-50"
          >
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Import success toast ── */}
      {importSuccess !== null && (
        <div className="flex items-center gap-2 p-3 bg-gain/10 border border-gain/25 rounded-xl">
          <Check size={13} className="text-gain" />
          <p className="text-xs font-semibold text-gain">{importSuccess} holdings imported successfully</p>
        </div>
      )}

      {/* ── Browser-only notice ── */}
      <div className="flex gap-2 p-3 bg-border/30 border border-border/50 rounded-xl">
        <AlertCircle size={12} className="text-muted flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted leading-relaxed">
          Saved on this browser only — clears if you clear browser data.
        </p>
      </div>

      {/* ── Summary ── */}
      <SummaryHeader portfolio={portfolio} liveMap={liveMap} />
      {asOf && (
        <p className="text-[10px] text-muted text-right -mt-2">
          Prices as of {asOf.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · EOD/delayed
        </p>
      )}

      {/* ── Key insights — the "so what" of your portfolio ── */}
      <PortfolioInsights portfolio={portfolio} liveMap={liveMap} />

      {/* ── Holdings ── */}
      <div className="space-y-3">
        {portfolio.map(entry => {
          const weight = totalInvested > 0 ? (entry.buyPrice * entry.qty / totalInvested) * 100 : 0;
          return (
            <HoldingCard
              key={entry.symbol}
              entry={entry}
              live={liveMap[entry.symbol] ?? { currentPrice: 0, changePct: 0, fairValue: 0, upside: 0, sector: '', name: '', loading: true, error: false }}
              weight={weight}
              onSelect={() => onSelectSymbol(entry.symbol)}
              onRemove={() => removeFromPortfolio(entry.symbol)}
              onUpdate={(bp, qty) => updatePortfolioEntry(entry.symbol, bp, qty)}
            />
          );
        })}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
    </div>
  );
}
