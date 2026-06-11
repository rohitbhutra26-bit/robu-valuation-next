'use client';

// Prominent section header — big title + one-line human explanation with example.
// Used to break the long report into chapters a first-time investor can follow.
interface Props {
  emoji: string;
  title: string;
  desc: string;
}

export default function SectionHeader({ emoji, title, desc }: Props) {
  return (
    <div className="pt-3 pb-1">
      <div className="flex items-center gap-2.5">
        <span className="text-lg leading-none">{emoji}</span>
        <h2 className="text-base font-bold text-primary tracking-tight">{title}</h2>
        <div className="flex-1 border-t border-border/60" />
      </div>
      <p className="text-xs text-muted mt-1.5 leading-relaxed max-w-2xl">{desc}</p>
    </div>
  );
}
