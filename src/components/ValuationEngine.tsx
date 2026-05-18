'use client';

import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getSectorProfile } from '@/lib/sectorModelMap';
import {
  runPrimaryModel,
  peModel,
  pegModel,
  earningsYieldModel,
  impliedGrowthRate,
  RISK_FREE_RATE,
} from '@/lib/forecastUtils';
import { BENCHMARKS, DEFAULT_BENCHMARK } from './IndustryBenchmarks';

interface ValuationEngineProps {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

// ─── Method card ─────────────────────────────────────────────────────────────
function MethodCard({
  method, desc, fairValue, currentPrice, primary = false,
}: {
  method: string; desc: string; fairValue: number; currentPrice: number; primary?: boolean;
}) {
  const upside  = fairValue > 0 ? (fairValue / currentPrice - 1) * 100 : 0;
  const isUp    = upside >= 0;

  return (
    <div className={`rounded-xl p-3.5 border transition-all ${
      primary
        ? 'border-gold bg-gold/5 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]'
        : 'border-border bg-card'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-semibold ${primary ? 'text-gold' : 'text-muted'}`}>{method}</span>
        {primary && (
          <span className="text-[10px] font-bold text-terminal bg-gold px-1.5 py-0.5 rounded tracking-wide">
            PRIMARY
          </span>
        )}
      </div>
      <p className="text-lg font-bold font-mono text-primary mb-0.5">
        {fairValue > 0
          ? `₹${fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
          : '—'}
      </p>
      <p className={`text-sm font-semibold font-mono mb-1 ${isUp ? 'text-gain' : 'text-loss'}`}>
        {fairValue > 0 ? `${isUp ? '+' : ''}${upside.toFixed(1)}%` : '—'}
      </p>
      <p className="text-[11px] text-muted leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, color, sub }: {
  label: string; value: string; color: string; sub?: string;
}) {
  return (
    <div className="bg-border/20 rounded-lg p-3 text-center">
      <p className="text-[11px] text-muted mb-1">{label}</p>
      <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ValuationEngine({ company, financials, assumptions }: ValuationEngineProps) {
  if (!financials.length) return null;

  const profile = getSectorProfile(company.sector);
  const model   = profile.model;

  // ── Primary model (sector-appropriate) ───────────────────────────────────
  const primaryResult = runPrimaryModel(
    model,
    financials,
    company,
    assumptions.revenueGrowthRate,
    assumptions.netMarginAssumption,
    assumptions.exitMultiple,
    assumptions.years,
  );

  // ── Cross-check: always run PE for non-banking sectors, for reference ─────
  const bench = BENCHMARKS[company.sector] || DEFAULT_BENCHMARK;
  const latest = financials[financials.length - 1];

  // Forward PE cross-check (always shown, even if not primary)
  const peCheck = model !== 'pe'
    ? peModel(financials, company, assumptions.revenueGrowthRate, assumptions.netMarginAssumption, assumptions.exitPE, assumptions.years)
    : null;

  // PEG ratio
  const pegResult = pegModel(financials, company);

  // Earnings yield
  const eyResult  = earningsYieldModel(financials, company);

  // Sector PE check (what it would be worth at the industry P/E)
  const validEPS      = financials.filter(f => f.eps > 0);
  const lastValidEPS  = validEPS[validEPS.length - 1];
  const sectorPECheck = lastValidEPS
    ? { fairValue: lastValidEPS.eps * bench.pe, desc: `EPS × ${bench.label} median P/E (${bench.pe}x)` }
    : null;

  // ── Composite fair value ─────────────────────────────────────────────────
  const allFVs = [
    primaryResult.fairValue,
    pegResult.fairValue,
    eyResult.fairValue,
    sectorPECheck?.fairValue ?? 0,
  ].filter(v => v > 0);

  const compositeFV   = allFVs.length > 0 ? allFVs.reduce((a, b) => a + b, 0) / allFVs.length : 0;
  const compositeUp   = compositeFV > 0 ? (compositeFV / company.currentPrice - 1) * 100 : 0;
  const compositeCAGR = compositeFV > 0
    ? (Math.pow(Math.max(compositeFV / company.currentPrice, 0.001), 1 / assumptions.years) - 1) * 100
    : 0;

  // Margin of safety
  const mos = compositeFV > 0 ? ((compositeFV - company.currentPrice) / compositeFV) * 100 : 0;

  // Implied growth baked into current price
  const impliedG = impliedGrowthRate(financials, company, assumptions.netMarginAssumption, assumptions.exitPE, assumptions.years);

  // Current PEG
  const currentPEG = pegResult.currentPEG;

  // Verdict
  const verdict =
    compositeUp >= 30  ? { text: 'Potentially Undervalued', cls: 'text-gain bg-gain/10 border-gain/20' } :
    compositeUp <= -20 ? { text: 'Potentially Overvalued',  cls: 'text-loss bg-loss/10 border-loss/20' } :
                         { text: 'Fairly Valued Range',     cls: 'text-gold bg-gold/10 border-gold/20' };

  // ── Model badge label ─────────────────────────────────────────────────────
  const modelBadge =
    model === 'pb'       ? 'P/B Model — Financials' :
    model === 'ev_ebitda'? 'EV/EBITDA Model' :
    model === 'ev_sales' ? 'EV/Sales Model' :
                           'P/E Model';

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-primary">Valuation Engine</h3>
            <p className="text-[11px] text-muted mt-0.5 leading-tight">{profile.multipleRationale}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-bold text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded font-mono">
            {modelBadge}
          </span>
          <div className={`text-xs px-2 py-1 rounded border font-semibold ${verdict.cls}`}>
            {verdict.text}
          </div>
        </div>
      </div>

      {/* ── Composite fair value ── */}
      <div className="bg-border/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted mb-1">
            Composite Fair Value
            <span className="text-muted/60 ml-1">(avg of {allFVs.length} methods)</span>
          </p>
          <p className="text-2xl font-bold font-mono text-gold">
            {compositeFV > 0
              ? `₹${compositeFV.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
              : '—'}
          </p>
          <p className="text-xs text-muted mt-1">
            Current ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-right space-y-2">
          <div>
            <p className="text-xs text-muted">Upside / Downside</p>
            <p className={`text-xl font-bold font-mono ${compositeUp >= 0 ? 'text-gain' : 'text-loss'}`}>
              {compositeUp >= 0 ? '+' : ''}{compositeUp.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Expected CAGR</p>
            <p className={`text-sm font-bold font-mono ${compositeCAGR >= 15 ? 'text-gain' : compositeCAGR >= 0 ? 'text-gold' : 'text-loss'}`}>
              {compositeCAGR.toFixed(1)}% p.a.
            </p>
          </div>
        </div>
      </div>

      {/* ── Method cards ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Primary sector model — always first, always highlighted */}
        <MethodCard
          method={primaryResult.model}
          desc={primaryResult.desc}
          fairValue={primaryResult.fairValue}
          currentPrice={company.currentPrice}
          primary={true}
        />

        {/* PEG Ratio cross-check */}
        <MethodCard
          method={pegResult.model}
          desc={pegResult.desc}
          fairValue={pegResult.fairValue}
          currentPrice={company.currentPrice}
        />

        {/* For non-PE sectors, show the PE cross-check; otherwise show sector PE */}
        {peCheck ? (
          <MethodCard
            method="Forward P/E (cross-check)"
            desc={peCheck.desc}
            fairValue={peCheck.fairValue}
            currentPrice={company.currentPrice}
          />
        ) : sectorPECheck ? (
          <MethodCard
            method="Sector P/E"
            desc={sectorPECheck.desc}
            fairValue={sectorPECheck.fairValue}
            currentPrice={company.currentPrice}
          />
        ) : null}

        {/* Earnings yield */}
        <MethodCard
          method={eyResult.model}
          desc={eyResult.desc}
          fairValue={eyResult.fairValue}
          currentPrice={company.currentPrice}
        />
      </div>

      {/* ── Key signals ── */}
      <div className="grid grid-cols-4 gap-3">
        <StatPill
          label="Margin of Safety"
          value={`${mos.toFixed(1)}%`}
          color={mos >= 25 ? 'text-gain' : mos >= 0 ? 'text-gold' : 'text-loss'}
          sub={mos >= 25 ? 'Good buffer' : mos >= 0 ? 'Thin buffer' : 'Overpriced'}
        />
        <StatPill
          label="Implied Growth"
          value={`${impliedG.toFixed(1)}%`}
          color="text-accent"
          sub="Market expects"
        />
        <StatPill
          label="PEG Ratio"
          value={currentPEG > 0 ? currentPEG.toFixed(2) : '—'}
          color={currentPEG < 1 ? 'text-gain' : currentPEG < 2 ? 'text-gold' : 'text-loss'}
          sub={currentPEG < 1 ? '< 1 = cheap' : currentPEG < 2 ? '1–2 = fair' : '> 2 = pricey'}
        />
        <StatPill
          label="Earnings Yield"
          value={`${eyResult.currentEY.toFixed(1)}%`}
          color={eyResult.currentEY > RISK_FREE_RATE ? 'text-gain' : 'text-loss'}
          sub={`vs ${RISK_FREE_RATE}% G-Sec`}
        />
      </div>

      {/* ── Legend ── */}
      <div className="text-[11px] text-muted border-t border-border pt-3 space-y-1 leading-relaxed">
        <p>
          <span className="text-primary font-medium">{primaryResult.model}</span>
          {' '}— primary model for {profile.sectorLabel} sector
          {model === 'pb' && '; banks valued on book value, not earnings'}
          {model === 'ev_ebitda' && '; removes D&A distortion in asset-heavy businesses'}
          {model === 'ev_sales' && '; revenue multiple for pre-profit / high-growth companies'}
        </p>
        <p><span className="text-primary font-medium">PEG Ratio</span> — if EPS grows 20%/yr, fair P/E ≈ 20x (PEG = 1)</p>
        <p><span className="text-primary font-medium">Earnings Yield</span> — compares stock earnings vs Indian G-Sec rate ({RISK_FREE_RATE}%)</p>
        <p><span className="text-primary font-medium">Composite</span> — straight average of all valid methods; reduces single-model bias</p>
      </div>
    </div>
  );
}
