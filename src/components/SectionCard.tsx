'use client';

import { useState, type ComponentType, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from '@/lib/icons';
import { scaleIn } from '@/lib/animations';

/**
 * SectionCard — the single reusable "chapter" surface for Robu.
 *
 * Distills VerdictCard's visual language (rounded card, tone-tinted icon chip,
 * soft radial wash, snappy scale-in) into one drop-in container so every section
 * across the 3 tabs looks like it belongs to the same set.
 *
 * Usage:
 *   <SectionCard title="Danger Check" desc="Quick health tests…" Icon={ShieldAlert} tone="loss">
 *     <RedFlagsCard … />
 *   </SectionCard>
 */

export type Tone = 'neutral' | 'gold' | 'gain' | 'loss' | 'warning' | 'info';

interface Props {
  title: string;
  desc?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon?: ComponentType<any>;
  tone?: Tone;
  eyebrow?: string;           // small uppercase label above the title
  action?: ReactNode;         // right-aligned header slot (e.g. a horizon picker)
  id?: string;                // anchor id (+ scroll offset for sticky tabs)
  collapsible?: boolean;
  defaultOpen?: boolean;
  wash?: boolean;             // tone radial wash; defaults on for non-neutral tones
  className?: string;
  children: ReactNode;
}

// neutral/gold both use the brand gold chip; semantic tones use their own colour.
const CHIP_VAR: Record<Tone, string> = {
  neutral: 'gold', gold: 'gold', gain: 'gain', loss: 'loss', warning: 'warning', info: 'info',
};

export default function SectionCard({
  title, desc, Icon, tone = 'neutral', eyebrow, action, id,
  collapsible = false, defaultOpen = true, wash, className = '', children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const cvar = CHIP_VAR[tone];
  const rgb = `rgb(var(--color-${cvar}))`;
  const showWash = wash ?? (tone !== 'neutral');

  const Header = (
    <div className="flex items-start gap-3 sm:gap-3.5">
      {Icon && (
        <span
          className="flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0"
          style={{ background: `rgb(var(--color-${cvar}) / 0.10)`, border: `1.5px solid rgb(var(--color-${cvar}) / 0.28)` }}
        >
          <Icon size={20} strokeWidth={2} style={{ color: rgb }} />
        </span>
      )}
      <div className="flex-1 min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-muted mb-0.5">{eyebrow}</p>
        )}
        <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight leading-tight">{title}</h2>
        {desc && <p className="text-[13.5px] text-muted mt-1.5 leading-relaxed max-w-2xl">{desc}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-1">{action}</div>}
      {collapsible && (
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={open ? 'Collapse section' : 'Expand section'}
          className="flex-shrink-0 ml-1 text-muted hover:text-primary transition-colors"
        >
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );

  return (
    <motion.section
      id={id}
      variants={scaleIn} initial="hidden" animate="visible"
      className={`relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6 scroll-mt-24 ${className}`}
    >
      {showWash && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: `radial-gradient(120% 100% at 0% 0%, ${rgb}, transparent 60%)` }}
        />
      )}
      <div className="relative">
        {collapsible ? (
          <button className="w-full text-left" onClick={() => setOpen(o => !o)}>{Header}</button>
        ) : Header}
        {(!collapsible || open) && (
          <div className={title || desc || Icon ? 'mt-5' : ''}>{children}</div>
        )}
      </div>
    </motion.section>
  );
}
