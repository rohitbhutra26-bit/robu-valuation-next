'use client';
import { useEffect, useState } from 'react';
import { cachedJson } from '@/lib/clientCache';
import { Company } from '@/lib/types';
import { Zap, TrendingUp, TrendingDown, Minus } from '@/lib/icons';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://robu-data-server-production.up.railway.app';
interface Q { quarter: string; revenue: number; pat: number; opm: number; eps: number }
interface Ann { subject?: string; title?: string; date?: string }

const MON: Record<string, number> = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
const qKey = (l: string) => { const m = String(l).toLowerCase().match(/([a-z]{3})\s*'?(\d{2,4})/); if (!m) return 0; let y = parseInt(m[2],10); if (y<100) y+=2000; return y*100 + (MON[m[1]]||0); };
const pct = (c: number, b: number) => (b === 0 ? 0 : ((c - b) / Math.abs(b)) * 100);
const RESULTS_RE = /financial result|quarterly result|\bresults\b|outcome of board|un-?audited|audited financial|board meeting.*(financ|result)/i;

export default function EarningsFlash({ company }: { company: Company }) {
  const [q, setQ] = useState<Q[]>([]);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    let on = true;
    const base = process.env.NEXT_PUBLIC_DATA_SERVER_URL || '';
    Promise.all([
      cachedJson(`${base}/api/quarterly/${company.symbol}`).then(d => d ?? []).catch(() => []),
      cachedJson(`${API}/announcements/${company.symbol}`).then(d => d ?? {}).catch(() => ({})),
    ]).then(([qd, ad]) => {
      if (!on) return;
      setQ(Array.isArray(qd) ? qd : []);
      const anns = (((ad as any).announcements || ad || []) as Ann[]).slice(0, 7);
      setFresh(anns.some(a => RESULTS_RE.test(a.subject || a.title || '')));
    });
    return () => { on = false; };
  }, [company.symbol]);

  if (!fresh || q.length < 5) return null;
  const s = [...q].sort((a, b) => qKey(a.quarter) - qKey(b.quarter)); // oldest→newest
  const now = s[s.length - 1], yoy = s[s.length - 5];
  if (!now || !yoy) return null;
  const revG = pct(now.revenue, yoy.revenue), patG = pct(now.pat, yoy.pat), oppp = now.opm - yoy.opm;

  const good = revG > 8 && patG > 8, bad = patG < -5 || revG < -3;
  const wrapCls = good ? 'bg-gain/5 border-gain/25' : bad ? 'bg-loss/5 border-loss/25' : 'bg-warning/5 border-warning/25';
  const toneCls = good ? 'text-gain' : bad ? 'text-loss' : 'text-warning';
  const word = good ? 'Strong quarter' : bad ? 'Soft quarter' : 'Mixed quarter';
  const Icon = good ? TrendingUp : bad ? TrendingDown : Minus;
  const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(0)}%`;

  return (
    <div className={`rounded-2xl border p-4 ${wrapCls}`}>
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} className="text-gold" />
        <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-gold">Just reported · {now.quarter}</span>
        <span className={`ml-auto flex items-center gap-1 text-sm font-semibold ${toneCls}`}><Icon size={14} />{word}</span>
      </div>
      <p className="text-[13px] text-primary/90 leading-relaxed">
        Revenue <b className={toneCls}>{fmt(revG)}</b> and profit <b className={toneCls}>{fmt(patG)}</b> vs the same quarter last year,
        with operating margin {oppp >= 0.5 ? <>expanding to <b>{now.opm.toFixed(0)}%</b></> : oppp <= -0.5 ? <>slipping to <b>{now.opm.toFixed(0)}%</b></> : <>steady near <b>{now.opm.toFixed(0)}%</b></>}.
      </p>
      <p className="text-[11px] text-muted mt-1.5">EPS ₹{now.eps.toFixed(1)} this quarter (vs ₹{yoy.eps.toFixed(1)} a year ago). Year-on-year so seasonal swings don't mislead.</p>
    </div>
  );
}
