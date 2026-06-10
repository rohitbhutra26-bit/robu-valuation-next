'use client';

import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel, pegModel, earningsYieldModel, earningsQualityScore } from '@/lib/forecastUtils';
import { redFlags, monteCarloFairValue, reverseDcfVerdict, FlagStatus } from '@/lib/advancedModels';
import { buildScenarioConfigs, fmtINR } from '@/lib/scenarioEngine';
import { BENCHMARKS, DEFAULT_BENCHMARK } from './IndustryBenchmarks';
import { Download } from '@/lib/icons';

interface ExportReportProps {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

export default function ExportReport({ company, financials, assumptions }: ExportReportProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted border border-border hover:text-gold hover:border-gold/30 hover:bg-gold/5 transition-all"
    >
      <Download size={13} />
      Export PDF
    </button>
  );
}

// ─── Shared print styles ───────────────────────────────────────────────────────
const S = {
  h2: { fontSize: '15px', fontWeight: 700, borderBottom: '2px solid #d97706', paddingBottom: '6px', marginBottom: '12px', letterSpacing: '0.3px' } as const,
  section: { marginBottom: '22px', pageBreakInside: 'avoid' } as const,
  cell: { padding: '6px 8px', textAlign: 'right' as const, fontFamily: 'monospace' },
  small: { fontSize: '10px', color: '#888' },
};

const FLAG_COLORS: Record<FlagStatus, { bg: string; fg: string; icon: string }> = {
  pass: { bg: '#f0fdf4', fg: '#16a34a', icon: '✓' },
  warn: { bg: '#fffbeb', fg: '#b45309', icon: '⚠' },
  fail: { bg: '#fef2f2', fg: '#dc2626', icon: '✗' },
  na:   { bg: '#f9fafb', fg: '#9ca3af', icon: '—' },
};

const HORIZONS = [3, 5, 7, 10];

// ─── Print-only report component (rendered hidden, shown on print) ─────────────
export function PrintableReport({ company, financials, assumptions }: ExportReportProps) {
  if (!financials.length) return null;

  const profile = getCompanyProfile(company);
  const bench = BENCHMARKS[company.sector] || DEFAULT_BENCHMARK;
  const latest = financials[financials.length - 1];
  const quality = earningsQualityScore(financials);

  // ── Valuation methods ──
  const primaryResult = runPrimaryModel(
    profile.model, financials, company,
    assumptions.revenueGrowthRate, assumptions.netMarginAssumption,
    assumptions.exitMultiple, assumptions.years,
  );
  const pegResult = pegModel(financials, company);
  const eyResult = earningsYieldModel(financials, company);

  const allFVs = [primaryResult.fairValue, pegResult.fairValue, eyResult.fairValue].filter(v => v > 0);
  const compositeFV = allFVs.length > 0 ? allFVs.reduce((a, b) => a + b, 0) / allFVs.length : 0;
  const compositeUp = compositeFV > 0 ? ((compositeFV / company.currentPrice) - 1) * 100 : 0;

  // ── Verdict ──
  const verdictLabel =
    compositeUp > 30  ? 'Looks very undervalued' :
    compositeUp > 10  ? 'Looks undervalued' :
    compositeUp >= -10 ? 'Fairly priced' :
    compositeUp >= -30 ? 'Looks overvalued' : 'Looks very expensive';
  const verdictColor = compositeUp > 10 ? '#16a34a' : compositeUp >= -10 ? '#b45309' : '#dc2626';
  const verdictBg    = compositeUp > 10 ? '#f0fdf4' : compositeUp >= -10 ? '#fffbeb' : '#fef2f2';

  // ── Scenarios + wealth projection (shared engine) ──
  const scenarioConfigs = buildScenarioConfigs(company, financials, assumptions);
  const scenarios = scenarioConfigs.map(cfg => {
    const r = runPrimaryModel(profile.model, financials, company, cfg.growthRate, cfg.marginAssumption, cfg.exitMultiple, assumptions.years);
    const fv = Math.max(r.fairValue, 0);
    return { ...cfg, fairValue: fv, upside: fv > 0 ? ((fv / company.currentPrice) - 1) * 100 : 0 };
  });
  const wealthRows = scenarioConfigs.map(cfg => {
    const cells = HORIZONS.map(h => {
      const r = runPrimaryModel(profile.model, financials, company, cfg.growthRate, cfg.marginAssumption, cfg.exitMultiple, h);
      const mult = r.fairValue > 0 ? r.fairValue / company.currentPrice : 0;
      const cagr = mult > 0 ? (Math.pow(mult, 1 / h) - 1) * 100 : 0;
      return { years: h, amount: 100000 * mult, cagr };
    });
    return { name: cfg.name, emoji: cfg.emoji, color: cfg.color, cells };
  });

  // ── Risk & proof engines ──
  const flags = redFlags(financials, company, profile.model);
  const mc = monteCarloFairValue(
    profile.model, financials, company,
    assumptions.revenueGrowthRate, assumptions.netMarginAssumption,
    assumptions.exitMultiple, assumptions.years,
  );
  const rdcf = reverseDcfVerdict(financials, company, assumptions.netMarginAssumption, assumptions.exitMultiple, assumptions.years);

  // ── Revenue / PAT trend chart (inline SVG, prints reliably) ──
  const chartYears = financials.slice(-8);
  const maxRev = Math.max(...chartYears.map(f => f.revenue), 1);
  const CW = 720, CH = 150, PAD = 8;
  const bw = (CW - PAD * 2) / chartYears.length;

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="print-only" style={{ display: 'none' }}>
      <div id="print-report">
        <div style={{ fontFamily: 'Georgia, serif', maxWidth: '800px', margin: '0 auto', padding: '32px', color: '#111' }}>

          {/* ── Header ── */}
          <div style={{ borderBottom: '3px solid #d97706', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Robu Terminal · Equity Research
                </div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{company.name}</h1>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>
                  {company.symbol} · {profile.sectorLabel} · NSE
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace' }}>
                  ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '12px', color: company.changePercent >= 0 ? '#16a34a' : '#dc2626' }}>
                  {company.changePercent >= 0 ? '+' : ''}{company.changePercent.toFixed(2)}% today
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Report date: {today}</div>
              </div>
            </div>
          </div>

          {/* ── 1. Verdict ── */}
          <div style={{ ...S.section, padding: '14px 16px', background: verdictBg, border: `2px solid ${verdictColor}`, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: verdictColor }}>{verdictLabel}</div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                Composite of {allFVs.length} valuation methods · {assumptions.years}-year horizon · {flags.failCount} red flag{flags.failCount === 1 ? '' : 's'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#888' }}>Fair value (composite)</div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace' }}>₹{compositeFV.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: verdictColor }}>
                {compositeUp >= 0 ? '+' : ''}{compositeUp.toFixed(1)}% vs price
              </div>
            </div>
          </div>

          {/* ── 2. Key metrics ── */}
          <div style={{ ...S.section, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[
              { label: 'Market Cap',  value: company.marketCap >= 100000 ? `₹${(company.marketCap / 100000).toFixed(1)}L Cr` : `₹${company.marketCap.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr` },
              { label: 'P/E',         value: company.pe > 0 ? `${company.pe.toFixed(1)}x` : '—' },
              { label: 'P/B',         value: company.pb > 0 ? `${company.pb.toFixed(1)}x` : '—' },
              { label: 'ROE',         value: `${company.roe.toFixed(1)}%` },
              { label: 'EPS',         value: company.eps ? `₹${company.eps.toFixed(1)}` : '—' },
              { label: 'Debt/Equity', value: `${company.debtToEquity.toFixed(2)}x` },
              { label: 'Div Yield',   value: `${company.dividendYield.toFixed(2)}%` },
              { label: '52W Range',   value: company.week52Low > 0 ? `₹${Math.round(company.week52Low).toLocaleString('en-IN')}–${Math.round(company.week52High).toLocaleString('en-IN')}` : '—' },
            ].map(m => (
              <div key={m.label} style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#888', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* ── 3. If you invested ₹1 lakh ── */}
          <div style={S.section}>
            <h2 style={S.h2}>If You Invested ₹1,00,000 Today</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#555' }}>Scenario</th>
                  {HORIZONS.map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', color: '#555' }}>{h} years</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wealthRows.map(row => (
                  <tr key={row.name}>
                    <td style={{ padding: '8px', fontWeight: 700, color: row.color }}>{row.emoji} {row.name}</td>
                    {row.cells.map(c => (
                      <td key={c.years} style={{ ...S.cell, borderBottom: '1px solid #f3f4f6' }}>
                        <strong>{fmtINR(c.amount)}</strong>
                        <span style={{ ...S.small, display: 'block' }}>{c.cagr >= 0 ? '+' : ''}{c.cagr.toFixed(1)}%/yr</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ ...S.small, marginTop: '6px' }}>Projections from your assumptions with growth fade built in. Dividends excluded. Not a guarantee.</p>
          </div>

          {/* ── 4. Valuation methods ── */}
          <div style={S.section}>
            <h2 style={S.h2}>Valuation Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { method: primaryResult.model, fv: primaryResult.fairValue, desc: primaryResult.desc },
                { method: pegResult.model, fv: pegResult.fairValue, desc: pegResult.desc },
                { method: eyResult.model, fv: eyResult.fairValue, desc: eyResult.desc },
                { method: 'Composite Fair Value', fv: compositeFV, desc: `Average of ${allFVs.length} methods` },
              ].filter(m => m.fv > 0).map(m => {
                const up = ((m.fv / company.currentPrice) - 1) * 100;
                return (
                  <div key={m.method} style={{ background: m.method === 'Composite Fair Value' ? '#fffbeb' : '#f9fafb', border: `1px solid ${m.method === 'Composite Fair Value' ? '#d97706' : '#e5e7eb'}`, borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>{m.method}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace' }}>
                      ₹{m.fv.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      <span style={{ fontSize: '12px', marginLeft: '8px', color: up >= 0 ? '#16a34a' : '#dc2626' }}>
                        {up >= 0 ? '+' : ''}{up.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ ...S.small, marginTop: '3px' }}>{m.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 5. Scenarios ── */}
          <div style={S.section}>
            <h2 style={S.h2}>Bear / Base / Bull — {assumptions.years} Year Fair Value</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {scenarios.map(s => (
                <div key={s.name} style={{ border: `1px solid ${s.color}`, borderRadius: '8px', padding: '10px', background: '#fff' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: s.color }}>{s.emoji} {s.name} <span style={{ fontWeight: 400, color: '#888' }}>({s.probability}%)</span></div>
                  <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', margin: '4px 0 2px' }}>
                    ₹{s.fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: s.upside >= 0 ? '#16a34a' : '#dc2626' }}>
                    {s.upside >= 0 ? '+' : ''}{s.upside.toFixed(1)}%
                  </div>
                  <div style={{ ...S.small, marginTop: '4px' }}>
                    {s.growthRate.toFixed(1)}% growth · {s.marginAssumption.toFixed(1)}% margin · {s.exitMultiple.toFixed(1)}x exit
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 6. Red flags ── */}
          <div style={S.section}>
            <h2 style={S.h2}>Red Flag Check — {flags.verdict}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {flags.flags.map(f => {
                const c = FLAG_COLORS[f.status];
                return (
                  <div key={f.name} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: c.bg, borderRadius: '6px', padding: '7px 10px' }}>
                    <span style={{ color: c.fg, fontWeight: 700, fontSize: '12px' }}>{c.icon}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700 }}>{f.name}</span>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: c.fg, marginLeft: '6px' }}>{f.value}</span>
                      <div style={{ ...S.small, marginTop: '1px' }}>{f.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 7. Stress tests ── */}
          <div style={S.section}>
            <h2 style={S.h2}>Stress Tests</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {rdcf && (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Reverse DCF — what does the price assume?</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                    Price implies <strong>{rdcf.impliedGrowth.toFixed(1)}%</strong> growth · company delivered{' '}
                    <strong>{rdcf.deliveredGrowth.toFixed(1)}%</strong> over {rdcf.historyYears} yrs
                  </div>
                  <div style={{ ...S.small, marginTop: '4px' }}>{rdcf.verdictText}</div>
                </div>
              )}
              {mc && (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Monte Carlo — {mc.draws.toLocaleString()} simulated futures</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                    Stock worth more than today&apos;s price in <strong>{mc.probUndervalued.toFixed(0)}%</strong> of simulations
                  </div>
                  <div style={{ ...S.small, marginTop: '4px' }}>
                    Pessimistic ₹{Math.round(mc.p10).toLocaleString('en-IN')} · Median ₹{Math.round(mc.p50).toLocaleString('en-IN')} · Optimistic ₹{Math.round(mc.p90).toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 8. Revenue & profit trend (SVG bar chart) ── */}
          <div style={S.section}>
            <h2 style={S.h2}>Revenue &amp; Profit Trend</h2>
            <svg width={CW} height={CH + 24} viewBox={`0 0 ${CW} ${CH + 24}`} style={{ display: 'block' }}>
              {chartYears.map((f, i) => {
                const revH = Math.max((f.revenue / maxRev) * (CH - 20), 2);
                const patH = Math.max((Math.max(f.pat, 0) / maxRev) * (CH - 20), 1);
                const x = PAD + i * bw;
                return (
                  <g key={f.year}>
                    <rect x={x + bw * 0.12} y={CH - revH} width={bw * 0.42} height={revH} fill="#fcd34d" rx="2" />
                    <rect x={x + bw * 0.56} y={CH - patH} width={bw * 0.3} height={patH} fill="#16a34a" rx="2" />
                    <text x={x + bw / 2} y={CH + 13} textAnchor="middle" fontSize="10" fill="#555" fontFamily="monospace">{f.year}</text>
                  </g>
                );
              })}
            </svg>
            <p style={S.small}>
              <span style={{ color: '#b45309' }}>■</span> Revenue&nbsp;&nbsp;
              <span style={{ color: '#16a34a' }}>■</span> Net profit&nbsp;&nbsp;
              Latest: ₹{latest.revenue.toLocaleString('en-IN')} Cr revenue, ₹{latest.pat.toLocaleString('en-IN')} Cr profit ({latest.netMargin.toFixed(1)}% margin)
            </p>
          </div>

          {/* ── 9. Assumptions ── */}
          <div style={S.section}>
            <h2 style={S.h2}>Assumptions Used</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: 'Revenue Growth', value: `${assumptions.revenueGrowthRate}% p.a.` },
                { label: 'Net Margin', value: `${assumptions.netMarginAssumption}%` },
                { label: 'Exit Multiple', value: `${assumptions.exitMultiple}x` },
                { label: 'Horizon', value: `${assumptions.years} years` },
                { label: 'Earnings Quality', value: `${quality.label} (${quality.score}/100)` },
                { label: 'Model', value: profile.exitMultipleLabel },
              ].map(a => (
                <div key={a.label} style={{ fontSize: '12px' }}>
                  <span style={{ color: '#888' }}>{a.label}: </span>
                  <strong>{a.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* ── 10. Historical financials ── */}
          <div style={S.section}>
            <h2 style={S.h2}>Historical Financials</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Year', 'Revenue (Cr)', 'Rev Growth', 'PAT (Cr)', 'Net Margin', 'EPS', 'OCF (Cr)'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#555' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {financials.map((f, i) => (
                  <tr key={f.year} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...S.cell, fontWeight: 700, color: '#d97706', fontFamily: 'inherit' }}>{f.year}</td>
                    <td style={S.cell}>₹{f.revenue.toLocaleString('en-IN')}</td>
                    <td style={{ ...S.cell, color: f.revenueGrowth >= 0 ? '#16a34a' : '#dc2626' }}>
                      {f.revenueGrowth >= 0 ? '+' : ''}{f.revenueGrowth.toFixed(1)}%
                    </td>
                    <td style={S.cell}>₹{f.pat.toLocaleString('en-IN')}</td>
                    <td style={S.cell}>{f.netMargin.toFixed(1)}%</td>
                    <td style={S.cell}>₹{f.eps.toFixed(2)}</td>
                    <td style={S.cell}>{f.ocf ? `₹${f.ocf.toLocaleString('en-IN')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 11. Sector benchmark ── */}
          <div style={S.section}>
            <h2 style={S.h2}>Sector Benchmarks — {bench.label}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
              {[
                { label: 'Sector P/E', company: `${company.pe.toFixed(1)}x`, sector: `${bench.pe}x` },
                { label: 'Sector P/B', company: `${company.pb.toFixed(1)}x`, sector: `${bench.pb}x` },
                { label: 'ROE', company: `${company.roe.toFixed(1)}%`, sector: `${bench.roe}%` },
                { label: 'Net Margin', company: `${latest.netMargin.toFixed(1)}%`, sector: `${bench.netMargin}%` },
                { label: 'D/E Ratio', company: `${company.debtToEquity.toFixed(2)}x`, sector: `${bench.debtToEquity}x` },
                { label: 'Div Yield', company: `${company.dividendYield.toFixed(2)}%`, sector: '—' },
              ].map(b => (
                <div key={b.label} style={{ padding: '8px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ color: '#888', marginBottom: '2px' }}>{b.label}</div>
                  <div><strong>{b.company}</strong> <span style={{ color: '#aaa' }}>vs {b.sector}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', fontSize: '10px', color: '#aaa' }}>
            Generated by Robu Terminal on {today} · For personal research only · Not SEBI registered investment advice
          </div>
        </div>
      </div>
    </div>
  );
}
