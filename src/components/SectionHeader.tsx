'use client';

import type { ComponentType } from 'react';

// Prominent section header — icon chip + big title + one-line human explanation.
// Uses the shared Lucide icon family (never emoji) so every chapter looks like
// it belongs to the same set. Breaks the long report into chapters a first-time
// investor can follow.
interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon?: ComponentType<any>;
  title: string;
  desc: string;
  id?: string;
}

export default function SectionHeader({ Icon, title, desc, id }: Props) {
  return (
    // scroll-mt offsets the sticky top bar so jump-links land below it
    <div id={id} className="pt-3 pb-1 scroll-mt-20">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 text-gold flex-shrink-0">
            <Icon size={15} strokeWidth={2} />
          </span>
        )}
        <h2 className="text-base font-bold text-primary tracking-tight">{title}</h2>
        <div className="flex-1 border-t border-border/60" />
      </div>
      <p className="text-xs text-muted mt-1.5 leading-relaxed max-w-2xl">{desc}</p>
    </div>
  );
}
