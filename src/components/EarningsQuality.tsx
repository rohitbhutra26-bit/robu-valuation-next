'use client';

import { FinancialYear } from '@/lib/types';
import { Activity } from '@/lib/icons';

interface EarningsQualityProps {
  financials: FinancialYear[];
}

function GradeChip({ grade }: { grade: 'A' | 'B' | 'C' | 'D' }) {
  const styles = {
    A: 'bg-gain/20 text-gain border-gain/30',
    B: 'bg-gold/20 text-gold border-gold/30',
    C: 'bg-loss/10 text-loss/80 border-loss/20',
    D: 'bg-loss/20 text-loss border-loss/30',
  };
  return (
    <span className={`text-xs font-bold border px-2 py-0.5 rounded font-mono ${styles[grade]}`}>
      {grade}
    </span>
  );
}

function cagr(start: number, end: number, years: number): number {
  if (start <= 0 || end <= 0 || years <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

function grade(value: number, thresholds: [number, number, number]): 'A' | 'B' | 'C' | 'D' {
  const [a, b, c] = thresholds;
  if (value >= a) return 'A';
  if (value >= b) return 'B';
  if (value >= c) return 'C';
  return 'D';
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function EarningsQuality({ financials }: EarningsQualityProps) {
  // Filter out years with missing/zero data
  const validFins = financials.filter(f => f.revenue > 0 && f.pat !== 0);
  if (validFins.length < 2) return null;

  const first = validFins[0];
  const latest = validFins[validFins.length - 1];
  const years = validFins.length - 1;

  const revCAGR = cagr(first.revenue, latest.revenue, years);
  const patCAGR = cagr(first.pat, latest.pat, years);
  const epsCAGR = cagr(Math.abs(first.eps), Math.abs(latest.eps), years);

  const revGrade = grade(revCAGR, [18, 12, 6]);
  const patGrade = grade(patCAGR, [20, 12, 5]);
  const epsGrade = grade(epsCAGR, [18, 10, 3]);
  const marginGrade = grade(latest.netMargin, [15, 8, 3]);
  const ebitdaGrade = grade(latest.ebitdaMargin, [25, 15, 8]);

  // Margin consistency — std deviation proxy (only valid years)
  const margins = validFins.map(f => f.netMargin);
  const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
  const marginVariance = margins.reduce((a, b) => a + Math.pow(b - avgMargin, 2), 0) / margins.length;
  const marginStdDev = Math.sqrt(marginVariance);
  const marginConsistency = grade(marginStdDev, [0, 0, 0]); // inverse — lower is better
  const consistencyGrade = marginStdDev <= 1 ? 'A' : marginStdDev <= 3 ? 'B' : marginStdDev <= 6 ? 'C' : 'D';

  // Overall score: average of grades
  const gradeMap = { A: 4, B: 3, C: 2, D: 1 };
  const avgScore = (gradeMap[revGrade] + gradeMap[patGrade] + gradeMap[epsGrade] + gradeMap[marginGrade] + gradeMap[consistencyGrade]) / 5;
  const overallGrade: 'A' | 'B' | 'C' | 'D' = avgScore >= 3.5 ? 'A' : avgScore >= 2.5 ? 'B' : avgScore >= 1.5 ? 'C' : 'D';

  // EPS sparkline — use valid years only
  const maxEPS = Math.max(...validFins.map(f => Math.abs(f.eps)), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gain/10 border border-gain/20 flex items-center justify-center">
            <Activity size={13} className="text-gain" />
          </div>
          <h3 className="text-sm font-semibold text-primary">Earnings Quality</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Overall Grade</span>
          <GradeChip grade={overallGrade} />
        </div>
      </div>

      {/* CAGR metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: `Revenue CAGR (${years}Y)`, value: revCAGR, g: revGrade, color: 'bg-accent', max: 40 },
          { label: `PAT CAGR (${years}Y)`, value: patCAGR, g: patGrade, color: 'bg-gain', max: 50 },
          { label: `EPS CAGR (${years}Y)`, value: epsCAGR, g: epsGrade, color: 'bg-gold', max: 40 },
        ].map(({ label, value, g, color }) => (
          <div key={label} className="bg-border/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted">{label}</span>
              <GradeChip grade={g} />
            </div>
            <p className={`text-base font-bold font-mono ${value >= 12 ? 'text-gain' : value >= 5 ? 'text-gold' : 'text-loss'}`}>
              {value >= 0 ? '+' : ''}{value.toFixed(1)}%
            </p>
            <MiniBar value={value} max={40} color={color} />
          </div>
        ))}
      </div>

      {/* EPS trend sparkline */}
      <div className="mb-4">
        <p className="text-xs text-muted uppercase tracking-wide mb-2 font-medium">EPS Trend (₹ per share)</p>
        <div className="flex items-end gap-2 h-16">
          {validFins.map((f, i) => {
            const h = Math.max((Math.abs(f.eps) / maxEPS) * 100, 4);
            const isLatest = i === validFins.length - 1;
            const isPositive = f.eps >= 0;
            return (
              <div key={f.year} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-mono text-muted">{f.eps > 0 ? f.eps.toFixed(0) : '—'}</span>
                <div
                  className={`w-full rounded-t transition-all ${isLatest ? 'bg-gold' : isPositive ? 'bg-gain/60' : 'bg-loss/60'}`}
                  style={{ height: `${h}%` }}
                />
                <span className="text-xs text-muted font-mono">{f.year}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Margin quality */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Net Margin (FY24)', value: latest.netMargin, suffix: '%', g: marginGrade, threshold: '15% = A' },
          { label: 'EBITDA Margin (FY24)', value: latest.ebitdaMargin, suffix: '%', g: ebitdaGrade, threshold: '25% = A' },
          { label: 'Margin Consistency', value: marginStdDev, suffix: '% σ', g: consistencyGrade, threshold: 'Low σ = stable', invert: true },
          { label: 'Avg Net Margin', value: avgMargin, suffix: '%', g: grade(avgMargin, [12, 6, 2]), threshold: '12% = A' },
        ].map(({ label, value, suffix, g, threshold }) => (
          <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
            <div>
              <p className="text-xs text-muted">{label}</p>
              <p className="text-xs text-muted">{threshold}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-primary">{value.toFixed(1)}{suffix}</span>
              <GradeChip grade={g} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
