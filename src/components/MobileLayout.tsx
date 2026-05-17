'use client';

import React, { useState } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getSectorProfile } from '@/lib/sectorModelMap';
import CompanySearch from './CompanySearch';
import AIOverview from './AIOverview';
import ScenarioCards from './ScenarioCards';
import FinancialsTable from './FinancialsTable';
import ValuationEngine from './ValuationEngine';
import EarningsQuality from './EarningsQuality';
import WhatMustHappen from './WhatMustHappen';
import HistoricalValuationChart from './HistoricalValuationChart';

type MobileTab = 'search' | 'overview' | 'valuation' | 'ai' | 'financials';

interface Props {
  company: Company | null;
  financials: FinancialYear[];
  selectedSymbol: string;
  isLoading: boolean;
  error: string | null;
  assumptions: ValuationAssumptions;
  setAssumptions: React.Dispatch<React.SetStateAction<ValuationAssumptions>>;
  onSelect: (symbol: string) => void;
  onRetry: () => void;
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
// Solid-fill design — no gradient IDs, no rendering conflicts across instances
export function RobuLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Rounded-square container */}
      <rect width="40" height="40" rx="9" fill="#141414"/>
      {/* Amber border — makes icon visible against any dark bg */}
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="8.25" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.45" fill="none"/>

      {/* ── Left stem ── */}
      <rect x="8" y="7" width="5.5" height="26" rx="1.5" fill="#F59E0B"/>

      {/* ── Bowl of R — outer D shape with inner cutout via evenodd ── */}
      <path
        fillRule="evenodd"
        d="M13.5 7 C29 7 29 25 13.5 25 Z  M13.5 11.5 C24 11.5 24 20.5 13.5 20.5 Z"
        fill="#F59E0B"
      />

      {/* ── Diagonal leg ── */}
      <path d="M14 24.5L28 33" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L Cr`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K Cr`;
  return `₹${n.toLocaleString('en-IN')} Cr`;
}

// ─── Nav Icons ────────────────────────────────────────────────────────────────
function IconSearch({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on ? '#F59E0B' : 'currentColor'} strokeWidth={on ? 2.2 : 1.8}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}
function IconChart({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on ? '#F59E0B' : 'currentColor'} strokeWidth={on ? 2.2 : 1.8}>
      <path d="M3 3v18h18" strokeLinecap="round" />
      <path d="m19 9-5 5-4-4-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSliders({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on ? '#F59E0B' : 'currentColor'} strokeWidth={on ? 2.2 : 1.8}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
      <circle cx="9" cy="6" r="2" fill={on ? '#F59E0B' : 'none'} />
      <circle cx="15" cy="12" r="2" fill={on ? '#F59E0B' : 'none'} />
      <circle cx="9" cy="18" r="2" fill={on ? '#F59E0B' : 'none'} />
    </svg>
  );
}
function IconAI({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on ? '#F59E0B' : 'currentColor'} strokeWidth={on ? 2.2 : 1.8}>
      <path d="M12 2l1.4 4.3L18 7.5l-4.6 2.7L12 14l-1.4-3.8L6 7.5l4.6-1.2L12 2z" strokeLinejoin="round" />
      <path d="M5 17l.7 2 2 .7-2 .7L5 22l-.7-2-2-.7 2-.7L5 17z" strokeLinejoin="round" />
    </svg>
  );
}
function IconTable({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on ? '#F59E0B' : 'currentColor'} strokeWidth={on ? 2.2 : 1.8}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18" strokeLinecap="round" />
    </svg>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({
  active, onChange, hasCompany,
}: { active: MobileTab; onChange: (t: MobileTab) => void; hasCompany: boolean }) {
  const tabs: { id: MobileTab; label: string; Icon: React.FC<{ on: boolean }>; needsCompany?: boolean }[] = [
    { id: 'search', label: 'Search', Icon: IconSearch },
    { id: 'overview', label: 'Stock', Icon: IconChart, needsCompany: true },
    { id: 'valuation', label: 'Value', Icon: IconSliders, needsCompany: true },
    { id: 'ai', label: 'AI', Icon: IconAI, needsCompany: true },
    { id: 'financials', label: 'Data', Icon: IconTable, needsCompany: true },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-card/95 backdrop-blur-xl border-t border-border flex">
        {tabs.map(({ id, label, Icon, needsCompany }) => {
          const disabled = needsCompany && !hasCompany;
          const isOn = active === id;
          return (
            <button
              key={id}
              onClick={() => !disabled && onChange(id)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors
                ${isOn ? 'text-gold' : disabled ? 'text-muted/25' : 'text-muted'}`}
            >
              <Icon on={isOn} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Mobile Header ────────────────────────────────────────────────────────────
function MobileHeader({ company, activeTab }: { company: Company | null; activeTab: MobileTab }) {
  const showStock = activeTab !== 'search' && company;
  const isPos = company ? company.changePercent >= 0 : true;
  return (
    <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2.5">
        <RobuLogo size={28} />
        {showStock ? (
          <div>
            <span className="text-sm font-bold text-primary font-mono">{company.symbol}</span>
            <span className={`ml-2 text-xs font-semibold font-mono ${isPos ? 'text-gain' : 'text-loss'}`}>
              {isPos ? '+' : ''}{company.changePercent.toFixed(2)}%
            </span>
          </div>
        ) : (
          <span className="text-sm font-bold text-primary tracking-tight">Robu Terminal</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showStock && (
          <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent border border-accent/30 rounded-full font-mono">
            {company.symbol.endsWith('.BO') ? 'BSE' : 'NSE'}
          </span>
        )}
        {showStock && (
          <div className="flex items-center gap-1 text-[11px] text-muted/60">
            <div className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse" />
            <span>Live</span>
          </div>
        )}
      </div>
    </header>
  );
}

// ─── Loader / Error ───────────────────────────────────────────────────────────
function MobileLoader({ symbol }: { symbol: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted">Loading {symbol}…</p>
    </div>
  );
}
function MobileError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
      <p className="text-sm text-loss">{message}</p>
      <button onClick={onRetry} className="px-4 py-2 bg-gold/10 border border-gold/30 rounded-lg text-xs text-gold">Retry</button>
    </div>
  );
}

// ─── Search View ──────────────────────────────────────────────────────────────
function SearchView({ onSelect, selectedSymbol }: { onSelect: (s: string) => void; selectedSymbol: string }) {
  const chips = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'BAJFINANCE', 'TATAMOTORS', 'SBIN', 'ADANIENT'];
  return (
    <div className="flex flex-col px-5 pb-28">
      {/* Wordmark */}
      <div className="flex flex-col items-center pt-12 pb-10">
        <RobuLogo size={56} />
        <h1 className="text-2xl font-bold text-primary mt-4 tracking-tight">Robu Terminal</h1>
        <p className="text-sm text-muted mt-1">Indian Equities Research</p>
      </div>

      {/* Search bar */}
      <div className="mb-8">
        <CompanySearch onSelect={onSelect} selectedSymbol={selectedSymbol} />
      </div>

      {/* Popular chips */}
      <p className="text-[11px] uppercase tracking-widest text-muted font-medium mb-3">Popular</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((sym) => (
          <button
            key={sym}
            onClick={() => onSelect(sym)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
              selectedSymbol === sym
                ? 'bg-gold text-terminal'
                : 'bg-card border border-border text-muted active:scale-95'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Overview View ────────────────────────────────────────────────────────────
function OverviewView({ company, financials, isLoading, error, onRetry }: {
  company: Company | null; financials: FinancialYear[]; isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (!company) return null;

  const isPos = company.changePercent >= 0;
  const low = company.week52Low;
  const high = company.week52High;
  const pct = Math.max(0, Math.min(100, ((company.currentPrice - low) / (high - low)) * 100));
  const latest = financials.length > 0 ? financials[financials.length - 1] : null;

  const stats = [
    { label: 'Market Cap', value: fmt(company.marketCap) },
    { label: 'P/E Ratio', value: `${company.pe.toFixed(1)}x`, color: 'text-gold' },
    { label: 'P/B Ratio', value: `${company.pb.toFixed(1)}x` },
    { label: 'ROE', value: `${company.roe.toFixed(1)}%`, color: company.roe >= 20 ? 'text-gain' : company.roe >= 12 ? 'text-gold' : 'text-loss' },
    { label: 'D/E Ratio', value: `${company.debtToEquity.toFixed(2)}x`, color: company.debtToEquity < 1 ? 'text-gain' : company.debtToEquity < 3 ? 'text-gold' : 'text-loss' },
    { label: 'Div Yield', value: `${company.dividendYield.toFixed(2)}%` },
  ];

  return (
    <div className="px-4 pt-4 pb-28 space-y-3">
      {/* ── Hero Price Card ── */}
      <div className="bg-card rounded-2xl p-5 border border-border">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-mono text-gold font-bold tracking-wider">{company.symbol}</p>
            <h2 className="text-lg font-bold text-primary leading-snug mt-0.5 max-w-[200px]">{company.name}</h2>
            <p className="text-xs text-muted mt-0.5">{company.sector}</p>
          </div>
        </div>

        <div className="flex items-end gap-3 mb-1">
          <span className="text-[2.5rem] font-bold font-mono text-primary leading-none tracking-tight">
            ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className={`flex items-center gap-2 ${isPos ? 'text-gain' : 'text-loss'}`}>
          <span className="text-sm font-semibold font-mono">
            {isPos ? '+' : ''}₹{Math.abs(company.change).toFixed(2)}
          </span>
          <span className="text-sm font-semibold font-mono">
            ({isPos ? '+' : ''}{company.changePercent.toFixed(2)}%)
          </span>
          <span className="text-xs text-muted">today</span>
        </div>

        {/* 52W range bar */}
        <div className="mt-5">
          <div className="flex justify-between text-[11px] text-muted mb-2">
            <span>₹{low.toLocaleString('en-IN')}</span>
            <span>52W Range</span>
            <span>₹{high.toLocaleString('en-IN')}</span>
          </div>
          <div className="relative h-1.5 bg-border rounded-full">
            <div className="h-full bg-gradient-to-r from-loss via-gold to-gain rounded-full opacity-40" style={{ width: '100%' }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-gold bg-terminal shadow-lg"
              style={{ left: `calc(${pct}% - 8px)` }}
            />
          </div>
        </div>
      </div>

      {/* ── Stats Grid 2-col ── */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3.5">
            <p className="text-[11px] text-muted mb-1 uppercase tracking-wide">{s.label}</p>
            <p className={`text-base font-bold font-mono ${s.color || 'text-primary'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Latest Financials Row ── */}
      {latest && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted uppercase tracking-wider mb-3">Financials — {latest.year}</p>
          <div className="space-y-3">
            {[
              { label: 'Revenue', value: fmt(latest.revenue) },
              { label: 'Net Profit (PAT)', value: fmt(latest.pat), color: latest.pat > 0 ? 'text-gain' : 'text-loss' },
              { label: 'EBITDA Margin', value: `${latest.ebitdaMargin.toFixed(1)}%`, color: latest.ebitdaMargin >= 20 ? 'text-gain' : latest.ebitdaMargin >= 12 ? 'text-gold' : 'text-primary' },
              { label: 'Net Margin', value: `${latest.netMargin.toFixed(1)}%` },
              { label: 'EPS', value: `₹${latest.eps.toFixed(1)}` },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted">{r.label}</span>
                <span className={`text-sm font-semibold font-mono ${r.color || 'text-primary'}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Valuation View ───────────────────────────────────────────────────────────
function MobileSlider({
  label, value, min, max, step, suffix, color, onChange, hint,
}: { label: string; value: number; min: number; max: number; step: number; suffix: string; color: string; onChange: (v: number) => void; hint?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted">{label}</p>
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            min={min} max={max} step={step}
            value={value}
            onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(Math.min(Math.max(n, min), max)); }}
            className={`w-16 text-right text-base font-bold font-mono bg-transparent border-b border-border focus:border-gold focus:outline-none ${color} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
          <span className={`text-base font-bold font-mono ${color}`}>{suffix}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${pct}%, #1E1E1E ${pct}%, #1E1E1E 100%)` }}
      />
      {hint && <p className="text-xs text-muted mt-1.5 font-mono">{hint}</p>}
    </div>
  );
}

function ValuationView({ company, financials, assumptions, setAssumptions, isLoading, error, onRetry }: {
  company: Company | null; financials: FinancialYear[]; assumptions: ValuationAssumptions;
  setAssumptions: React.Dispatch<React.SetStateAction<ValuationAssumptions>>;
  isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (!company || financials.length === 0) return null;
  const latest = financials[financials.length - 1];
  const sectorProfile = getSectorProfile(company.sector);

  return (
    <div className="px-4 pt-4 pb-28 space-y-4">
      {/* Assumptions card — now sector-aware */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-5">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          <h3 className="text-sm font-semibold text-primary">Assumptions</h3>
          <span className="ml-auto text-[10px] text-gold font-mono bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded">
            {sectorProfile.sectorLabel}
          </span>
        </div>
        <MobileSlider
          label="Revenue Growth" value={assumptions.revenueGrowthRate}
          min={1} max={50} step={0.5} suffix="%" color="text-accent"
          onChange={(v) => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
          hint={`Actual: ${latest.revenueGrowth.toFixed(1)}%`}
        />
        {sectorProfile.model !== 'pb' && (
          <MobileSlider
            label="Net Margin" value={assumptions.netMarginAssumption}
            min={1} max={50} step={0.5} suffix="%" color="text-gain"
            onChange={(v) => setAssumptions(a => ({ ...a, netMarginAssumption: v }))}
            hint={`Actual: ${latest.netMargin.toFixed(1)}%`}
          />
        )}
        <MobileSlider
          label={sectorProfile.exitMultipleLabel}
          value={assumptions.exitMultiple}
          min={sectorProfile.exitMultipleMin}
          max={sectorProfile.exitMultipleMax}
          step={sectorProfile.exitMultipleStep}
          suffix="x"
          color="text-gold"
          onChange={(v) => setAssumptions(a => ({ ...a, exitMultiple: v, exitPE: v }))}
          hint={
            sectorProfile.model === 'pe' ? `Current P/E: ${company.pe.toFixed(1)}x` :
            sectorProfile.model === 'pb' ? `Current P/B: ${company.pb.toFixed(1)}x` :
            `Default: ${sectorProfile.defaultExitMultiple}x`
          }
        />
        <div>
          <p className="text-sm text-muted mb-2">Horizon</p>
          <div className="flex gap-2">
            {[3, 5, 7, 10].map((y) => (
              <button
                key={y}
                onClick={() => setAssumptions(a => ({ ...a, years: y }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold font-mono transition-all active:scale-95 ${
                  assumptions.years === y ? 'bg-gold text-terminal' : 'bg-border text-muted'
                }`}
              >
                {y}Y
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scenario cards — now sector-aware with probability weights */}
      <ScenarioCards financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} company={company} />

      {/* Valuation Engine */}
      <ValuationEngine company={company} financials={financials} assumptions={assumptions} />

      {/* What Must Happen */}
      <WhatMustHappen company={company} financials={financials} assumptions={assumptions} />
    </div>
  );
}

function MobileScenarios({ financials, assumptions, currentPrice }: { financials: FinancialYear[]; assumptions: ValuationAssumptions; currentPrice: number }) {
  const latest = financials[financials.length - 1];
  const shares = Math.max(latest.shares ?? 1, 0.001);

  function compute(growth: number, margin: number, pe: number) {
    const futRev = latest.revenue * Math.pow(1 + growth / 100, assumptions.years);
    const futPAT = futRev * (margin / 100);
    const fv = (futPAT / shares) * pe;
    const upside = (fv / currentPrice - 1) * 100;
    const cagr = (Math.pow(fv / currentPrice, 1 / assumptions.years) - 1) * 100;
    return { fv, upside, cagr };
  }

  const scenarios = [
    { name: 'Bear', color: '#EF4444', g: assumptions.revenueGrowthRate - 2, m: assumptions.netMarginAssumption - 2, pe: assumptions.exitPE - 5 },
    { name: 'Base', color: '#F59E0B', g: assumptions.revenueGrowthRate, m: assumptions.netMarginAssumption, pe: assumptions.exitPE },
    { name: 'Bull', color: '#10B981', g: assumptions.revenueGrowthRate + 3, m: assumptions.netMarginAssumption + 2, pe: assumptions.exitPE + 5 },
  ];

  return (
    <div className="space-y-3">
      {scenarios.map((s) => {
        const { fv, upside, cagr } = compute(Math.max(s.g, 1), Math.max(s.m, 1), Math.max(s.pe, 5));
        const isPos = upside >= 0;
        return (
          <div key={s.name} className="rounded-xl p-4 border flex items-center justify-between"
            style={{ backgroundColor: `${s.color}08`, borderColor: `${s.color}25` }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm font-bold" style={{ color: s.color }}>{s.name} Case</span>
              </div>
              <p className="text-xs text-muted">CAGR <span className="font-mono font-semibold" style={{ color: s.color }}>{cagr.toFixed(1)}%</span> p.a.</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold font-mono text-primary">₹{fv.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-sm font-semibold font-mono" style={{ color: s.color }}>{isPos ? '+' : ''}{upside.toFixed(1)}%</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── AI View ──────────────────────────────────────────────────────────────────
function AIView({ company, financials, isLoading, error, onRetry }: {
  company: Company | null; financials: FinancialYear[]; isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (!company) return null;
  return (
    <div className="px-4 pt-4 pb-28 space-y-4">
      <AIOverview company={company} />
      <HistoricalValuationChart company={company} />
    </div>
  );
}

// ─── Financials View ──────────────────────────────────────────────────────────
function FinancialsView({ financials, isLoading, error, onRetry }: {
  financials: FinancialYear[]; isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (financials.length === 0) return null;
  return (
    <div className="pt-4 pb-28">
      <div className="px-4 mb-3">
        <h3 className="text-sm font-semibold text-primary">Financial History</h3>
        <p className="text-xs text-muted mt-0.5">Scroll right to see all years</p>
      </div>
      <div className="overflow-x-auto px-4">
        <FinancialsTable financials={financials} />
      </div>
      <div className="px-4 mt-4">
        <EarningsQuality financials={financials} />
      </div>
    </div>
  );
}

// ─── Main Mobile Layout ───────────────────────────────────────────────────────
export default function MobileLayout({
  company, financials, selectedSymbol, isLoading, error,
  assumptions, setAssumptions, onSelect, onRetry,
}: Props) {
  const [activeTab, setActiveTab] = useState<MobileTab>('search');

  function handleSelect(symbol: string) {
    onSelect(symbol);
    setActiveTab('overview');
  }

  const latest = financials.length > 0 ? financials[financials.length - 1] : null;

  return (
    <div className="flex flex-col min-h-screen bg-terminal md:hidden">
      <MobileHeader company={company} activeTab={activeTab} />

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'search' && (
          <SearchView onSelect={handleSelect} selectedSymbol={selectedSymbol} />
        )}
        {activeTab === 'overview' && (
          <OverviewView company={company} financials={financials} isLoading={isLoading} error={error} onRetry={onRetry} />
        )}
        {activeTab === 'valuation' && (
          <ValuationView
            company={company} financials={financials}
            assumptions={assumptions} setAssumptions={setAssumptions}
            isLoading={isLoading} error={error} onRetry={onRetry}
          />
        )}
        {activeTab === 'ai' && (
          <AIView company={company} financials={financials} isLoading={isLoading} error={error} onRetry={onRetry} />
        )}
        {activeTab === 'financials' && (
          <FinancialsView financials={financials} isLoading={isLoading} error={error} onRetry={onRetry} />
        )}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} hasCompany={!!company} />
    </div>
  );
}
