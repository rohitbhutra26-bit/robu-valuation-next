'use client';

import { useState } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import MethodsDrawer from '@/components/MethodsDrawer';
import { getCompanyProfile, ValuationModel } from '@/lib/sectorModelMap';
import {
  peModel,
  pegModel,
  earningsYieldModel,
  impliedGrowthRate,
  earningsQualityScore,
  evEbitdaModel,
  dcfModel,
  grahamNumber,
  gordonGrowthPB,
  RISK_FREE_RATE,
} from '@/lib/forecastUtils';
import { Clock } from '@/lib/icons';
import Tooltip from '@/components/Tooltip';

interface ValuationEngineProps {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
  compact?: boolean; // mobile: show only composite FV + stats, collapse method cards
}

// ─── Plain-English explanation for each method ───────────────────────────────
const METHOD_PLAIN: Record<string, string> = {
  'DCF':           'Adds up the cash this business will earn in future, converted to today\'s money.',
  'Graham Number': 'A classic "safe price" check using profits and the company\'s net worth.',
  'PE-Based':      'Estimates future profit, then applies the price the market usually pays for it.',
  'EV/EBITDA':     'Values the whole business including its debt, then works out your share.',
  'Gordon P/B':    'The institutional bank model: worth more than book value only if ROE beats the cost of equity.',
};

// ─── Sector-aware composite weights ──────────────────────────────────────────
// Not all models deserve an equal vote. DCF means little for a bank;
// Graham punishes asset-light compounders. Weights follow how institutional
// desks actually value each sector type.
const COMPOSITE_WEIGHTS: Record<ValuationModel, { dcf: number; graham: number; pe: number; ev: number; gordon: number }> = {
  pe:        { dcf: 0.40, pe: 0.30, ev: 0.20, graham: 0.10, gordon: 0 },
  ev_ebitda: { dcf: 0.35, ev: 0.40, pe: 0.15, graham: 0.10, gordon: 0 },
  ev_sales:  { dcf: 0.35, ev: 0.30, pe: 0.20, graham: 0.15, gordon: 0 },
  pb:        { gordon: 0.50, pe: 0.30, graham: 0.20, dcf: 0, ev: 0 }, // banks: book value, not cash flow
};

// ─── Method card ─────────────────────────────────────────────────────────────
function MethodCard({
  method, desc, fairValue, currentPrice, marginOfSafety = 0, primary = false,
}: {
  method: string; desc: string; fairValue: number; currentPrice: number; marginOfSafety?: number; primary?: boolean;
}) {
  const upside    = fairValue > 0 ? (fairValue / currentPrice - 1) * 100 : 0;
  const isUp      = upside >= 0;
  const buyPrice  = fairValue > 0 ? fairValue * (1 - marginOfSafety / 100) : 0;
  const verdict   = upside >= 20 ? { label: 'Looks cheap',  cls: 'text-gain bg-gain/10 border-gain/20' }
                  : upside <= -15 ? { label: 'Looks pricey', cls: 'text-loss bg-loss/10 border-loss/20' }
                  :                 { label: 'About right',  cls: 'text-gold bg-gold/10 border-gold/20' };

  return (
    <div className={`rounded-xl p-3 border transition-all ${
      primary
        ? 'border-gold bg-gold/5 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]'
        : 'border-border bg-card'
    }`}>
      <div className="flex items-start justify-between mb-1.5 gap-1">
        <span className={`text-[11px] font-semibold leading-tight ${primary ? 'text-gold' : 'text-muted'}`}>{method}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${verdict.cls}`}>
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
      {/* Simple mode sees the plain explanation; Analyst mode sees the formula */}
      {METHOD_PLAIN[method] && (
        <p className="simple-only text-[10px] text-primary/70 leading-relaxed mb-1">{METHOD_PLAIN[method]}</p>
      )}
      <p className="analyst-only text-[10px] text-muted leading-relaxed line-clamp-3 font-mono">{desc}</p>
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
  const pegResult = pegModel(financials, company);
  const eyResult  = earningsYieldModel(financials, company);

  // ── Composite fair value — SECTOR-WEIGHTED, not a flat average ───────────
  // Banks lean on Gordon Growth P/B; industrials on EV/EBITDA; the default
  // book leans on DCF. Methods that fail (fv=0) drop out and weights renormalise.
  const gordonResult = model === 'pb' ? gordonGrowthPB(company, assumptions.revenueGrowthRate) : null;
  const w = COMPOSITE_WEIGHTS[model] ?? COMPOSITE_WEIGHTS.pe;
  const weightedParts = [
    { fv: dcfResult.fairValue,            weight: w.dcf },
    { fv: grahamResult.fairValue,         weight: w.graham },
    { fv: peResult.fairValue,             weight: w.pe },
    { fv: evResult.fairValue,             weight: w.ev },
    { fv: gordonResult?.fairValue ?? 0,   weight: w.gordon },
  ].filter(p => p.fv > 0 && p.weight > 0);
  const weightSum   = weightedParts.reduce((a, p) => a + p.weight, 0);
  const allFVs      = weightedParts.map(p => p.fv); // kept for method count label
  const compositeFV = weightSum > 0
    ? weightedParts.reduce((a, p) => a + p.fv * p.weight, 0) / weightSum
    : 0;
  const compositeUp   = compositeFV > 0 ? (compositeFV / company.currentPrice - 1) * 100 : 0;
  const compositeCAGR = compositeFV > 0
    ? (Math.pow(Math.max(compositeFV / company.currentPrice, 0.001), 1 / assumptions.years) - 1) * 100
    : 0;

  // MoS-adjusted buy price
  const buyPrice = compositeFV > 0 ? compositeFV * (1 - mos_input / 100) : 0;
  const mos = compositeFV > 0 ? ((compositeFV - company.currentPrice) / compositeFV) * 100 : 0;

  // Implied growth baked into current price — measured against a sector-normalized
  // exit multiple (NOT the stock's own current PE, which made the answer circular ≈0%).
  const impliedG = impliedGrowthRate(financials, company, assumptions.netMarginAssumption, assumptions.exitMultiple, assumptions.years);

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
              {`(sector-weighted, ${allFVs.length} methods)`}
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
            {gordonResult && gordonResult.isValid && (
              <MethodCard method="Gordon P/B" desc={gordonResult.desc} fairValue={gordonResult.fairValue} currentPrice={company.currentPrice} marginOfSafety={mos_input} primary />
            )}
            <MethodCard method="DCF" desc={dcfResult.desc} fairValue={dcfResult.fairValue} currentPrice={company.currentPrice} marginOfSafety={mos_input} primary={model !== 'pb'} />
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
          {/* Badge diet: model name is context, not status — muted, analyst-only */}
          <span className="analyst-only text-[10px] text-muted border border-border px-2 py-0.5 rounded font-mono">
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
              {`(sector-weighted, ${allFVs.length} methods)`}
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

      {/* ── Valuation Models — always shown; Gordon P/B joins for banks ── */}
      <div className="grid grid-cols-2 gap-3">
        {gordonResult && gordonResult.isValid && (
          <MethodCard
            method="Gordon P/B"
            desc={gordonResult.desc}
            fairValue={gordonResult.fairValue}
            currentPrice={company.currentPrice}
            marginOfSafety={mos_input}
            primary={true}
          />
        )}
        <MethodCard
          method="DCF"
          desc={dcfResult.desc}
          fairValue={dcfResult.fairValue}
          currentPrice={company.currentPrice}
          marginOfSafety={mos_input}
          primary={model !== 'pb'}
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
          sub="Already in the price"
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

      {/* ── Legend — plain English ── */}
      <div className="text-[11px] text-muted border-t border-border pt-3 space-y-1 leading-relaxed">
        <p>
          <span className="text-primary font-medium">DCF</span>
          {' '}— the lead model for the {profile.sectorLabel} sector
          {model === 'pb' && '; banks are valued on their net worth (book value), not profits'}
          {model === 'ev_ebitda' && '; better for asset-heavy businesses where depreciation hides true profit'}
          {model === 'ev_sales' && '; uses sales instead of profit — for fast growers not yet profitable'}
        </p>
        <p><span className="text-primary font-medium">Margin of Safety</span> — the discount between price and fair value. Bigger = more room to be wrong.</p>
        <p><span className="text-primary font-medium">Implied Growth</span> — the growth today&apos;s price already assumes. If the company can beat it, the stock is cheap.</p>
        <p><span className="text-primary font-medium">PEG Ratio</span> — P/E vs growth. Under 1 = paying less than the growth is worth. Over 2 = paying a lot.</p>
        <p><span className="text-primary font-medium">Earnings Yield</span> — profit you get per ₹100 of stock. Should beat the {RISK_FREE_RATE}% you&apos;d earn risk-free in G-Secs.</p>
        <p><span className="text-primary font-medium">Quality Score</span> — 0–100 for steady profits, stable margins and growing sales. High quality earns a higher exit multiple.</p>
        <p><span className="text-primary font-medium">Composite</span> — sector-weighted blend: {
          model === 'pb'        ? 'Gordon P/B 50% · PE 30% · Graham 20% (banks are valued on book, not cash flow)' :
          model === 'ev_ebitda' ? 'EV/EBITDA 40% · DCF 35% · PE 15% · Graham 10%' :
          model === 'ev_sales'  ? 'DCF 35% · EV 30% · PE 20% · Graham 15%' :
                                  'DCF 40% · PE 30% · EV 20% · Graham 10%'
        }. Failed methods drop out automatically.</p>
        <p><span className="text-primary font-medium">Growth fade</span> — every projection slows your growth rate toward 6% (≈ India GDP) by the final year. No company compounds at 25% forever.</p>
      </div>
    </div>
  );
}
