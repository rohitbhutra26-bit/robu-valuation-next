'use client';

import { ValuationAssumptions } from '@/lib/types';
import { Pencil } from '@/lib/icons';

interface AssumptionsPanelProps {
  assumptions: ValuationAssumptions;
  onChange: (next: ValuationAssumptions) => void;
  latestNetMargin: number;
  latestRevenueGrowth: number;
  currentPE: number;
}

function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  inputMax,
  step,
  onChange,
  suffix,
  color = 'text-gold',
}: {
  label: string;
  hint?: string;        // plain-English one-liner shown under the label
  value: number;
  min: number;
  max: number;          // slider visual range
  inputMax?: number;    // max the user can TYPE (higher than slider max)
  step: number;
  onChange: (v: number) => void;
  suffix: string;
  color?: string;
}) {
  const effectiveInputMax = inputMax ?? max;
  // Slider fill: clamp to 100% if value exceeds slider range
  const pct = Math.min(((value - min) / (max - min)) * 100, 100);
  const beyondSlider = value > max;

  function handleInput(raw: string) {
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      onChange(Math.min(Math.max(n, min), effectiveInputMax));
    }
  }

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <div className="min-w-0 pr-2">
          <span className="text-xs text-muted">{label}</span>
          {hint && <p className="text-[10px] text-muted/60 leading-tight mt-0.5">{hint}</p>}
        </div>
        {/* Editable number input — no upper clamp beyond inputMax */}
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            min={min}
            max={effectiveInputMax}
            step={step}
            value={value}
            onChange={(e) => handleInput(e.target.value)}
            className={`w-20 text-right text-sm font-semibold font-mono bg-transparent border-b border-border focus:border-gold focus:outline-none ${color} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
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
          value={Math.min(value, max)}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full appearance-none cursor-pointer"
          style={{ '--fill': beyondSlider ? '100%' : `${pct}%` } as React.CSSProperties}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted font-mono">{min}{suffix}</span>
          {beyondSlider
            ? <span className="text-xs text-gold font-mono font-semibold">▲ beyond {max}{suffix}</span>
            : <span className="text-xs text-muted font-mono">{max}{suffix}</span>
          }
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
        <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Pencil size={13} className="text-accent" />
        </div>
        <h3 className="text-sm font-semibold text-primary">Valuation Assumptions</h3>
      </div>

      <SliderRow
        label="Revenue Growth Rate"
        hint="How fast you expect sales to grow each year"
        value={assumptions.revenueGrowthRate}
        min={1}
        max={50}
        inputMax={200}
        step={0.5}
        onChange={(v) => update('revenueGrowthRate', v)}
        suffix="%"
        color="text-accent"
      />

      <SliderRow
        label="Net Margin Assumption"
        hint="Profit kept from every ₹100 of sales"
        value={assumptions.netMarginAssumption}
        min={1}
        max={50}
        inputMax={100}
        step={0.5}
        onChange={(v) => update('netMarginAssumption', v)}
        suffix="%"
        color="text-gain"
      />

      <SliderRow
        label="Exit P/E Multiple"
        hint="What the market will pay per ₹1 of profit at the end"
        value={assumptions.exitPE}
        min={5}
        max={100}
        inputMax={3000}
        step={1}
        onChange={(v) => update('exitPE', v)}
        suffix="x"
        color="text-gold"
      />

      <div className="mb-2">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="text-xs text-muted">Projection Period</span>
            <p className="text-[10px] text-muted/60 leading-tight mt-0.5">How many years ahead the model looks</p>
          </div>
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

      <SliderRow
        label="WACC (Discount Rate)"
        hint="The yearly return you demand for waiting — higher = stricter"
        value={assumptions.wacc}
        min={6}
        max={20}
        inputMax={30}
        step={0.5}
        onChange={(v) => update('wacc', v)}
        suffix="%"
        color="text-loss"
      />

      <SliderRow
        label="Margin of Safety"
        hint="Extra discount you demand before buying, in case you're wrong"
        value={assumptions.marginOfSafety}
        min={0}
        max={50}
        inputMax={70}
        step={5}
        onChange={(v) => update('marginOfSafety', v)}
        suffix="%"
        color="text-accent"
      />

      <div className="mt-4 pt-3 border-t border-border space-y-1.5">
        <p className="text-xs text-muted font-medium mb-2">Reference (Latest Actuals)</p>
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
