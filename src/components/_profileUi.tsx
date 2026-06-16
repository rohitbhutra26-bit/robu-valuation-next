'use client';
import { ReactNode } from 'react';

export function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-terminal/40 border border-border rounded-2xl px-3.5 py-3">
      <p className="text-[11.5px] text-muted mb-1 truncate">{label}</p>
      <p className={`text-lg font-bold font-mono leading-none ${color || 'text-primary'}`}>{value}</p>
      {sub ? <p className="text-[10.5px] text-muted/70 mt-1 truncate">{sub}</p> : null}
    </div>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted leading-relaxed">{children}</p>;
}

export function CardSkeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      <div className="h-4 bg-border/50 rounded w-3/4" />
      <div className="h-3 bg-border/40 rounded w-1/2" />
      <div className="h-12 bg-border/30 rounded-xl w-full mt-3" />
    </div>
  );
}
