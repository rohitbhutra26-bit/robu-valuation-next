'use client';
import { Company } from '@/lib/types';
import { AlertTriangle } from '@/lib/icons';
export default function FreshnessNote({ company }: { company: Company }) {
  if (!company.stale) return null;
  const when = company.asOf ? new Date(company.asOf * 1000).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'recently';
  return (
    <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning">
      <AlertTriangle size={13} className="flex-shrink-0" />
      <span>Showing last-known data (as of {when}) — the live source was briefly unavailable, so numbers may be slightly behind.</span>
    </div>
  );
}
