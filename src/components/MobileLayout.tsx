'use client';

import React, { useState, useRef } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import {
  Search, TrendingUp, SlidersHorizontal, Sparkles, Table2, Users, AlertTriangle, Pencil,
} from '@/lib/icons';
import { getSectorProfile } from '@/lib/sectorModelMap';
import CompanySearch from './CompanySearch';
import AIOverview from './AIOverview';
import ScenarioCards from './ScenarioCards';
import FinancialsTable from './FinancialsTable';
import ValuationEngine from './ValuationEngine';
import EarningsQuality from './EarningsQuality';
import WhatMustHappen from './WhatMustHappen';
import HistoricalValuationChart from './HistoricalValuationChart';
import ForecastChart from './ForecastChart';
import IndustryBenchmarks from './IndustryBenchmarks';
import PeerCompare from './PeerCompare';
import VerdictCard from './VerdictCard';

type MobileTab = 'search' | 'overview' | 'valuation' | 'ai' | 'financials' | 'peers';

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
export function RobuLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="9" fill="#030a05"/>
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="8.25" stroke="#34d399" strokeWidth="1" strokeOpacity="0.35" fill="none"/>
      <rect x="7" y="7" width="7" height="26" rx="2" fill="#34d399"/>
      <rect x="7" y="7" width="21" height="7" rx="2" fill="#34d399"/>
      <rect x="22" y="7" width="6" height="14" rx="2" fill="#34d399"/>
      <rect x="7" y="14" width="21" height="7" rx="2" fill="#34d399"/>
      <path d="M14 21 L21 21 L31 33 L24 33 Z" fill="#34d399"/>
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
  return <Search size={20} className={on ? 'text-gold' : 'text-current'} strokeWidth={on ? 2.2 : 1.8} />;
}
function IconChart({ on }: { on: boolean }) {
  return <TrendingUp size={20} className={on ? 'text-gold' : 'text-current'} strokeWidth={on ? 2.2 : 1.8} />;
}
function IconSliders({ on }: { on: boolean }) {
  return <SlidersHorizontal size={20} className={on ? 'text-gold' : 'text-current'} strokeWidth={on ? 2.2 : 1.8} />;
}
function IconAI({ on }: { on: boolean }) {
  return <Sparkles size={20} className={on ? 'text-gold' : 'text-current'} strokeWidth={on ? 2.2 : 1.8} />;
}
function IconTable({ on }: { on: boolean }) {
  return <Table2 size={20} className={on ? 'text-gold' : 'text-current'} strokeWidth={on ? 2.2 : 1.8} />;
}
function IconPeers({ on }: { on: boolean }) {
  return <Users size={20} className={on ? 'text-gold' : 'text-current'} strokeWidth={on ? 2.2 : 1.8} />;
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({
  active, onChange, hasCompany,
}: { active: MobileTab; onChange: (t: MobileTab) => void; hasCompany: boolean }) {
  const tabs: { id: MobileTab; label: string; Icon: React.FC<{ on: boolean }>; needsCompany?: boolean }[] = [
    { id: 'search',     label: 'Search',   Icon: IconSearch },
    { id: 'overview',   label: 'Stock',    Icon: IconChart,   needsCompany: true },
    { id: 'valuation',  label: 'Value',    Icon: IconSliders, needsCompany: true },
    { id: 'ai',         label: 'AI',       Icon: IconAI,      needsCompany: true },
    { id: 'peers',      label: 'Peers',    Icon: IconPeers,   needsCompany: true },
    { id: 'financials', label: 'Data',     Icon: IconTable,   needsCompany: true },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-card/98 backdrop-blur-xl border-t border-border flex">
        {tabs.map(({ id, label, Icon, needsCompany }) => {
          const disabled = needsCompany && !hasCompany;
          const isOn = active === id;
          return (
            <button
              key={id}
              onClick={() => !disabled && onChange(id)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors min-w-0
                ${isOn ? 'text-gold' : disabled ? 'text-muted/25' : 'text-muted hover:text-primary/70'}`}
            >
              <Icon on={isOn} />
              <span className="text-[9px] font-medium leading-none truncate">{label}</span>
              {isOn && <div className="w-4 h-0.5 rounded-full bg-gold mt-0.5" />}
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
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border flex items-center justify-between px-4"
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))', paddingBottom: '12px' }}>
      <div className="flex items-center gap-2.5">
        <RobuLogo size={26} />
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
          <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/30 rounded-full font-mono">
            {company.symbol.endsWith('.BO') ? 'BSE' : 'NSE'}
          </span>
        )}
        {showStock && (
          <div className="flex items-center gap-1 text-[10px] text-muted/60">
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
    <div className="flex flex-col items-center justify-center h-64 gap-4 px-6">
      <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <p className="text-sm text-muted">Loading {symbol || '…'}</p>
        <p className="text-xs text-muted/50 mt-1">Fetching live data from NSE/BSE</p>
      </div>
    </div>
  );
}
function MobileError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-loss/10 border border-loss/20 flex items-center justify-center">
          <AlertTriangle size={22} className="text-loss" />
        </div>
      <div>
        <p className="text-sm text-loss font-medium">Couldn't load data</p>
        <p className="text-xs text-muted mt-1">{message}</p>
      </div>
      <button onClick={onRetry} className="px-5 py-2.5 bg-gold/10 border border-gold/30 rounded-xl text-sm text-gold font-medium active:scale-95 transition-transform">
        Try again
      </button>
    </div>
  );
}

// ─── Search View ──────────────────────────────────────────────────────────────
function SearchView({ onSelect, selectedSymbol }: { onSelect: (s: string) => void; selectedSymbol: string }) {
  const chips = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'BAJFINANCE', 'TATAMOTORS', 'SBIN', 'ADANIENT', 'ANGELONE', 'KAYNES'];
  return (
    <div className="flex flex-col px-4 pb-32">
      {/* Hero */}
      <div className="flex flex-col items-center pt-10 pb-8">
        <RobuLogo size={52} />
        <h1 className="text-2xl font-bold text-primary mt-4 tracking-tight">Robu Terminal</h1>
        <p className="text-sm text-muted mt-1 text-center px-4">Find out if any Indian stock is cheap, fair, or expensive</p>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <CompanySearch onSelect={onSelect} selectedSymbol={selectedSymbol} />
      </div>

      {/* Feature tiles — "what can I do?" */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { Icon: TrendingUp,        iconCls: 'text-gain',   bg: 'bg-gain/10',   border: 'border-gain/20',   title: 'Value it',    body: 'Is it cheap?' },
          { Icon: Users,             iconCls: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20', title: 'Compare',     body: 'vs rivals' },
          { Icon: Sparkles,          iconCls: 'text-gold',   bg: 'bg-gold/10',   border: 'border-gold/20',   title: 'AI analysis', body: 'Plain English' },
        ].map(tile => (
          <div key={tile.title} className="bg-card border border-border rounded-xl p-3 text-center">
            <div className={`w-8 h-8 rounded-lg ${tile.bg} border ${tile.border} flex items-center justify-center mx-auto mb-2`}>
              <tile.Icon size={16} className={tile.iconCls} />
            </div>
            <p className="text-[10px] font-semibold text-primary">{tile.title}</p>
            <p className="text-[9px] text-muted mt-0.5">{tile.body}</p>
          </div>
        ))}
      </div>

      {/* Popular chips */}
      <p className="text-[10px] uppercase tracking-widest text-muted font-medium mb-2">Popular stocks to try</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((sym) => (
          <button
            key={sym}
            onClick={() => onSelect(sym)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all active:scale-95 ${
              selectedSymbol === sym
                ? 'bg-gold text-terminal'
                : 'bg-card border border-border text-muted'
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
function OverviewView({ company, financials, assumptions, isLoading, error, onRetry }: {
  company: Company | null; financials: FinancialYear[]; assumptions: ValuationAssumptions;
  isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (!company) return null;

  const isPos = company.changePercent >= 0;
  const low = company.week52Low;
  const high = company.week52High;
  const pct = high > low ? Math.max(2, Math.min(98, ((company.currentPrice - low) / (high - low)) * 100)) : 50;
  const latest = financials.length > 0 ? financials[financials.length - 1] : null;

  const stats = [
    { label: 'Market Cap',  value: fmt(company.marketCap) },
    { label: 'P/E Ratio',   value: `${company.pe.toFixed(1)}x`,    color: 'text-gold' },
    { label: 'P/B Ratio',   value: `${company.pb.toFixed(1)}x` },
    { label: 'ROE',         value: `${company.roe.toFixed(1)}%`,   color: company.roe >= 20 ? 'text-gain' : company.roe >= 12 ? 'text-gold' : 'text-loss' },
    { label: 'Debt / Equity', value: `${company.debtToEquity.toFixed(2)}x`, color: company.debtToEquity < 1 ? 'text-gain' : company.debtToEquity < 3 ? 'text-gold' : 'text-loss' },
    { label: 'Div Yield',   value: `${company.dividendYield.toFixed(2)}%` },
  ];

  return (
    <div className="px-4 pt-4 pb-32 space-y-3">
      {/* Verdict banner */}
      <VerdictCard company={company} financials={financials} assumptions={assumptions} />

      {/* Hero Price Card */}
      <div className="bg-card rounded-2xl p-5 border border-border">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-gold tracking-wider">{company.symbol}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-border/60 rounded text-muted">{company.sector}</span>
          </div>
          <h2 className="text-base font-bold text-primary leading-snug">{company.name}</h2>
        </div>
        <div className="flex items-end gap-2 mb-1">
          <span className="text-4xl font-bold font-mono text-primary leading-none">
            ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className={`flex items-center gap-2 text-sm font-semibold font-mono mb-5 ${isPos ? 'text-gain' : 'text-loss'}`}>
          <span>{isPos ? '+' : ''}₹{Math.abs(company.change).toFixed(2)}</span>
          <span>({isPos ? '+' : ''}{company.changePercent.toFixed(2)}%)</span>
          <span className="text-xs text-muted font-normal">today</span>
        </div>
        {/* 52W range bar */}
        <div className="flex justify-between text-[10px] text-muted mb-1.5">
          <span>52W Low ₹{low.toLocaleString('en-IN')}</span>
          <span>52W High ₹{high.toLocaleString('en-IN')}</span>
        </div>
        <div className="relative h-2 bg-border rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-loss via-gold to-gain opacity-30 rounded-full" />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-gold bg-terminal"
            style={{ left: `calc(${pct}% - 7px)` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3">
            <p className="text-[10px] text-muted mb-1 uppercase tracking-wide">{s.label}</p>
            <p className={`text-base font-bold font-mono ${s.color || 'text-primary'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Latest Financials */}
      {latest && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-3 font-semibold">Last reported year — {latest.year}</p>
          <div className="space-y-2.5">
            {[
              { label: 'Revenue',          value: fmt(latest.revenue) },
              { label: 'Net Profit (PAT)', value: fmt(latest.pat),                       color: latest.pat > 0 ? 'text-gain' : 'text-loss' },
              { label: 'EBITDA Margin',    value: `${latest.ebitdaMargin.toFixed(1)}%`,  color: latest.ebitdaMargin >= 20 ? 'text-gain' : latest.ebitdaMargin >= 12 ? 'text-gold' : 'text-primary' },
              { label: 'Net Margin',       value: `${latest.netMargin.toFixed(1)}%` },
              { label: 'EPS',              value: `₹${latest.eps.toFixed(1)}` },
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
            type="number" min={min} max={max} step={step} value={value}
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
        style={{ background: `linear-gradient(to right, #34d399 0%, #34d399 ${pct}%, #0f2416 ${pct}%, #0f2416 100%)` }}
      />
      {hint && <p className="text-xs text-muted/70 mt-1.5 font-mono leading-snug">{hint}</p>}
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
  if (!company || financials.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
      <p className="text-sm text-muted">No financial data available for this stock</p>
    </div>
  );

  const latest = financials[financials.length - 1];
  const sectorProfile = getSectorProfile(company.sector);

  return (
    <div className="px-4 pt-4 pb-32 space-y-4">
      {/* Verdict */}
      <VerdictCard company={company} financials={financials} assumptions={assumptions} />

      {/* Assumptions */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Pencil size={12} className="text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-primary">Your assumptions</h3>
          <span className="ml-auto text-[10px] text-gold font-mono bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded">
            {sectorProfile.sectorLabel}
          </span>
        </div>
        <p className="text-xs text-muted -mt-3">Adjust these sliders to see how the target price changes</p>
        <MobileSlider
          label="Revenue Growth" value={assumptions.revenueGrowthRate}
          min={1} max={50} step={0.5} suffix="%" color="text-accent"
          onChange={(v) => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
          hint={`How fast do you think sales will grow? Actual last year: ${latest.revenueGrowth.toFixed(1)}%`}
        />
        {sectorProfile.model !== 'pb' && (
          <MobileSlider
            label="Net Margin" value={assumptions.netMarginAssumption}
            min={1} max={50} step={0.5} suffix="%" color="text-gain"
            onChange={(v) => setAssumptions(a => ({ ...a, netMarginAssumption: v }))}
            hint={`Of ₹100 earned, how much stays as profit? Actual: ${latest.netMargin.toFixed(1)}%`}
          />
        )}
        <MobileSlider
          label={sectorProfile.exitMultipleLabel}
          value={assumptions.exitMultiple}
          min={sectorProfile.exitMultipleMin}
          max={sectorProfile.exitMultipleMax}
          step={sectorProfile.exitMultipleStep}
          suffix="x" color="text-gold"
          onChange={(v) => setAssumptions(a => ({ ...a, exitMultiple: v, exitPE: v }))}
          hint={
            sectorProfile.model === 'pe' ? `At what P/E will you sell? Current: ${company.pe.toFixed(1)}x` :
            sectorProfile.model === 'pb' ? `At what P/B will you sell? Current: ${company.pb.toFixed(1)}x` :
            `Sector default: ${sectorProfile.defaultExitMultiple}x`
          }
        />
        <div>
          <p className="text-sm text-muted mb-2">How many years are you projecting?</p>
          <div className="flex gap-2">
            {[3, 5, 7, 10].map((y) => (
              <button
                key={y}
                onClick={() => setAssumptions(a => ({ ...a, years: y }))}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold font-mono transition-all active:scale-95 ${
                  assumptions.years === y ? 'bg-gold text-terminal' : 'bg-border/60 text-muted'
                }`}
              >
                {y}Y
              </button>
            ))}
          </div>
        </div>
      </div>

      <ForecastChart financials={financials} assumptions={assumptions} />
      <ScenarioCards financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} company={company} />
      <ValuationEngine company={company} financials={financials} assumptions={assumptions} />
      <WhatMustHappen company={company} financials={financials} assumptions={assumptions} />
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
    <div className="px-4 pt-4 pb-32 space-y-4">
      {/* Bug fix: pass financials to AIOverview */}
      <AIOverview company={company} financials={financials} />
      <HistoricalValuationChart company={company} />
      <IndustryBenchmarks company={company} financials={financials} />
    </div>
  );
}

// ─── Peers View ───────────────────────────────────────────────────────────────
function PeersView({ company, isLoading, error, onRetry }: {
  company: Company | null; isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (!company) return null;
  return (
    <div className="pt-4 pb-32">
      <div className="px-4 mb-3">
        <h3 className="text-sm font-semibold text-primary">Peer Comparison</h3>
        <p className="text-xs text-muted mt-0.5">How {company.symbol} compares to sector peers — scroll right</p>
      </div>
      <div className="overflow-x-auto px-4">
        <PeerCompare company={company} />
      </div>
    </div>
  );
}

// ─── Financials View ──────────────────────────────────────────────────────────
function FinancialsView({ financials, isLoading, error, onRetry }: {
  financials: FinancialYear[]; isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (financials.length === 0) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-muted px-6 text-center">No financial history available for this stock</p>
    </div>
  );
  return (
    <div className="pt-4 pb-32">
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
  // Persist tab component instances to prevent re-mount (avoids re-fetch on tab switch)
  const mountedTabs = useRef<Set<MobileTab>>(new Set(['search']));

  function handleSelect(symbol: string) {
    onSelect(symbol);
    setActiveTab('overview');
  }

  function handleTabChange(tab: MobileTab) {
    mountedTabs.current.add(tab);
    setActiveTab(tab);
  }

  return (
    <div className="flex flex-col min-h-screen bg-terminal lg:hidden">
      <MobileHeader company={company} activeTab={activeTab} />

      <main className="flex-1 overflow-y-auto overscroll-none">
        {/* Always mounted views (no re-fetch on revisit) */}
        <div className={activeTab === 'search' ? '' : 'hidden'}>
          <SearchView onSelect={handleSelect} selectedSymbol={selectedSymbol} />
        </div>

        {mountedTabs.current.has('overview') && (
          <div className={activeTab === 'overview' ? '' : 'hidden'}>
            <OverviewView
              company={company} financials={financials} assumptions={assumptions}
              isLoading={isLoading} error={error} onRetry={onRetry}
            />
          </div>
        )}

        {mountedTabs.current.has('valuation') && (
          <div className={activeTab === 'valuation' ? '' : 'hidden'}>
            <ValuationView
              company={company} financials={financials}
              assumptions={assumptions} setAssumptions={setAssumptions}
              isLoading={isLoading} error={error} onRetry={onRetry}
            />
          </div>
        )}

        {mountedTabs.current.has('ai') && (
          <div className={activeTab === 'ai' ? '' : 'hidden'}>
            <AIView company={company} financials={financials} isLoading={isLoading} error={error} onRetry={onRetry} />
          </div>
        )}

        {mountedTabs.current.has('peers') && (
          <div className={activeTab === 'peers' ? '' : 'hidden'}>
            <PeersView company={company} isLoading={isLoading} error={error} onRetry={onRetry} />
          </div>
        )}

        {mountedTabs.current.has('financials') && (
          <div className={activeTab === 'financials' ? '' : 'hidden'}>
            <FinancialsView financials={financials} isLoading={isLoading} error={error} onRetry={onRetry} />
          </div>
        )}
      </main>

      <BottomNav active={activeTab} onChange={handleTabChange} hasCompany={!!company} />
    </div>
  );
}
