'use client';

import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel, pegModel, earningsYieldModel, earningsQualityScore } from '@/lib/forecastUtils';
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

// ── Print-only report component (rendered hidden, shown on print) ─────────────
export function PrintableReport({ company, financials, assumptions }: ExportReportProps) {
  if (!financials.length) return null;

  const profile = getCompanyProfile(company);
  const bench = BENCHMARKS[company.sector] || DEFAULT_BENCHMARK;
  const latest = financials[financials.length - 1];
  const quality = earningsQualityScore(financials);

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

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="print-only" style={{ display: 'none' }}>
      {/* CSS injected via global styles, this div shown only during print */}
      <div id="print-report">
        <div style={{ fontFamily: 'Georgia, serif', maxWidth: '800px', margin: '0 auto', padding: '32px', color: '#111' }}>

          {/* Header */}
          <div style={{ borderBottom: '3px solid #d97706', paddingBottom: '16px', marginBottom: '24px' }}>
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

          {/* Key metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Market Cap', value: `₹${(company.marketCap / 100000).toFixed(1)}L Cr` },
              { label: 'P/E Ratio', value: `${company.pe.toFixed(1)}x` },
              { label: 'ROE', value: `${company.roe.toFixed(1)}%` },
              { label: 'Debt/Equity', value: `${company.debtToEquity.toFixed(2)}x` },
            ].map(m => (
              <div key={m.label} style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>{m.label}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Valuation section */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px' }}>
              Valuation Summary
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { method: primaryResult.model, fv: primaryResult.fairValue, desc: primaryResult.desc },
                { method: pegResult.model, fv: pegResult.fairValue, desc: pegResult.desc },
                { method: eyResult.model, fv: eyResult.fairValue, desc: eyResult.desc },
                { method: 'Composite Fair Value', fv: compositeFV, desc: `Average of ${allFVs.length} methods` },
              ].filter(m => m.fv > 0).map(m => {
                const up = ((m.fv / company.currentPrice) - 1) * 100;
                const isUp = up >= 0;
                return (
                  <div key={m.method} style={{ background: m.method === 'Composite Fair Value' ? '#fffbeb' : '#f9fafb', border: `1px solid ${m.method === 'Composite Fair Value' ? '#d97706' : '#e5e7eb'}`, borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{m.method}</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'monospace' }}>
                      ₹{m.fv.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: isUp ? '#16a34a' : '#dc2626', fontFamily: 'monospace' }}>
                      {isUp ? '+' : ''}{up.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>{m.desc}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '12px', padding: '12px', background: compositeUp >= 20 ? '#f0fdf4' : compositeUp <= -20 ? '#fef2f2' : '#fffbeb', border: `1px solid ${compositeUp >= 20 ? '#86efac' : compositeUp <= -20 ? '#fca5a5' : '#fcd34d'}`, borderRadius: '8px' }}>
              <strong style={{ fontSize: '13px' }}>
                {compositeUp >= 20 ? '🟢 Potentially Undervalued' : compositeUp <= -20 ? '🔴 Potentially Overvalued' : '🟡 Fairly Valued Range'}
              </strong>
              <span style={{ fontSize: '12px', color: '#555', marginLeft: '8px' }}>
                Composite upside: {compositeUp >= 0 ? '+' : ''}{compositeUp.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Assumptions */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '12px' }}>
              Assumptions Used
            </h2>
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

          {/* Financials table */}
          {financials.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '12px' }}>
                Historical Financials
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Year', 'Revenue (Cr)', 'Rev Growth', 'PAT (Cr)', 'Net Margin', 'EPS', 'ROE'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#555' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {financials.map((f, i) => (
                    <tr key={f.year} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#d97706' }}>{f.year}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>₹{f.revenue.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', color: f.revenueGrowth >= 0 ? '#16a34a' : '#dc2626' }}>
                        {f.revenueGrowth >= 0 ? '+' : ''}{f.revenueGrowth.toFixed(1)}%
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>₹{f.pat.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{f.netMargin.toFixed(1)}%</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>₹{f.eps.toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sector benchmark */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '12px' }}>
              Sector Benchmarks — {bench.label}
            </h2>
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

          {/* Footer */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', fontSize: '10px', color: '#aaa' }}>
            Generated by Robu Terminal on {today} · For personal research only · Not SEBI registered investment advice
          </div>
        </div>
      </div>
    </div>
  );
}
