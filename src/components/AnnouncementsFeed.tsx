'use client';

import { useEffect, useState } from 'react';
import { Company } from '@/lib/types';

interface Announcement {
  date: string;
  subject: string;
  category: string;
  url: string;
}

export default function AnnouncementsFeed({ company }: { company: Company }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL || 'https://robu-data-server-production.up.railway.app';

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/announcements/${company.symbol}`)
      .then(r => r.json())
      .then(d => setItems(d.announcements || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [company.symbol]);

  if (loading) return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted animate-pulse">Loading NSE announcements...</p>
    </div>
  );

  if (!items.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">Corporate Actions & Announcements</h3>
        <span className="text-[10px] text-muted border border-border px-1.5 py-0.5 rounded">Live</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
            className="block rounded-lg border border-border hover:border-accent/40 hover:bg-accent/3 transition-all p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-primary leading-snug line-clamp-2">{item.subject}</p>
              <span className="text-[10px] text-muted font-mono flex-shrink-0 mt-0.5">{item.date}</span>
            </div>
            {item.category && (
              <span className="text-[10px] text-muted mt-1 inline-block">{item.category}</span>
            )}
          </a>
        ))}
      </div>
      <p className="text-[10px] text-muted">Source: NSE India · Click any to view full filing</p>
    </div>
  );
}
