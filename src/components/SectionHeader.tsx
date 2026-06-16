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
    <div id={id} className="pt-8 pb-2 scroll-mt-24">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gold/10 border border-gold/20 text-gold flex-shrink-0">
            <Icon size={20} strokeWidth={2} />
          </span>
        )}
        <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">{title}</h2>
        <div className="flex-1 border-t border-border/50" />
      </div>
      <p className="text-[15px] text-muted mt-2.5 leading-relaxed max-w-2xl">{desc}</p>
    </div>
  );
}
