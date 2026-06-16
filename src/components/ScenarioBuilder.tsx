'use client';

import { useState, useCallback } from 'react';
import { Company, FinancialYear } from '@/lib/types';
import { dcfModel, peModel, grahamNumber } from '@/lib/forecastUtils';

interface Scenario {
  name: 'Bear' | 'Base' | 'Bull';
  color: string;
  bgColor: string;
  borderColor: string;
  growthRate: number;
  wacc: number;
  exitPE: number;
  netMargin: number;
}

interface ScenarioBuilderProps {
  company: Company;
  financials: FinancialYear[];
}

function SliderRow({
  label, value, min, max, step, suffix, color, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; suffix: string; color: string;
  onChange: (v: number) => void;
}) {
  const pct = Math.min(((value - min) / (max - min)) * 100, 100);
  // Round display value to avoid float artifacts
  const display = step < 1 ? value.toFixed(1) : Math.round(value).toString();

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted">{label}</span>
        <span className={`text-xs font-mono font-bold ${color}`}>{display}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer touch-pan-x"
        style={{ '--fill': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

function ScenarioColumn({
  scenario, company, financials, onChange,
}: {
  scenario: Scenario;
  company: Company;
  financials: FinancialYear[];
  onChange: (key: keyof Scenario, val: number) => void;
}) {
  const dcf    = dcfModel(financials, company, scenario.growthRate, scenario.wacc, scenario.exitPE, 5);
  const pe     = peModel(financials, company, scenario.growthRate, scenario.netMargin, scenario.exitPE, 5);
  const graham = grahamNumber(financials, company);

  const validFVs = [dcf.fairValue, pe.fairValue, graham.fairValue].filter(v => v > 0);
  const avg = validFVs.length > 0 ? validFVs.reduce((a, b) => a + b, 0) / validFVs.length : 0;
  const upside = avg > 0 ? ((avg / company.currentPrice) - 1) * 100 : 0;

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${scenario.borderColor} ${scenario.bgColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-bold tracking-widest ${scenario.color}`}>{scenario.name}</span>
        <div className="text-right">
          <p className={`text-xl font-bold font-mono leading-tight ${scenario.color}`}>
            {avg > 0 ? `₹${Math.round(avg).toLocaleString('en-IN')}` : '—'}
          </p>
          <p className={`text-xs font-mono font-bold ${upside >= 0 ? 'text-gain' : 'text-loss'}`}>
            {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Sliders */}
      <SliderRow label="Revenue Growth" value={scenario.growthRate} min={-10} max={50} step={1}
        suffix="%" color={scenario.color} onChange={v => onChange('growthRate', v)} />
      <SliderRow label="Net Margin" value={scenario.netMargin} min={1} max={40} step={0.5}
        suffix="%" color={scenario.color} onChange={v => onChange('netMargin', v)} />
      <SliderRow label="WACC" value={scenario.wacc} min={8} max={20} step={0.5}
        suffix="%" color={scenario.color} onChange={v => onChange('wacc', v)} />
      <SliderRow label="Exit P/E" value={scenario.exitPE} min={5} max={80} step={1}
        suffix="x" color={scenario.color} onChange={v => onChange('exitPE', v)} />

      {/* Model breakdown */}
      <div className="border-t border-border/50 pt-3 mt-2 space-y-1.5">
        {[['DCF', dcf.fairValue], ['PE-Based', pe.fairValue], ['Graham', graham.fairValue]].map(([name, val]) => (
          <div key={String(name)} className="flex justify-between text-[11px]">
            <span className="text-muted">{name}</span>
            <span className="text-primary font-mono">
              {Number(val) > 0 ? `₹${Math.round(Number(val)).toLocaleString('en-IN')}` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ScenarioBuilder({ company, financials }: ScenarioBuilderProps) {
  const latest = financials[financials.length - 1];
  const baseGrowth = Math.round(Math.min(Math.max(latest?.revenueGrowth ?? 12, 2), 30));
  const baseMargin = Math.round((latest?.netMargin ?? 12) * 10) / 10;
  const basePE     = company.pe && company.pe > 0 ? Math.round(company.pe) : 20;

  const [scenarios, setScenarios] = useState<Scenario[]>([
    { name: 'Bear', color: 'text-loss',  bgColor: 'bg-loss/3',  borderColor: 'border-loss/20',
      growthRate: Math.max(baseGrowth - 8, 2), wacc: 14,
      exitPE: Math.max(basePE - 8, 8),  netMargin: Math.max(baseMargin - 4, 2) },
    { name: 'Base', color: 'text-gold',  bgColor: 'bg-gold/3',  borderColor: 'border-gold/20',
      growthRate: baseGrowth, wacc: 12, exitPE: basePE, netMargin: baseMargin },
    { name: 'Bull', color: 'text-gain',  bgColor: 'bg-gain/3',  borderColor: 'border-gain/20',
      growthRate: baseGrowth + 8, wacc: 10,
      exitPE: basePE + 10, netMargin: baseMargin + 4 },
  ]);

  const [active, setActive] = useState(1); // Base by default

  const updateScenario = useCallback((idx: number, key: keyof Scenario, val: number) => {
    setScenarios(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  }, []);

  if (!financials.length) return null;

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-primary">Scenario Builder</h3>
        <p className="text-[11px] text-muted mt-0.5">Adjust assumptions per scenario — see fair value move in real time</p>
      </div>

      {/* Mobile: Bear/Base/Bull tabs (one at a time, no endless scroll) · Desktop: 3 columns */}
      <div className="flex gap-1.5 sm:hidden">
        {scenarios.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setActive(i)}
            className={`flex-1 px-2 py-2 rounded-lg text-sm font-bold transition-all ${
              active === i ? `${s.color} bg-card border ${s.borderColor} shadow-sm` : 'text-muted border border-transparent'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {scenarios.map((s, i) => (
          <div key={s.name} className={i === active ? '' : 'hidden sm:block'}>
            <ScenarioColumn scenario={s} company={company} financials={financials}
              onChange={(k, v) => updateScenario(i, k, v)} />
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted border-t border-border pt-3">
        Fair value = avg of DCF + PE-Based + Graham per scenario · Current price: ₹{company.currentPrice.toLocaleString('en-IN')}
      </p>
    </div>
  );
}
