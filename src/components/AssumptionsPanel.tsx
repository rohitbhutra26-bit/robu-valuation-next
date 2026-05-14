'use client';

import { ValuationAssumptions } from '@/lib/types';

interface AssumptionsPanelProps {
  assumptions: ValuationAssumptions;
  onChange: (next: ValuationAssumptions) => void;
  latestNetMargin: number;
  latestRevenueGrowth: number;
  currentPE: number;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  color = 'text-gold',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix: string;
  color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  function handleInput(raw: string) {
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      onChange(Math.min(Math.max(n, min), max));
    }
  }

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-muted">{label}</span>
        {/* Editable number input */}
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => handleInput(e.target.value)}
            className={`w-16 text-right text-sm font-semibold font-mono bg-transparent border-b border-border focus:border-gold focus:outline-none ${color} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
          />
          <span className={`text-sm font-semibold font-mono ${color}`}>{suffix}</span>
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${pct}%, #1F2937 ${pct}%, #1F2937 100%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted font-mono">{min}{suffix}</span>
          <span className="text-xs text-muted font-mono">{max}{suffix}</span>
        </div>
      </div>
    </div>
  );
}

export default function AssumptionsPanel({
  assumptions,
  onChange,
  latestNetMargin,
  latestRevenueGrowth,
  currentPE,
}: AssumptionsPanelProps) {
  function update(key: keyof ValuationAssumptions, value: number) {
    onChange({ ...assumptions, [key]: value });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <h3 className="text-sm font-semibold text-primary">Valuation Assumptions</h3>
      </div>

      <SliderRow
        label="Revenue Growth Rate"
        value={assumptions.revenueGrowthRate}
        min={1}
        max={50}
        step={0.5}
        onChange={(v) => update('revenueGrowthRate', v)}
        suffix="%"
        color="text-accent"
      />

      <SliderRow
        label="Net Margin Assumption"
        value={assumptions.netMarginAssumption}
        min={1}
        max={50}
        step={0.5}
        onChange={(v) => update('netMarginAssumption', v)}
        suffix="%"
        color="text-gain"
      />

      <SliderRow
        label="Exit P/E Multiple"
        value={assumptions.exitPE}
        min={5}
        max={100}
        step={1}
        onChange={(v) => update('exitPE', v)}
        suffix="x"
        color="text-gold"
      />

      <div className="mb-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-muted">Projection Period</span>
          <span className="text-sm font-semibold font-mono text-primary">{assumptions.years} Years</span>
        </div>
        <div className="flex gap-2">
          {[3, 5, 7, 10].map((y) => (
            <button
              key={y}
              onClick={() => update('years', y)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                assumptions.years === y
                  ? 'bg-gold text-terminal'
                  : 'bg-border text-muted hover:bg-border/80 hover:text-primary'
              }`}
            >
              {y}Y
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border space-y-1.5">
        <p className="text-xs text-muted font-medium mb-2">Reference (FY24 Actual)</p>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Net Margin</span>
          <span className="text-primary font-mono">{latestNetMargin.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Rev Growth</span>
          <span className="text-primary font-mono">{latestRevenueGrowth.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Current P/E</span>
          <span className="text-primary font-mono">{currentPE.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
}
