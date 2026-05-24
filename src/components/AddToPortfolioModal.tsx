'use client';

import { useState } from 'react';
import { Company } from '@/lib/types';
import { addToPortfolio, getPortfolioEntry, removeFromPortfolio } from '@/lib/portfolio';
import { Briefcase, X, Trash2 } from '@/lib/icons';

interface AddToPortfolioModalProps {
  company: Company;
  onClose: () => void;
}

export default function AddToPortfolioModal({ company, onClose }: AddToPortfolioModalProps) {
  const existing = getPortfolioEntry(company.symbol);
  const [buyPrice, setBuyPrice] = useState(existing?.buyPrice?.toString() ?? company.currentPrice.toFixed(2));
  const [qty, setQty] = useState(existing?.qty?.toString() ?? '1');
  const [saved, setSaved] = useState(false);

  const bp = parseFloat(buyPrice) || 0;
  const q = parseFloat(qty) || 0;
  const invested = bp * q;
  const currentVal = company.currentPrice * q;
  const pnl = currentVal - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const isUp = pnl >= 0;

  function handleSave() {
    if (bp <= 0 || q <= 0) return;
    addToPortfolio({
      symbol: company.symbol,
      name: company.name,
      sector: company.sector,
      buyPrice: bp,
      qty: q,
    });
    setSaved(true);
    setTimeout(onClose, 800);
  }

  function handleRemove() {
    removeFromPortfolio(company.symbol);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-terminal/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Briefcase size={14} className="text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary">
                {existing ? 'Update position' : 'Add to portfolio'}
              </h3>
              <p className="text-[10px] text-gold font-mono">{company.symbol}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-primary transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted mb-1 block">Your buy price (₹)</label>
            <input
              type="number" min="0.01" step="0.01" value={buyPrice}
              onChange={e => setBuyPrice(e.target.value)}
              className="w-full bg-border/30 border border-border rounded-xl px-3 py-2.5 text-base font-mono font-bold text-primary focus:outline-none focus:border-gold transition-colors"
              placeholder="e.g. 1250.00"
            />
            <p className="text-[10px] text-muted/60 mt-1">
              CMP: ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Number of shares</label>
            <input
              type="number" min="1" step="1" value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full bg-border/30 border border-border rounded-xl px-3 py-2.5 text-base font-mono font-bold text-primary focus:outline-none focus:border-gold transition-colors"
              placeholder="e.g. 10"
            />
          </div>
        </div>

        {/* Live preview */}
        {bp > 0 && q > 0 && (
          <div className="bg-border/20 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted">Amount invested</span>
              <span className="font-mono font-semibold text-primary">
                ₹{invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Current value</span>
              <span className="font-mono font-semibold text-primary">
                ₹{currentVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between text-xs border-t border-border pt-1.5 mt-1">
              <span className="text-muted">Unrealised P&L</span>
              <span className={`font-mono font-bold ${isUp ? 'text-gain' : 'text-loss'}`}>
                {isUp ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                {' '}({isUp ? '+' : ''}{pnlPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {existing && (
            <button
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-loss bg-loss/10 border border-loss/20 hover:bg-loss/20 transition-all"
            >
              <Trash2 size={13} />
              Remove
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={bp <= 0 || q <= 0 || saved}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              saved
                ? 'bg-gain/20 text-gain border border-gain/30'
                : 'bg-gold text-terminal hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {saved ? '✓ Saved!' : existing ? 'Update position' : 'Add to portfolio'}
          </button>
        </div>
      </div>
    </div>
  );
}
