'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel, pegModel, earningsYieldModel, earningsQualityScore } from '@/lib/forecastUtils';
import { redFlags, monteCarloFairValue, reverseDcfVerdict, FlagStatus } from '@/lib/advancedModels';
import { buildScenarioConfigs, fmtINR } from '@/lib/scenarioEngine';
import { computeROBUScore } from '@/lib/robuScore';
import { valuationReliability } from '@/lib/valuationReliability';
import { generateInsight } from '@/lib/aiInsight';
import { BENCHMARKS, DEFAULT_BENCHMARK } from './IndustryBenchmarks';
import { Download } from '@/lib/icons';

interface ExportReportProps {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

export default function ExportReport({ company }: ExportReportProps) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    if (busy) return;
    const wrapper = document.querySelector('.print-only') as HTMLElement | null;
    const report  = document.getElementById('print-report');
    if (!wrapper || !report) { window.print(); return; }

    setBusy(true);
    // Reveal the hidden report off-screen so html2canvas can rasterise it
    wrapper.style.cssText = 'display:block;position:fixed;left:-9999px;top:0;width:860px;background:#fff;z-index:-1;';
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const today = new Date().toISOString().slice(0, 10);
      const opts = {
        margin:      [8, 8, 10, 8],
        filename:    `${company.symbol}-Robu-Report-${today}.pdf`,
        image:       { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:   { mode: ['css', 'legacy'], before: '.pr-chapter', avoid: '.pr-keep' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
      await html2pdf().set(opts).from(report).save();
    } catch (e) {
      console.error('[export] PDF generation failed, falling back to print dialog', e);
      wrapper.style.cssText = '';
      window.print();
    } finally {
      wrapper.style.cssText = '';
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={busy}
      className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-gold/40 bg-gold/10 text-gold hover:bg-gold hover:text-terminal transition-all shadow-sm disabled:opacity-60 disabled:cursor-wait"
      title="Download the full multi-page stock report as a PDF file"
    >
      <Download size={14} />
      <span className="leading-tight text-left">
        {busy ? 'Preparing…' : 'Download full'}
        <span className="block font-serif text-[13px] tracking-wide">STOCK REPORT</span>
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  ROBU PRINT REPORT — editorial serif + terracotta, Trendlyne-grade depth
// ═══════════════════════════════════════════════════════════════════════════

const INK    = '#1a1a1a';
const MUTED  = '#6b7280';
const FAINT  = '#9ca3af';
const GOLD   = '#b45309';
const TERRA  = '#7A2238';   // burgundy brand accent (was terracotta)
const CREAM  = '#fffbeb';
const LINE   = '#ececec';
const GAIN   = '#16a34a';
const LOSS   = '#dc2626';
const PAPER  = '#fafafa';

const FLAG_COLORS: Record<FlagStatus, { bg: string; fg: string; icon: string }> = {
  pass: { bg: '#f0fdf4', fg: GAIN, icon: '✓' },
  warn: { bg: CREAM,     fg: GOLD, icon: '⚠' },
  fail: { bg: '#fef2f2', fg: LOSS, icon: '✗' },
  na:   { bg: PAPER,     fg: FAINT, icon: '—' },
};

const HORIZONS = [3, 5, 7, 10];

interface Peer {
  symbol: string; name?: string; currentPrice?: number; pe?: number; pb?: number;
  roe?: number; de?: number; netMargin?: number; marketCap?: number; isSelf?: boolean;
}
interface Quarter { quarter: string; revenue: number; pat: number; opm: number; eps: number }
interface HistStats { min: number; max: number; median: number; p25: number; p75: number; mean: number }

// ─── Tiny building blocks ─────────────────────────────────────────────────────

function Brand({ company, page }: { company: Company; page: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${TERRA}`, paddingBottom: '10px', marginBottom: '26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: TERRA, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '14px' }}>R</div>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: TERRA }}>Robu</span>
        <span style={{ fontSize: '10px', color: FAINT }}>· Equity Research</span>
      </div>
      <div style={{ fontSize: '10px', color: MUTED, fontFamily: 'monospace' }}>
        {company.symbol} · {page}
      </div>
    </div>
  );
}

function SecTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div style={{ margin: '4px 0 16px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: GOLD, marginBottom: '4px' }}>{kicker}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Georgia, serif', color: INK, letterSpacing: '-0.2px' }}>{title}</div>
    </div>
  );
}

function Card({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div className="pr-keep" style={{ background: '#fff', border: `1px solid ${accent || LINE}`, borderRadius: '12px', padding: '14px 16px', ...style }}>
      {children}
    </div>
  );
}

function Bar({ value, color, height = 7 }: { value: number; color: string; height?: number }) {
  return (
    <div style={{ background: '#f3f4f6', borderRadius: '99px', height: `${height}px`, width: '100%' }}>
      <div style={{ background: color, borderRadius: '99px', height: '100%', width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}

// ─── Main printable report ────────────────────────────────────────────────────

export function PrintableReport({ company, financials, assumptions }: ExportReportProps) {
  const [peers, setPeers]         = useState<Peer[]>([]);
  const [quarters, setQuarters]   = useState<Quarter[]>([]);
  const [peStats, setPeStats]     = useState<HistStats | null>(null);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!company?.symbol) return;
    let dead = false;
    const sym = company.symbol;
    const grab = async (url: string) => {
      try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; }
    };
    (async () => {
      const [pe, qt, hi] = await Promise.all([
        grab(`/api/peers/${sym}`),
        grab(`/api/quarterly/${sym}`),
        grab(`/api/historical/${sym}`),
      ]);
      if (dead) return;
      const plist = Array.isArray(pe) ? pe : (pe?.peers ?? []);
      setPeers(plist);
      setQuarters(Array.isArray(qt) ? qt.slice(0, 6) : []);
      setPeStats(hi?.stats?.pe ?? null);
    })();
    return () => { dead = true; };
  }, [company?.symbol]);

  if (!mounted || !financials.length) return null;

  const profile = getCompanyProfile(company);
  const bench   = BENCHMARKS[company.sector] || DEFAULT_BENCHMARK;
  const latest  = financials[financials.length - 1];
  const quality = earningsQualityScore(financials);
  const robu    = computeROBUScore(financials, company);
  const insight = generateInsight(company, financials);
  const reliability = valuationReliability(company, financials);

  const primaryResult = runPrimaryModel(
    profile.model, financials, company,
    assumptions.revenueGrowthRate, assumptions.netMarginAssumption,
    assumptions.exitMultiple, assumptions.years,
  );
  const pegResult = pegModel(financials, company);
  const eyResult  = earningsYieldModel(financials, company);

  const allFVs      = [primaryResult.fairValue, pegResult.fairValue, eyResult.fairValue].filter(v => v > 0);
  const compositeFV = allFVs.length ? allFVs.reduce((a, b) => a + b, 0) / allFVs.length : 0;
  const compositeUp = compositeFV > 0 ? ((compositeFV / company.currentPrice) - 1) * 100 : 0;

  const verdictLabel =
    compositeUp > 30 ? 'Looks very undervalued' :
    compositeUp > 10 ? 'Looks undervalued' :
    compositeUp >= -10 ? 'Fairly priced' :
    compositeUp >= -30 ? 'Looks overvalued' : 'Looks very expensive';
  const vColor = compositeUp > 10 ? GAIN : compositeUp >= -10 ? GOLD : LOSS;
  const vBg    = compositeUp > 10 ? '#f0fdf4' : compositeUp >= -10 ? CREAM : '#fef2f2';

  const scenarioConfigs = buildScenarioConfigs(company, financials, assumptions);
  const scenarios = scenarioConfigs.map(cfg => {
    const r = runPrimaryModel(profile.model, financials, company, cfg.growthRate, cfg.marginAssumption, cfg.exitMultiple, assumptions.years);
    const fv = Math.max(r.fairValue, 0);
    return { ...cfg, fairValue: fv, upside: fv > 0 ? ((fv / company.currentPrice) - 1) * 100 : 0 };
  });
  const wealthRows = scenarioConfigs.map(cfg => ({
    name: cfg.name, emoji: cfg.emoji, color: cfg.color,
    cells: HORIZONS.map(h => {
      const r = runPrimaryModel(profile.model, financials, company, cfg.growthRate, cfg.marginAssumption, cfg.exitMultiple, h);
      const mult = r.fairValue > 0 ? r.fairValue / company.currentPrice : 0;
      return { years: h, amount: 100000 * mult, cagr: mult > 0 ? (Math.pow(mult, 1 / h) - 1) * 100 : 0 };
    }),
  }));

  const flags = redFlags(financials, company, profile.model);
  const mc    = monteCarloFairValue(profile.model, financials, company, assumptions.revenueGrowthRate, assumptions.netMarginAssumption, assumptions.exitMultiple, assumptions.years);
  const rdcf  = reverseDcfVerdict(financials, company, assumptions.netMarginAssumption, assumptions.exitMultiple, assumptions.years);

  // Revenue/PAT chart geometry
  const chartYears = financials.slice(-8);
  const maxRev = Math.max(...chartYears.map(f => f.revenue), 1);
  const RC_W = 700, RC_H = 150, RC_PAD = 8;
  const bw = (RC_W - RC_PAD * 2) / Math.max(chartYears.length, 1);

  // P/E zone gauge
  const peNow = company.pe;
  const peZone = peStats && peStats.max > peStats.min && peNow > 0
    ? Math.min(Math.max((peNow - peStats.min) / (peStats.max - peStats.min), 0), 1)
    : null;

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const th: React.CSSProperties = { padding: '6px 8px', textAlign: 'right', borderBottom: `1px solid ${LINE}`, fontWeight: 600, color: MUTED, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const td: React.CSSProperties = { padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '11px' };

  // Portal: render directly under <body>, OUTSIDE the app's overflow-hidden
  // containers — otherwise everything after page 1 is clipped when printing.
  return createPortal(
    <div className="print-only" style={{ display: 'none' }}>
      <div id="print-report">
        <div style={{ fontFamily: 'Georgia, serif', maxWidth: '820px', margin: '0 auto', color: INK }}>

          {/* ════════ CHAPTER 1 · COVER & VERDICT ════════ */}
          <Brand company={company} page={`Report · ${today}`} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '27px', fontWeight: 700, margin: 0, lineHeight: 1.15 }}>{company.name}</h1>
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: MUTED }}>
                {company.symbol} · {company.industry || profile.sectorLabel} · NSE · {profile.exitMultipleLabel} model
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'monospace' }}>
                ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: company.changePercent >= 0 ? GAIN : LOSS, fontFamily: 'monospace' }}>
                {company.changePercent >= 0 ? '▲' : '▼'} {Math.abs(company.changePercent).toFixed(2)}% today
              </div>
              {company.week52Low > 0 && (
                <div style={{ fontSize: '10px', color: FAINT, marginTop: '2px', fontFamily: 'monospace' }}>
                  52W: ₹{Math.round(company.week52Low).toLocaleString('en-IN')} – ₹{Math.round(company.week52High).toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </div>

          {/* Verdict banner */}
          <div className="pr-keep" style={{ padding: '18px 22px', background: vBg, border: `2px solid ${vColor}`, borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: vColor, fontFamily: 'Georgia, serif' }}>{verdictLabel}</div>
              <div style={{ fontSize: '11px', color: MUTED, marginTop: '3px' }}>
                {insight.verdict} · {insight.confidence.toLowerCase()} confidence · {flags.failCount} red flag{flags.failCount === 1 ? '' : 's'} · composite of {allFVs.length} methods over {assumptions.years} years
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '16px' }}>
              <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '1px' }}>Fair value</div>
              <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'monospace' }}>₹{compositeFV.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: vColor }}>{compositeUp >= 0 ? '+' : ''}{compositeUp.toFixed(1)}%</div>
            </div>
          </div>

          {/* Honesty caveat — when our own models shouldn't be trusted */}
          {!reliability.reliable && (
            <div className="pr-keep" style={{ padding: '12px 16px', background: CREAM, border: `1px solid ${GOLD}`, borderRadius: '10px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: GOLD, marginBottom: '3px' }}>⚠ {reliability.title}</div>
              <div style={{ fontSize: '10px', color: MUTED, lineHeight: 1.55 }}>{reliability.note}</div>
            </div>
          )}

          {/* ROBU score */}
          <div className="pr-keep" style={{ display: 'flex', gap: '16px', marginBottom: '18px' }}>
            <Card accent={GOLD} style={{ width: '180px', flexShrink: 0, textAlign: 'center', background: CREAM }}>
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD }}>Robu score</div>
              <div style={{ fontSize: '42px', fontWeight: 700, fontFamily: 'Georgia, serif', lineHeight: 1.1, color: INK }}>{robu.grade}</div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: GOLD }}>{robu.total}/100</div>
              <div style={{ fontSize: '10px', color: MUTED, marginTop: '4px', lineHeight: 1.4 }}>{robu.verdict}</div>
            </Card>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px', justifyContent: 'center' }}>
              {robu.dimensions.slice(0, 5).map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '10px', color: MUTED, width: '110px', flexShrink: 0 }}>{d.name}</span>
                  <div style={{ flex: 1 }}><Bar value={d.score} color={d.score >= 65 ? GAIN : d.score >= 40 ? GOLD : LOSS} /></div>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, width: '60px', textAlign: 'right' }}>{d.score} · {d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key metrics */}
          <div className="pr-keep" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
            {[
              { label: 'Market cap',  value: company.marketCap >= 100000 ? `₹${(company.marketCap / 100000).toFixed(1)}L Cr` : `₹${Math.round(company.marketCap).toLocaleString('en-IN')} Cr` },
              { label: 'P/E',         value: company.pe > 0 ? `${company.pe.toFixed(1)}x` : '—' },
              { label: 'P/B',         value: company.pb > 0 ? `${company.pb.toFixed(1)}x` : '—' },
              { label: 'ROE',         value: `${company.roe.toFixed(1)}%` },
              { label: 'Debt/Equity', value: `${company.debtToEquity.toFixed(2)}x` },
              { label: 'Net margin',  value: `${latest.netMargin.toFixed(1)}%` },
              { label: 'Div yield',   value: `${company.dividendYield.toFixed(2)}%` },
              { label: 'EPS',         value: company.eps ? `₹${company.eps.toFixed(1)}` : '—' },
            ].map(m => (
              <div key={m.label} style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: '10px', padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* ════════ CHAPTER 2 · THE WRITTEN CASE ════════ */}
          <div className="pr-chapter">
            <Brand company={company} page="The written case" />
            <SecTitle kicker="Research summary" title="Why consider this stock — or not" />
            <p style={{ fontSize: '13px', lineHeight: 1.75, color: INK, margin: '0 0 12px', fontWeight: 600 }}>{insight.summary}</p>

            {/* Full written thesis — the researched reasoning */}
            {insight.thesis.map((para, i) => (
              <p key={i} style={{ fontSize: '12px', lineHeight: 1.8, color: INK, margin: '0 0 12px' }}>
                <span style={{ fontWeight: 700, color: GOLD }}>{['The business. ', 'The quality test. ', 'The price. '][i] || ''}</span>
                {para.replace(/^The (business|quality test|price): /, '')}
              </p>
            ))}

            {/* What to watch — the owner's quarterly checklist */}
            {insight.watch.length > 0 && (
              <div className="pr-keep" style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>If you own it, watch these</div>
                {insight.watch.map((w, i) => (
                  <div key={i} style={{ fontSize: '11px', color: INK, lineHeight: 1.6, display: 'flex', gap: '7px' }}>
                    <span style={{ color: GOLD }}>▸</span><span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <Card accent="#86efac" style={{ background: '#f0fdf4' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: GAIN, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>🚀 The bull case — why it could work</div>
                <p style={{ fontSize: '11.5px', lineHeight: 1.65, margin: 0, color: '#14532d' }}>{insight.bull}</p>
              </Card>
              <Card accent="#fca5a5" style={{ background: '#fef2f2' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: LOSS, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>🐻 The bear case — what could go wrong</div>
                <p style={{ fontSize: '11.5px', lineHeight: 1.65, margin: 0, color: '#7f1d1d' }}>{insight.bear}</p>
              </Card>
            </div>

            <SecTitle kicker="Stress tests" title="Does the price make sense?" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              {rdcf && (
                <Card>
                  <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '5px' }}>Reverse DCF — what today&apos;s price assumes</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', marginBottom: '4px' }}>
                    Price implies <strong style={{ color: TERRA }}>{rdcf.impliedGrowth.toFixed(1)}%</strong> yearly growth.
                    Delivered: <strong>{rdcf.deliveredGrowth.toFixed(1)}%</strong> over {rdcf.historyYears} yrs.
                  </div>
                  <div style={{ fontSize: '10px', color: MUTED, lineHeight: 1.5 }}>{rdcf.verdictText}</div>
                </Card>
              )}
              {mc && (
                <Card>
                  <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '5px' }}>Monte Carlo — {mc.draws.toLocaleString()} simulated futures</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', marginBottom: '4px' }}>
                    Worth more than today&apos;s price in <strong style={{ color: mc.probUndervalued >= 50 ? GAIN : LOSS }}>{mc.probUndervalued.toFixed(0)}%</strong> of runs.
                  </div>
                  <div style={{ fontSize: '10px', color: MUTED, fontFamily: 'monospace' }}>
                    Pessimistic ₹{Math.round(mc.p10).toLocaleString('en-IN')} · Median ₹{Math.round(mc.p50).toLocaleString('en-IN')} · Optimistic ₹{Math.round(mc.p90).toLocaleString('en-IN')}
                  </div>
                </Card>
              )}
            </div>

            <SecTitle kicker="Your money" title="If you invested ₹1,00,000 today" />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
              <thead>
                <tr style={{ background: PAPER }}>
                  <th style={{ ...th, textAlign: 'left' }}>Scenario</th>
                  {HORIZONS.map(h => <th key={h} style={th}>{h} years</th>)}
                </tr>
              </thead>
              <tbody>
                {wealthRows.map(row => (
                  <tr key={row.name}>
                    <td style={{ padding: '8px', fontWeight: 700, color: row.color, fontSize: '12px' }}>{row.emoji} {row.name}</td>
                    {row.cells.map(c => (
                      <td key={c.years} style={{ ...td, borderBottom: `1px solid #f3f4f6` }}>
                        <strong style={{ fontSize: '12px' }}>{fmtINR(c.amount)}</strong>
                        <span style={{ display: 'block', fontSize: '9px', color: MUTED }}>{c.cagr >= 0 ? '+' : ''}{c.cagr.toFixed(1)}%/yr</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: '9px', color: FAINT, margin: 0 }}>Based on your assumptions with growth fade built in. Dividends excluded. Projections, not guarantees.</p>
          </div>

          {/* ════════ CHAPTER 3 · VALUATION ════════ */}
          <div className="pr-chapter">
            <Brand company={company} page="Valuation" />
            <SecTitle kicker="Fair value" title="What is this stock actually worth?" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { method: primaryResult.model, fv: primaryResult.fairValue, desc: primaryResult.desc, star: false },
                { method: pegResult.model, fv: pegResult.fairValue, desc: pegResult.desc, star: false },
                { method: eyResult.model, fv: eyResult.fairValue, desc: eyResult.desc, star: false },
                { method: 'Composite fair value', fv: compositeFV, desc: `Average of ${allFVs.length} independent methods`, star: true },
              ].filter(m => m.fv > 0).map(m => {
                const up = ((m.fv / company.currentPrice) - 1) * 100;
                return (
                  <Card key={m.method} accent={m.star ? GOLD : undefined} style={m.star ? { background: CREAM } : undefined}>
                    <div style={{ fontSize: '10px', color: MUTED, marginBottom: '3px' }}>{m.method}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace' }}>
                      ₹{m.fv.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      <span style={{ fontSize: '12px', marginLeft: '8px', color: up >= 0 ? GAIN : LOSS }}>{up >= 0 ? '+' : ''}{up.toFixed(1)}%</span>
                    </div>
                    <div style={{ fontSize: '9px', color: FAINT, marginTop: '3px', lineHeight: 1.4 }}>{m.desc}</div>
                  </Card>
                );
              })}
            </div>

            <SecTitle kicker="Three futures" title={`Bear, base and bull — ${assumptions.years} year fair value`} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {scenarios.map(s => (
                <Card key={s.name} accent={s.color}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: s.color }}>{s.emoji} {s.name} <span style={{ fontWeight: 400, color: FAINT }}>({s.probability}%)</span></div>
                  <div style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'monospace', margin: '4px 0 1px' }}>₹{s.fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: s.upside >= 0 ? GAIN : LOSS }}>{s.upside >= 0 ? '+' : ''}{s.upside.toFixed(1)}%</div>
                  <div style={{ fontSize: '9px', color: FAINT, marginTop: '3px' }}>{s.growthRate.toFixed(1)}% growth · {s.marginAssumption.toFixed(1)}% margin · {s.exitMultiple.toFixed(1)}x exit</div>
                </Card>
              ))}
            </div>

            {peStats && peZone !== null && (
              <>
                <SecTitle kicker="History check" title="Is today's P/E cheap or expensive vs its own past?" />
                <Card style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: MUTED, marginBottom: '5px' }}>
                    <span>Cheapest ever ({peStats.min}x)</span>
                    <span>5-yr median {peStats.median}x</span>
                    <span>Most expensive ({peStats.max}x)</span>
                  </div>
                  <div style={{ position: 'relative', height: '14px', borderRadius: '99px', background: `linear-gradient(to right, #bbf7d0, #fef9c3, #fecaca)` }}>
                    <div style={{ position: 'absolute', left: `${(peZone * 100).toFixed(1)}%`, top: '-3px', width: '4px', height: '20px', background: INK, borderRadius: '2px', transform: 'translateX(-50%)' }} />
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '8px', lineHeight: 1.5 }}>
                    Current P/E is <strong style={{ fontFamily: 'monospace' }}>{peNow.toFixed(1)}x</strong> —{' '}
                    {peNow < peStats.p25 ? <strong style={{ color: GAIN }}>cheaper than 75% of its own history.</strong> :
                     peNow < peStats.median ? <strong style={{ color: GAIN }}>below its 5-year median — cheaper than usual.</strong> :
                     peNow < peStats.p75 ? <strong style={{ color: GOLD }}>around its normal range.</strong> :
                     <strong style={{ color: LOSS }}>more expensive than 75% of its own history.</strong>}
                  </div>
                </Card>
              </>
            )}

            <SecTitle kicker="Inputs" title="Assumptions this report uses" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: 'Revenue growth', value: `${assumptions.revenueGrowthRate}% p.a.` },
                { label: 'Net margin', value: `${assumptions.netMarginAssumption}%` },
                { label: 'Exit multiple', value: `${assumptions.exitMultiple}x` },
                { label: 'Horizon', value: `${assumptions.years} years` },
                { label: 'Earnings quality', value: `${quality.label} (${quality.score}/100)` },
                { label: 'Model', value: profile.exitMultipleLabel },
              ].map(a => (
                <div key={a.label} style={{ fontSize: '11px', background: PAPER, border: `1px solid ${LINE}`, borderRadius: '6px', padding: '7px 10px' }}>
                  <span style={{ color: MUTED }}>{a.label}: </span><strong>{a.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* ════════ CHAPTER 4 · HEALTH CHECK ════════ */}
          <div className="pr-chapter">
            <Brand company={company} page="Health check" />
            <SecTitle kicker="Red flags" title={flags.verdict} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '16px' }}>
              {flags.flags.map(f => {
                const c = FLAG_COLORS[f.status];
                return (
                  <div key={f.name} className="pr-keep" style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', background: c.bg, borderRadius: '8px', padding: '8px 11px' }}>
                    <span style={{ color: c.fg, fontWeight: 700, fontSize: '13px', lineHeight: 1.2 }}>{c.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 700 }}>{f.name}</span>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: c.fg, marginLeft: '6px' }}>{f.value}</span>
                      </div>
                      <div style={{ fontSize: '9.5px', color: MUTED, marginTop: '1px', lineHeight: 1.45 }}>{f.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <SecTitle kicker="Strength & risk" title="The two things that matter most" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Card accent="#86efac" style={{ background: '#f0fdf4' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: GAIN, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Biggest strength</div>
                <p style={{ fontSize: '11.5px', lineHeight: 1.6, margin: 0 }}>{robu.strengthFlag}</p>
              </Card>
              <Card accent="#fca5a5" style={{ background: '#fef2f2' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: LOSS, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Biggest risk</div>
                <p style={{ fontSize: '11.5px', lineHeight: 1.6, margin: 0 }}>{robu.riskFlag}</p>
              </Card>
            </div>
            {robu.novelInsight && (
              <Card accent={GOLD} style={{ background: CREAM, marginTop: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>What no other tool tells you</div>
                <p style={{ fontSize: '11.5px', lineHeight: 1.6, margin: 0 }}>{robu.novelInsight}</p>
              </Card>
            )}
          </div>

          {/* ════════ CHAPTER 5 · FINANCIALS ════════ */}
          <div className="pr-chapter">
            <Brand company={company} page="Financials" />
            <SecTitle kicker="Track record" title="Revenue & profit, last 8 years" />
            <svg width={RC_W} height={RC_H + 22} viewBox={`0 0 ${RC_W} ${RC_H + 22}`} style={{ display: 'block', marginBottom: '4px' }}>
              {chartYears.map((f, i) => {
                const revH = Math.max((f.revenue / maxRev) * (RC_H - 20), 2);
                const patH = Math.max((Math.max(f.pat, 0) / maxRev) * (RC_H - 20), 1);
                const x = RC_PAD + i * bw;
                return (
                  <g key={f.year}>
                    <rect x={x + bw * 0.12} y={RC_H - revH} width={bw * 0.42} height={revH} fill="#fcd34d" rx="2" />
                    <rect x={x + bw * 0.56} y={RC_H - patH} width={bw * 0.3} height={patH} fill={GAIN} rx="2" />
                    <text x={x + bw / 2} y={RC_H + 13} textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="monospace">{f.year}</text>
                  </g>
                );
              })}
            </svg>
            <p style={{ fontSize: '9px', color: FAINT, margin: '0 0 14px' }}>
              <span style={{ color: GOLD }}>■</span> Revenue&nbsp;&nbsp;<span style={{ color: GAIN }}>■</span> Net profit&nbsp;&nbsp;
              Latest: ₹{latest.revenue.toLocaleString('en-IN')} Cr revenue · ₹{latest.pat.toLocaleString('en-IN')} Cr profit · {latest.netMargin.toFixed(1)}% margin
            </p>

            <SecTitle kicker="Annual" title="Ten-year financials" />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ background: PAPER }}>
                  {['Year', 'Revenue (Cr)', 'Growth', 'PAT (Cr)', 'Margin', 'EPS', 'OCF (Cr)'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {financials.map((f, i) => (
                  <tr key={f.year} style={{ background: i % 2 ? PAPER : '#fff' }}>
                    <td style={{ ...td, fontWeight: 700, color: GOLD, fontFamily: 'Georgia, serif' }}>{f.year}</td>
                    <td style={td}>₹{f.revenue.toLocaleString('en-IN')}</td>
                    <td style={{ ...td, color: f.revenueGrowth >= 0 ? GAIN : LOSS }}>{f.revenueGrowth >= 0 ? '+' : ''}{f.revenueGrowth.toFixed(1)}%</td>
                    <td style={td}>₹{f.pat.toLocaleString('en-IN')}</td>
                    <td style={td}>{f.netMargin.toFixed(1)}%</td>
                    <td style={td}>₹{f.eps.toFixed(2)}</td>
                    <td style={td}>{f.ocf ? `₹${f.ocf.toLocaleString('en-IN')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {quarters.length > 0 && (
              <>
                <SecTitle kicker="Quarterly" title="Last six quarters" />
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: PAPER }}>
                      {['Quarter', 'Revenue (Cr)', 'PAT (Cr)', 'OPM %', 'EPS'].map(h => <th key={h} style={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {quarters.map((q, i) => (
                      <tr key={q.quarter} style={{ background: i % 2 ? PAPER : '#fff' }}>
                        <td style={{ ...td, fontWeight: 700, color: GOLD, fontFamily: 'Georgia, serif' }}>{q.quarter}</td>
                        <td style={td}>₹{q.revenue.toLocaleString('en-IN')}</td>
                        <td style={{ ...td, color: q.pat >= 0 ? INK : LOSS }}>₹{q.pat.toLocaleString('en-IN')}</td>
                        <td style={td}>{q.opm.toFixed(1)}%</td>
                        <td style={td}>₹{q.eps.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* ════════ CHAPTER 6 · PEERS & SECTOR ════════ */}
          <div className="pr-chapter">
            <Brand company={company} page="Peers & sector" />
            {peers.length > 1 && (
              <>
                <SecTitle kicker="Competition" title="How it stacks up against peers" />
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                  <thead>
                    <tr style={{ background: PAPER }}>
                      <th style={{ ...th, textAlign: 'left' }}>Company</th>
                      {['Price', 'P/E', 'P/B', 'ROE %', 'D/E', 'Margin %'].map(h => <th key={h} style={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {peers.slice(0, 8).map((p, i) => (
                      <tr key={p.symbol} style={{ background: p.isSelf ? CREAM : i % 2 ? PAPER : '#fff' }}>
                        <td style={{ padding: '6px 8px', fontSize: '11px', fontWeight: p.isSelf ? 700 : 400, color: p.isSelf ? GOLD : INK }}>
                          {p.isSelf ? '★ ' : ''}{p.name || p.symbol}
                        </td>
                        <td style={td}>{p.currentPrice ? `₹${Math.round(p.currentPrice).toLocaleString('en-IN')}` : '—'}</td>
                        <td style={td}>{p.pe && p.pe > 0 ? p.pe.toFixed(1) : '—'}</td>
                        <td style={td}>{p.pb && p.pb > 0 ? p.pb.toFixed(1) : '—'}</td>
                        <td style={td}>{p.roe != null ? p.roe.toFixed(1) : '—'}</td>
                        <td style={td}>{p.de != null ? p.de.toFixed(2) : '—'}</td>
                        <td style={td}>{p.netMargin != null ? p.netMargin.toFixed(1) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <SecTitle kicker="Sector" title={`Benchmarks — ${bench.label}`} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: 'P/E', company: `${company.pe.toFixed(1)}x`, sector: `${bench.pe}x` },
                { label: 'P/B', company: `${company.pb.toFixed(1)}x`, sector: `${bench.pb}x` },
                { label: 'ROE', company: `${company.roe.toFixed(1)}%`, sector: `${bench.roe}%` },
                { label: 'Net margin', company: `${latest.netMargin.toFixed(1)}%`, sector: `${bench.netMargin}%` },
                { label: 'D/E', company: `${company.debtToEquity.toFixed(2)}x`, sector: `${bench.debtToEquity}x` },
                { label: 'Div yield', company: `${company.dividendYield.toFixed(2)}%`, sector: '—' },
              ].map(b => (
                <div key={b.label} style={{ padding: '9px 11px', background: PAPER, borderRadius: '8px', border: `1px solid ${LINE}`, fontSize: '11px' }}>
                  <div style={{ color: MUTED, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{b.label}</div>
                  <strong style={{ fontFamily: 'monospace' }}>{b.company}</strong> <span style={{ color: FAINT }}>vs sector {b.sector}</span>
                </div>
              ))}
            </div>

            {/* ── Glossary ── */}
            <div style={{ marginTop: '20px' }}>
              <SecTitle kicker="No jargon" title="What these words mean" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                {[
                  ['Fair value', 'What the business is worth based on its profits — like valuing a shop by its earnings, not its paint job.'],
                  ['P/E ratio', 'Price you pay for ₹1 of yearly profit. P/E 20 = you pay ₹20 for every ₹1 the company earns.'],
                  ['CAGR', 'Average yearly growth rate, like interest on a fixed deposit.'],
                  ['Exit multiple', 'The P/E we assume the market will pay in the future when you sell.'],
                  ['Reverse DCF', 'Works backwards: what growth must the company deliver to justify today’s price?'],
                  ['Monte Carlo', 'Rolls the dice 1,000 times with slightly different futures to see how often you win.'],
                  ['Growth fade', 'No company grows fast forever — our numbers slow growth toward the sector average over time.'],
                  ['Red flags', 'Quick health checks: too much debt, weak cash, pledged shares — danger signs before you invest.'],
                ].map(([t, d]) => (
                  <div key={t} style={{ fontSize: '10px', lineHeight: 1.5 }}>
                    <strong style={{ fontFamily: 'Georgia, serif' }}>{t}.</strong> <span style={{ color: MUTED }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ borderTop: `2px solid ${TERRA}`, marginTop: '20px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '9px', color: FAINT, lineHeight: 1.5, maxWidth: '70%' }}>
                Generated by Robu on {today}. For personal research only — not SEBI-registered investment advice.
                Projections are based on stated assumptions and historical data; markets can and will surprise. Always do your own research.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: TERRA, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '11px' }}>R</div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: TERRA, letterSpacing: '1px' }}>ROBU</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body,
  );
}
