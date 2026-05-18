'use client';

import { useState, useCallback, useRef } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getSectorProfile, getIndustryCagr } from '@/lib/sectorModelMap';
import { suggestAssumptions } from '@/lib/forecastUtils';

// ── Session-level cache — survives re-renders, cleared on page refresh ────────
// Like a hedge fund's in-memory data store — once fetched, instant on re-visit
const _sessionCache = new Map<string, { company: Company; financials: FinancialYear[] }>();
// Track in-flight prefetch promises to avoid duplicate network calls
const _inflight = new Map<string, Promise<void>>();
import CompanySearch from '@/components/CompanySearch';
import CompanyHeader from '@/components/CompanyHeader';
import KeyMetrics from '@/components/KeyMetrics';
import AIOverview from '@/components/AIOverview';
import FinancialsTable from '@/components/FinancialsTable';
import ScenarioCards from '@/components/ScenarioCards';
import SensitivityMatrix from '@/components/SensitivityMatrix';
import IndustryBenchmarks from '@/components/IndustryBenchmarks';
import ValuationEngine from '@/components/ValuationEngine';
import EarningsQuality from '@/components/EarningsQuality';
import WhatMustHappen from '@/components/WhatMustHappen';
import HistoricalValuationChart from '@/components/HistoricalValuationChart';
import ForecastChart from '@/components/ForecastChart';
import PeerCompare from '@/components/PeerCompare';
import MobileLayout, { RobuLogo } from '@/components/MobileLayout';

const QUICK_PICKS = ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','WIPRO','BAJFINANCE','KAYNES','TATAMOTORS','SBIN','ADANIENT','BHARTIARTL'];

type ActiveView = 'valuation' | 'financials' | 'peers';

// ─── Nav item definition ───────────────────────────────────────────────────────
const NAV_ITEMS: { view: ActiveView; icon: string; label: string; badge?: string }[] = [
  { view: 'valuation',  icon: '◈',  label: 'Valuation'  },
  { view: 'financials', icon: '📋', label: 'Financials'  },
  { view: 'peers',      icon: '👥', label: 'Peer Compare', badge: 'NEW' },
];

export default function Home() {
  const [company, setCompany]       = useState<Company | null>(null);
  const [financials, setFinancials] = useState<FinancialYear[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [homeMode, setHomeMode]     = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('valuation');
  const [autoFillLabel, setAutoFillLabel] = useState<string | null>(null); // "Analyst · High confidence"
  const [assumptions, setAssumptions] = useState<ValuationAssumptions>({
    revenueGrowthRate: 15,
    netMarginAssumption: 20,
    exitPE: 25,
    exitMultiple: 25,
    years: 5,
  });

  // ── Core fetch logic (shared by load + prefetch) ─────────────────────────
  async function _fetchSymbol(symbol: string): Promise<{ company: Company; financials: FinancialYear[] }> {
    const [companyRes, financialsRes] = await Promise.all([
      fetch(`/api/company/${symbol}`, { cache: 'no-store' }),
      fetch(`/api/financials/${symbol}`, { cache: 'no-store' }),
    ]);
    if (!companyRes.ok) {
      const err = await companyRes.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load ${symbol}`);
    }
    const companyData: Company = await companyRes.json();
    let fins: FinancialYear[] = [];
    if (financialsRes.ok) {
      fins = await financialsRes.json();
      const sharesInCr = companyData.shares && companyData.shares > 0 ? companyData.shares : 1;
      fins = fins.map(f => ({ ...f, shares: f.shares && f.shares > 0 ? f.shares : sharesInCr }));
    }
    return { company: companyData, financials: fins };
  }

  // ── Load company — checks session cache first ─────────────────────────────
  const loadCompany = useCallback(async (symbol: string) => {
    setIsLoading(true);
    setError(null);
    setActiveView('valuation');

    // Cache hit → instant render, no spinner
    if (_sessionCache.has(symbol)) {
      const cached = _sessionCache.get(symbol)!;
      setCompany(cached.company);
      setFinancials(cached.financials);
      _applyAssumptions(cached.company, cached.financials);
      setIsLoading(false);
      return;
    }

    setCompany(null);
    setFinancials([]);

    try {
      // If a prefetch is already in-flight for this symbol, wait for it
      if (_inflight.has(symbol)) await _inflight.get(symbol);
      // Then try cache again (prefetch may have just populated it)
      if (_sessionCache.has(symbol)) {
        const cached = _sessionCache.get(symbol)!;
        setCompany(cached.company);
        setFinancials(cached.financials);
        _applyAssumptions(cached.company, cached.financials);
        setIsLoading(false);
        return;
      }
      const result = await _fetchSymbol(symbol);
      _sessionCache.set(symbol, result);
      setCompany(result.company);
      setFinancials(result.financials);
      _applyAssumptions(result.company, result.financials);
    } catch (err: any) {
      setError(err.message || 'Failed to load company data');
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply assumptions — intelligent auto-fill ────────────────────────────
  // Uses suggestAssumptions() which:
  //   1. Reads analyst consensus growth from Yahoo Finance (earningsGrowth)
  //   2. Falls back to historical revenue CAGR from financials[]
  //   3. Fades that growth toward India sector CAGR over the forecast period
  //   4. Sets net margin from recent 3yr average actuals
  //   5. Sets exit multiple from sector-appropriate default
  // → User sees pre-filled, intelligent numbers on load. Zero manual input needed.
  function _applyAssumptions(companyData: Company, fins: FinancialYear[]) {
    const sectorProfile  = getSectorProfile(companyData.sector);
    const industryCagr   = getIndustryCagr(companyData.sector);
    const suggested      = suggestAssumptions(
      companyData,
      fins,
      industryCagr,
      sectorProfile.defaultExitMultiple,
      5,
    );

    setAssumptions({
      revenueGrowthRate:   suggested.revenueGrowthRate,
      netMarginAssumption: suggested.netMarginAssumption,
      exitPE:  Math.min(Math.max(Math.round(companyData.pe || 25), 5), 100),
      exitMultiple: suggested.exitMultiple,
      years: 5,
    });

    // Badge shown near the sliders: where did this number come from?
    const sourceLabel =
      suggested.source === 'analyst_guidance' ? '⚡ Analyst consensus' :
      suggested.source === 'historical_cagr'  ? '📈 Historical CAGR' :
                                                '🏭 Sector baseline';
    setAutoFillLabel(`${sourceLabel} · ${suggested.confidence} confidence · ${suggested.rationale}`);
  }

  // ── Prefetch on hover — fires 200ms after hover to avoid noise ────────────
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handlePrefetch(symbol: string) {
    if (_sessionCache.has(symbol) || _inflight.has(symbol)) return;
    prefetchTimer.current = setTimeout(() => {
      const p = _fetchSymbol(symbol)
        .then(result => { _sessionCache.set(symbol, result); })
        .catch(() => {})
        .finally(() => { _inflight.delete(symbol); });
      _inflight.set(symbol, p);
    }, 200);
  }
  function cancelPrefetch() {
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
  }

  function handleSelect(symbol: string) {
    cancelPrefetch();
    setSelectedSymbol(symbol);
    setHomeMode(false);
    loadCompany(symbol);
  }

  function goHome() {
    setHomeMode(true);
    setCompany(null);
    setFinancials([]);
    setError(null);
    setSelectedSymbol('');
    setActiveView('valuation');
  }

  const latest = financials.length > 0 ? financials[financials.length - 1] : null;

  return (
    <>
    {/* ═══════════════════ MOBILE ═══════════════════ */}
    <MobileLayout
      company={company}
      financials={financials}
      selectedSymbol={selectedSymbol}
      isLoading={isLoading}
      error={error}
      assumptions={assumptions}
      setAssumptions={setAssumptions}
      onSelect={handleSelect}
      onRetry={() => loadCompany(selectedSymbol)}
    />

    {/* ═══════════════════ DESKTOP ══════════════════ */}
    <div className="hidden md:flex h-screen bg-terminal flex-col overflow-hidden">

      {/* ── Header ────────────────────────────────────────── */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex-shrink-0">
        <div className="flex items-center justify-between px-5 py-2.5">
          <button onClick={goHome} className="flex items-center gap-3 group">
            <RobuLogo size={28} />
            <div className="text-left">
              <p className="text-sm font-bold text-primary tracking-tight group-hover:text-gold transition-colors">Robu Terminal</p>
              <p className="text-[11px] text-muted leading-none">Indian Equities Research</p>
            </div>
          </button>

          {!homeMode && (
            <div className="w-[480px]">
              <CompanySearch onSelect={handleSelect} selectedSymbol={selectedSymbol} />
            </div>
          )}

          <div className="w-[80px]" />
        </div>
      </header>

      {/* ── Home landing ──────────────────────────────────── */}
      {homeMode && (
        <main className="flex-1 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-[740px] px-8 py-12 flex flex-col items-center">
            <RobuLogo size={72} />
            <h1 className="mt-6 text-4xl font-bold text-primary tracking-tight">Robu Terminal</h1>
            <p className="mt-3 text-base text-muted text-center">
              Institutional-grade valuation for every Indian stock
            </p>
            <div className="w-full mt-12 [&_input]:text-base [&_input]:py-4 [&_input]:pl-12 [&_input]:pr-10 [&_input]:rounded-xl [&_svg]:w-5 [&_svg]:h-5">
              <CompanySearch onSelect={handleSelect} selectedSymbol={selectedSymbol} />
            </div>
            <div className="w-full mt-8">
              <p className="text-[11px] uppercase tracking-widest text-muted mb-3 font-medium">Popular</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PICKS.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleSelect(sym)}
                    className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-card border border-border text-muted hover:text-primary hover:border-gold/40 transition-all"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-14 text-xs text-muted/40 text-center">
              Search any NSE or BSE listed company by name or symbol
            </p>
          </div>
        </main>
      )}

      {/* ── Stock analysis layout ─────────────────────────── */}
      {!homeMode && (
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT NAV SIDEBAR ─────────────────────────── */}
          <aside className="w-[168px] flex-shrink-0 border-r border-border bg-card/30 flex flex-col overflow-hidden">

            {/* Navigation */}
            <div className="p-2 pt-3">
              <p className="text-[9px] text-muted/60 uppercase tracking-[1.2px] font-medium px-2 mb-1.5">Analyse</p>
              {NAV_ITEMS.map(item => (
                <button
                  key={item.view}
                  onClick={() => setActiveView(item.view)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all mb-0.5 ${
                    activeView === item.view
                      ? 'bg-gold/10 text-gold border border-gold/20'
                      : 'text-muted hover:bg-border/50 hover:text-primary border border-transparent'
                  }`}
                >
                  <span className="text-sm w-4 text-center flex-shrink-0">{item.icon}</span>
                  <span className="text-[11px] font-medium leading-tight flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-gold/15 text-gold border border-gold/20 leading-none">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}

              <div className="my-3 border-t border-border/60" />

              {/* Quick picks */}
              <p className="text-[9px] text-muted/60 uppercase tracking-[1.2px] font-medium px-2 mb-1.5">Quick Select</p>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {QUICK_PICKS.map((sym) => (
                <button
                  key={sym}
                  onClick={() => handleSelect(sym)}
                  onMouseEnter={() => handlePrefetch(sym)}
                  onMouseLeave={cancelPrefetch}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] font-mono transition-all mb-0.5 ${
                    selectedSymbol === sym
                      ? 'bg-gold text-terminal font-bold'
                      : 'text-muted hover:bg-border/60 hover:text-primary'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </aside>

          {/* ── CENTER MAIN CONTENT ───────────────────────── */}
          <main className="flex-1 overflow-y-auto min-w-0">
            {isLoading ? (
              <SkeletonView symbol={selectedSymbol} />
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                  <p className="text-sm text-loss font-medium mb-1">Failed to load {selectedSymbol}</p>
                  <p className="text-xs text-muted mb-3">{error}</p>
                  <button onClick={() => loadCompany(selectedSymbol)} className="px-3 py-1.5 bg-gold/10 border border-gold/30 rounded text-xs text-gold hover:bg-gold/20">
                    Retry
                  </button>
                </div>
              </div>
            ) : company ? (
              <div className="p-4 space-y-4">
                {/* Company header — always visible */}
                <CompanyHeader company={company} />

                {/* ── VIEW: VALUATION ── */}
                {activeView === 'valuation' && financials.length > 0 && (
                  <>
                    {/* Assumptions panel */}
                    {(() => {
                      const sectorProfile = getSectorProfile(company.sector);
                      return (
                        <div className="bg-card border border-border rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            <h3 className="text-sm font-semibold text-primary">Valuation Assumptions</h3>
                            <span className="ml-auto text-[11px] text-gold font-mono bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded">
                              {sectorProfile.sectorLabel} — {sectorProfile.exitMultipleLabel}
                            </span>
                          </div>
                          {/* Auto-fill badge — shows where the numbers came from */}
                          {autoFillLabel && (
                            <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg bg-border/30 border border-border">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                              </svg>
                              <p className="text-[10px] text-muted leading-tight flex-1">{autoFillLabel}</p>
                              <button
                                onClick={() => setAutoFillLabel(null)}
                                className="text-[10px] text-muted/50 hover:text-muted ml-1 flex-shrink-0"
                                title="Dismiss"
                              >✕</button>
                            </div>
                          )}
                          <div className="grid grid-cols-4 gap-4">
                            <SliderInput
                              label="Revenue Growth" value={assumptions.revenueGrowthRate}
                              min={1} max={50} step={0.5} suffix="%" color="text-accent"
                              onChange={(v) => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
                              hint={`Fades to ${getIndustryCagr(company.sector)}% India ${company.sector} CAGR`}
                            />
                            {sectorProfile.model !== 'pb' && (
                              <SliderInput
                                label="Net Margin" value={assumptions.netMarginAssumption}
                                min={1} max={50} step={0.5} suffix="%" color="text-gain"
                                onChange={(v) => setAssumptions(a => ({ ...a, netMarginAssumption: v }))}
                                hint={`${latest?.year} actual: ${latest?.netMargin.toFixed(1)}%`}
                              />
                            )}
                            {sectorProfile.model === 'pb' && (
                              <SliderInput
                                label="Book Value Growth" value={assumptions.revenueGrowthRate}
                                min={1} max={40} step={0.5} suffix="%" color="text-gain"
                                onChange={(v) => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
                                hint={`ROE: ${company.roe.toFixed(1)}% → proxy for BV growth`}
                              />
                            )}
                            <SliderInput
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
                                `Sector default: ${sectorProfile.defaultExitMultiple}x`
                              }
                            />
                            <div>
                              <p className="text-xs text-muted mb-1.5">Horizon</p>
                              <div className="flex gap-1.5 flex-wrap">
                                {[3,5,7,10].map(y => (
                                  <button
                                    key={y}
                                    onClick={() => setAssumptions(a => ({ ...a, years: y }))}
                                    className={`flex-1 min-w-[36px] py-1.5 rounded text-xs font-semibold transition-all ${
                                      assumptions.years === y ? 'bg-gold text-terminal' : 'bg-border text-muted hover:text-primary'
                                    }`}
                                  >
                                    {y}Y
                                  </button>
                                ))}
                              </div>
                              <p className="text-xs text-muted mt-2">Projection years</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <ForecastChart financials={financials} assumptions={assumptions} />
                    <ScenarioCards financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} company={company} />
                    <SensitivityMatrix financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} company={company} />
                    <ValuationEngine company={company} financials={financials} assumptions={assumptions} />
                    <WhatMustHappen company={company} financials={financials} assumptions={assumptions} />
                  </>
                )}

                {activeView === 'valuation' && financials.length === 0 && (
                  <p className="text-sm text-muted text-center py-8">No financial data available for {company.symbol}</p>
                )}

                {/* ── VIEW: FINANCIALS ── */}
                {activeView === 'financials' && (
                  <>
                    <KeyMetrics company={company} financials={financials} />
                    {financials.length > 0 && (
                      <>
                        <FinancialsTable financials={financials} />
                        <EarningsQuality financials={financials} />
                      </>
                    )}
                  </>
                )}

                {/* ── VIEW: PEERS ── */}
                {activeView === 'peers' && (
                  <PeerCompare company={company} />
                )}
              </div>
            ) : null}
          </main>

          {/* ── RIGHT PANEL — AI + Historical (persistent) ── */}
          <aside className="w-[290px] flex-shrink-0 border-l border-border bg-card/30 overflow-y-auto">
            {company ? (
              <div className="p-3 space-y-3">
                <AIOverview company={company} />
                <HistoricalValuationChart company={company} />
                <IndustryBenchmarks company={company} financials={financials} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted px-4 text-center">Select a company to view analysis</p>
              </div>
            )}
          </aside>

        </div>
      )}

    </div>
    {/* end desktop */}
    </>
  );
}

/* ── SkeletonView — shown while loading, feels much faster than a spinner ── */
function SkeletonView({ symbol }: { symbol: string }) {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Company header skeleton */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-border/60" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-border/60" />
            <div className="h-3 w-20 rounded bg-border/40" />
          </div>
        </div>
        <div className="text-right space-y-2">
          <div className="h-6 w-24 rounded bg-border/60 ml-auto" />
          <div className="h-3 w-16 rounded bg-border/40 ml-auto" />
        </div>
      </div>

      {/* Key metrics row skeleton */}
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="h-3 w-12 rounded bg-border/40" />
            <div className="h-5 w-16 rounded bg-border/60" />
          </div>
        ))}
      </div>

      {/* Assumptions panel skeleton */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="h-4 w-44 rounded bg-border/60 mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded bg-border/40" />
              <div className="h-1 w-full rounded bg-border/60" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart skeleton */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="h-4 w-48 rounded bg-border/60 mb-4" />
        <div className="h-[180px] w-full rounded bg-border/30 flex items-end gap-2 px-2 pb-2">
          {[60,80,55,90,70,85,65,95].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-border/50" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>

      {/* Scenario cards skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {['Bear','Base','Bull'].map(s => (
          <div key={s} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-border/40" />
            <div className="h-6 w-24 rounded bg-border/60" />
            <div className="h-3 w-12 rounded bg-border/40" />
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted/40 pt-2 font-mono">
        loading {symbol}…
      </p>
    </div>
  );
}

/* ── SliderInput ─────────────────────────────────────────────────────────── */
function SliderInput({
  label, value, min, max, step, suffix, color, onChange, hint,
}: {
  label: string; value: number; min: number; max: number;
  step: number; suffix: string; color: string;
  onChange: (v: number) => void; hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-muted">{label}</p>
        <div className="flex items-center gap-0.5">
          <input
            type="number" min={min} max={max} step={step} value={value}
            onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(Math.min(Math.max(n, min), max)); }}
            className={`w-14 text-right text-sm font-bold font-mono bg-transparent border-b border-border focus:border-gold focus:outline-none ${color} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
          <span className={`text-sm font-bold font-mono ${color}`}>{suffix}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #34d399 0%, #34d399 ${pct}%, #0f2416 ${pct}%, #0f2416 100%)` }}
      />
      {hint && <p className="text-xs text-muted mt-1 font-mono">{hint}</p>}
    </div>
  );
}
