'use client';

import { useState } from 'react';
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

  function SliderInput({ label, value, min, max, step, k }: {
    label: string; value: number; min: number; max: number; step: number; k: keyof Scenario;
  }) {
    return (
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-muted">{label}</span>
          <span className={`text-[10px] font-mono font-bold ${scenario.color}`}>{value}%</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(k, parseFloat(e.target.value))}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, currentColor 0%, currentColor ${((value-min)/(max-min))*100}%, rgb(var(--color-border)) ${((value-min)/(max-min))*100}%, rgb(var(--color-border)) 100%)` }}
        />
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${scenario.borderColor} ${scenario.bgColor}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold tracking-wide ${scenario.color}`}>{scenario.name.toUpperCase()}</span>
        <div className="text-right">
          <p className={`text-lg font-bold font-mono ${scenario.color}`}>
            {avg > 0 ? `₹${avg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
          </p>
          <p className={`text-xs font-mono font-bold ${upside >= 0 ? 'text-gain' : 'text-loss'}`}>
            {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="border-t border-border pt-3 space-y-0.5">
        <SliderInput label="Revenue Growth" value={scenario.growthRate} min={-10} max={50} step={1} k="growthRate" />
        <SliderInput label="Net Margin" value={scenario.netMargin} min={1} max={40} step={0.5} k="netMargin" />
        <SliderInput label="WACC" value={scenario.wacc} min={8} max={20} step={0.5} k="wacc" />
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-muted">Exit P/E</span>
            <span className={`text-[10px] font-mono font-bold ${scenario.color}`}>{scenario.exitPE}x</span>
          </div>
          <input type="range" min={5} max={80} step={1} value={scenario.exitPE}
            onChange={e => onChange('exitPE', parseFloat(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>

      <div className="border-t border-border pt-3 space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted">DCF</span>
          <span className="text-primary font-mono">{dcf.fairValue > 0 ? `₹${dcf.fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted">PE-Based</span>
          <span className="text-primary font-mono">{pe.fairValue > 0 ? `₹${pe.fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted">Graham</span>
          <span className="text-primary font-mono">{graham.fairValue > 0 ? `₹${graham.fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</span>
        </div>
      </div>
    </div>
  );
}

export default function ScenarioBuilder({ company, financials }: ScenarioBuilderProps) {
  const latest = financials[financials.length - 1];
  const baseGrowth = Math.min(Math.max(latest?.revenueGrowth ?? 12, 5), 30);
  const baseMargin = latest?.netMargin ?? 12;

  const [scenarios, setScenarios] = useState<Scenario[]>([
    { name: 'Bear', color: 'text-loss',  bgColor: 'bg-loss/3',  borderColor: 'border-loss/20',  growthRate: Math.max(baseGrowth - 8, 2),  wacc: 14, exitPE: Math.max((company.pe || 20) - 8, 8),  netMargin: Math.max(baseMargin - 4, 2)  },
    { name: 'Base', color: 'text-gold',  bgColor: 'bg-gold/3',  borderColor: 'border-gold/20',  growthRate: baseGrowth,                   wacc: 12, exitPE: company.pe || 20,                      netMargin: baseMargin                   },
    { name: 'Bull', color: 'text-gain',  bgColor: 'bg-gain/3',  borderColor: 'border-gain/20',  growthRate: baseGrowth + 8,               wacc: 10, exitPE: (company.pe || 20) + 10,                netMargin: baseMargin + 4               },
  ]);

  function updateScenario(idx: number, key: keyof Scenario, val: number) {
    setScenarios(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  }

  if (!financials.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-primary">Scenario Builder</h3>
        <p className="text-[11px] text-muted mt-0.5">Adjust assumptions per scenario — see fair value move in real time</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {scenarios.map((s, i) => (
          <ScenarioColumn key={s.name} scenario={s} company={company} financials={financials}
            onChange={(k, v) => updateScenario(i, k, v)} />
        ))}
      </div>
      <p className="text-[10px] text-muted border-t border-border pt-3">
        Fair value = avg of DCF + PE-Based + Graham Number per scenario. Current price: ₹{company.currentPrice.toLocaleString('en-IN')}
      </p>
    </div>
  );
}
