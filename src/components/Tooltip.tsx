'use client';

import { useState, useRef, useEffect } from 'react';
import { Info } from '@/lib/icons';

interface TooltipProps {
  text: string;
  /** Optional custom trigger — defaults to the ⓘ Info icon */
  trigger?: React.ReactNode;
  /** Position preference: 'top' | 'bottom' — auto-adjusts if near edge */
  position?: 'top' | 'bottom';
  className?: string;
}

/**
 * Click + hover tooltip that works on both desktop and mobile.
 * Usage:
 *   <Tooltip text="How much you pay per ₹1 of profit" />
 *   <Tooltip text="..." trigger={<span className="...">?</span>} />
 */
export default function Tooltip({ text, trigger, position = 'top', className = '' }: TooltipProps) {
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className={`relative inline-flex items-center ${className}`}
      // Hover (desktop)
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger element */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex-shrink-0 focus:outline-none"
        aria-label="More information"
      >
        {trigger ?? (
          <Info size={13} className="text-muted/50 hover:text-accent transition-colors" />
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          className={`absolute z-50 w-56 p-2.5 rounded-xl bg-card border border-border shadow-lg text-[11px] text-muted leading-relaxed
            ${position === 'top'
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
              : 'top-full mt-2 left-1/2 -translate-x-1/2'
            }`}
          style={{ minWidth: '180px' }}
        >
          {/* Arrow */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-card border-border rotate-45
              ${position === 'top' ? 'bottom-[-5px] border-b border-r' : 'top-[-5px] border-t border-l'}`}
          />
          {text}
        </div>
      )}
    </div>
  );
}

/**
 * Compact "?" bubble variant used in IndustryBenchmarks
 */
export function QuestionTooltip({ text }: { text: string }) {
  return (
    <Tooltip
      text={text}
      trigger={
        <span className="w-3.5 h-3.5 rounded-full bg-border text-muted/70 text-[7px] font-bold flex items-center justify-center cursor-pointer hover:bg-gold/20 hover:text-gold transition-colors">
          ?
        </span>
      }
    />
  );
}
