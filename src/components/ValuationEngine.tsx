'use client';

import { useState } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import MethodsDrawer from '@/components/MethodsDrawer';
import { getSectorProfile, getCompanyProfile } from '@/lib/sectorModelMap';
import {
  runPrimaryModel,
  peModel,
  pegModel,
  earningsYieldModel,
  impliedGrowthRate,
  gordonGrowthPB,
  earningsQualityScore,
  evEbitdaModel,
  dcfModel,
  grahamNumber,
  RISK_FREE_RATE,
} from '@/lib/forecastUtils';
import { BENCHMARKS, DEFAULT_BENCHMARK } from './IndustryBenchmarks';
import { Clock } from '@/lib/icons';
import Tooltip from '@/components/Tooltip';

interface ValuationEngineProps {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
  compact?: boolean; // mobile: show only composite FV + stats, collapse method cards
}

// ─── Method card ─────────────────────────────────────────────────────────────
function MethodCard({
  method, desc, fairValue, currentPrice, marginOfSafety = 0, primary = false,
}: {
  method: string; desc: string; fairValue: number; currentPrice: number; marginOfSafety?: number; primary?: boolean;
}) {
  const upside    = fairValue > 0 ? (fairValue / currentPrice - 1) * 100 : 0;
  const isUp      = upside >= 0;
  const buyPrice  = fairValue > 0 ? fairValue * (1 - marginOfSafety / 100) : 0;
  const verdict   = upside >= 20 ? { label: 'UNDERVALUED', cls: 'text-gain bg-gain/10 border-gain/20' }
                  : upside <= -15 ? { label: 'OVERVALUED',  cls: 'text-loss bg-loss/10 border-loss/20' }
                  :                 { label: 'FAIR VALUE',  cls: 'text-gold bg-gold/10 border-gold/20' };

  return (
    <div className={`rounded-xl p-3 border transition-all ${
      primary
        ? 'border-gold bg-gold/5 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]'
        : 'border-border bg-card'
    }`}>
      <div className="flex items-start justify-between mb-1.5 gap-1">
        <span className={`text-[11px] font-semibold leading-tight ${primary ? 'text-gold' : 'text-muted'}`}>{method}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide flex-shrink-0 ${verdict.cls}`}>
          {verdict.label}
        </span>
      </div>
      <p className="text-base font-bold font-mono text-primary mb-0.5">
        {fairValue > 0
          ? `₹${fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
          : '—'}
      </p>
      <p className={`text-sm font-semibold font-mono mb-1 ${isUp ? 'text-gain' : 'text-loss'}`}>
        {fairValue > 0 ? `${isUp ? '+' : ''}${upside.toFixed(1)}%` : '—'}
      </p>
      {buyPrice > 0 && marginOfSafety > 0 && (
        <p className="text-[10px] text-accent font-mono mb-1">
          Buy ≤ ₹{buyPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({marginOfSafety}% MoS)
        </p>
      )}
      <p className="text-[10px] text-muted leading-relaxed line-clamp-3">{desc}</p>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, color, sub }: {
  label: string; value: string; color: string; sub?: string;
}) {
  return (
    <div className="bg-border/20 rounded-lg p-3 text-center min-w-0 overflow-hidden">
      <p className="text-[11px] text-muted mb-1 truncate">{label}</p>
      <p className={`text-base font-bold font-mono ${color} truncate`}>{value}</p>
      {sub && <p className="text-[11px] text-muted mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ValuationEngine({ company, financials, assumptions, compact = false }: ValuationEngineProps) {
  const [showDetails, setShowDetails] = useState(false);
  if (!financials.length) return null;

  const profile = getCompanyProfile(company);
  const model   = profile.model;

  // ── Intelligence layer ────────────────────────────────────────────────────
  const quality = earningsQualityScore(financials);

  // ── The 4 fixed valuation models (always shown regardless of sector) ────────
  const wacc = assumptions.wacc ?? 12;
  const mos_input = assumptions.marginOfSafety ?? 25;

  // 1. DCF — discounted cash flows at WACC
  const dcfResult = dcfModel(
    financials, company,
    assumptions.revenueGrowthRate,
    wacc,
    assumptions.exitMultiple,
    assumptions.years,
  );

  // 2. Graham Number — √(22.5 × EPS × BVPS)
  const grahamResult = grahamNumber(financials, company);

  // 3. PE-based — forward earnings × exit PE
  const peResult = peModel(
    financials, company,
    assumptions.revenueGrowthRate,
    assumptions.netMarginAssumption,
    assumptions.exitPE,
    assumptions.years,
  );

  // 4. EV/EBITDA — enterprise value approach
  const evResult = evEbitdaModel(
    financials, company,
    assumptions.revenueGrowthRate,
    assumptions.exitMultiple,
    assumptions.years,
  );

  // ── Keep legacy models for quality score + other signals ──────────────────
  const bench = BENCHMARKS[company.sector] || DEFAULT_BENCHMARK;
  const latest = financials[financials.length - 1];
  const pegResult = pegModel(financials, company);
  const eyResult  = earningsYieldModel(financials, company);

  // ── Composite fair value — average of all 4 models ───────────────────────
  const allFVs = [dcfResult.fairValue, grahamResult.fairValue, peResult.fairValue, evResult.fairValue].filter(v => v > 0);
  const compositeFV   = allFVs.length > 0 ? allFVs.reduce((a, b) => a + b, 0) / allFVs.length : 0;
  const compositeUp   = compositeFV > 0 ? (compositeFV / company.currentPrice - 1) * 100 : 0;
  const compositeCAGR = compositeFV > 0
    ? (Math.pow(Math.max(compositeFV / company.currentPrice, 0.001), 1 / assumptions.years) - 1) * 100
    : 0;

  // MoS-adjusted buy price
  const buyPrice = compositeFV > 0 ? compositeFV * (1 - mos_input / 100) : 0;
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

  // ── Compact mode (mobile) ─────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        {/* Title + verdict */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">Valuation Engine</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${verdict.cls}`}>
            {verdict.text}
          </span>
        </div>

        {/* Big composite FV */}
        <div className="bg-border/20 rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Composite Fair Value
            <span className="text-muted/60 ml-1">
              {`(avg of ${allFVs.length} methods)`}
            </span>
          </p>
          <div className="flex items-end gap-3 flex-wrap">
            <p className="text-3xl font-bold font-mono text-gold leading-none">
              {compositeFV > 0 ? `₹${compositeFV.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
            </p>
            <div className="mb-1">
              <p className={`text-xl font-bold font-mono leading-none ${compositeUp >= 0 ? 'text-gain' : 'text-loss'}`}>
                {compositeUp >= 0 ? '+' : ''}{compositeUp.toFixed(1)}%
              </p>
              <p className={`text-xs font-mono mt-0.5 ${compositeCAGR >= 15 ? 'text-gain' : compositeCAGR >= 0 ? 'text-gold' : 'text-loss'}`}>
                {compositeCAGR.toFixed(1)}% CAGR
              </p>
            </div>
          </div>
          <p className="text-xs text-muted mt-2">
            Current ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* 4 key signals */}
        <div className="grid grid-cols-2 gap-2">
          <StatPill
            label="Margin of Safety"
            value={`${mos.toFixed(1)}%`}
            color={mos >= 25 ? 'text-gain' : mos >= 0 ? 'text-gold' : 'text-loss'}
            sub={mos >= 25 ? 'Good buffer' : mos >= 0 ? 'Thin buffer' : 'Overpriced'}
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
          <StatPill
            label="Quality Score"
            value={`${quality.score}/100`}
            color={quality.score >= 80 ? 'text-gain' : quality.score >= 60 ? 'text-gold' : quality.score >= 40 ? 'text-warning' : 'text-loss'}
            sub={quality.label}
          />
        </div>

        {/* Drawer trigger */}
        <button
          onClick={() => setShowDetails(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border text-xs text-muted hover:text-primary hover:border-gold/30 transition-all"
        >
          <span>Show all valuation methods ▾</span>
        </button>

        {/* Vaul bottom-sheet drawer */}
        <MethodsDrawer open={showDetails} onClose={() => setShowDetails(false)}>
          {/* 4 Valuation Models */}
          <div className="grid grid-cols-2 gap-3">
            <MethodCard method="DCF" desc={dcfResult.desc} fairValue={dcfResult.fairValue} currentPrice={company.currentPrice} marginOfSafety={mos_input} primary />
            <MethodCard method="Graham Number" desc={grahamResult.desc} fairValue={grahamResult.fairValue} currentPrice={company.currentPrice} marginOfSafety={mos_input} />
            <MethodCard method="PE-Based" desc={peResult.desc} fairValue={peResult.fairValue} currentPrice={company.currentPrice} marginOfSafety={mos_input} />
            <MethodCard method="EV/EBITDA" desc={evResult.desc} fairValue={evResult.fairValue} currentPrice={company.currentPrice} marginOfSafety={mos_input} />
          </div>
          {/* Earnings quality */}
          <div className="bg-border/20 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary mb-0.5">Earnings Quality</p>
              <p className="text-[11px] text-muted leading-relaxed">{quality.breakdown}</p>
            </div>
            <div className="flex-shrink-0 text-center">
              <p className={`text-2xl font-bold font-mono ${quality.score >= 80 ? 'text-gain' : quality.score >= 60 ? 'text-gold' : quality.score >= 40 ? 'text-warning' : 'text-loss'}`}>{quality.score}</p>
              <p className="text-[10px] text-muted">/ 100</p>
            </div>
          </div>
        </MethodsDrawer>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">

      {/* ── Header ── */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <Clock size={13} className="text-gold" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-primary">Valuation Engine</h3>
              <p className="text-[10px] text-muted mt-0.5 leading-tight truncate">{profile.multipleRationale}</p>
            </div>
          </div>
          <div className={`text-[10px] px-2 py-0.5 rounded border font-semibold flex-shrink-0 ${verdict.cls}`}>
            {verdict.text}
          </div>
        </div>
        {/* Badges row — separate line so they never push the title off */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono ${
            quality.score >= 80 ? 'text-gain bg-gain/10 border-gain/25' :
            quality.score >= 60 ? 'text-gold bg-gold/10 border-gold/25' :
            quality.score >= 40 ? 'text-warning bg-warning/10 border-warning/25' :
                                  'text-loss bg-loss/10 border-loss/25'
          }`}>
            {quality.label}
            <Tooltip text={quality.breakdown} position="bottom" />
          </span>
          <span className="text-[10px] font-bold text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded font-mono">
            {modelBadge}
          </span>
        </div>
      </div>

      {/* ── Composite fair value ── */}
      <div className="bg-border/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted mb-1">
            Composite Fair Value
            <span className="text-muted/60 ml-1">
              {`(avg of ${allFVs.length} methods)`}
            </span>
          </p>
          <p className="text-2xl font-bold font-mono text-gold">
            {compositeFV > 0
              ? `₹${compositeFV.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
              : '—'}
          </p>
          <p className="text-xs text-muted mt-1">
            Current ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          {buyPrice > 0 && mos_input > 0 && (
            <p className="text-xs text-accent font-mono mt-1">
              Buy ≤ ₹{buyPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({mos_input}% MoS)
            </p>
          )}
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

      {/* ── 4 Valuation Models — always shown ── */}
      <div className="grid grid-cols-2 gap-3">
        <MethodCard
          method="DCF"
          desc={dcfResult.desc}
          fairValue={dcfResult.fairValue}
          currentPrice={company.currentPrice}
          marginOfSafety={mos_input}
          primary={true}
        />
        <MethodCard
          method="Graham Number"
          desc={grahamResult.desc}
          fairValue={grahamResult.fairValue}
          currentPrice={company.currentPrice}
          marginOfSafety={mos_input}
        />
        <MethodCard
          method="PE-Based"
          desc={peResult.desc}
          fairValue={peResult.fairValue}
          currentPrice={company.currentPrice}
          marginOfSafety={mos_input}
        />
        <MethodCard
          method="EV/EBITDA"
          desc={evResult.desc}
          fairValue={evResult.fairValue}
          currentPrice={company.currentPrice}
          marginOfSafety={mos_input}
        />
      </div>

      {/* ── Earnings quality signal ── */}
      <div className="bg-border/20 rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-xs font-semibold text-primary">Earnings Quality Signal</p>
            <Tooltip text={quality.breakdown} position="top" />
          </div>
          <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
            {quality.breakdown}
          </p>
        </div>
        <div className="flex-shrink-0 text-center">
          <p className={`text-2xl font-bold font-mono ${
            quality.score >= 80 ? 'text-gain' :
            quality.score >= 60 ? 'text-gold' :
            quality.score >= 40 ? 'text-warning' : 'text-loss'
          }`}>{quality.score}</p>
          <p className="text-[10px] text-muted">/ 100</p>
          <p className={`text-[10px] font-bold mt-0.5 ${
            quality.score >= 80 ? 'text-gain' :
            quality.score >= 60 ? 'text-gold' :
            quality.score >= 40 ? 'text-warning' : 'text-loss'
          }`}>{quality.label}</p>
        </div>
      </div>



      {/* ── Key signals ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <span className="text-primary font-medium">DCF</span>
          {' '}— primary model for {profile.sectorLabel} sector
          {model === 'pb' && '; banks valued on book value, not earnings'}
          {model === 'ev_ebitda' && '; removes D&A distortion in asset-heavy businesses'}
          {model === 'ev_sales' && '; revenue multiple for pre-profit / high-growth companies'}
        </p>
        <p><span className="text-primary font-medium">PEG Ratio</span> — if EPS grows 20%/yr, fair P/E ≈ 20x (PEG = 1)</p>
        <p><span className="text-primary font-medium">Earnings Yield</span> — compares stock earnings vs Indian G-Sec rate ({RISK_FREE_RATE}%)</p>
        <p><span className="text-primary font-medium">Earnings Quality</span> — scores 0-100: profit consistency + margin stability + revenue momentum → adjusts exit multiple</p>
        <p><span className="text-primary font-medium">Composite</span> — {model === 'pb' ? '50% Gordon Growth + 50% P/B — banks weighted toward institutional model' : 'avg of all valid methods; reduces single-model bias'}</p>
      </div>
    </div>
  );
}
