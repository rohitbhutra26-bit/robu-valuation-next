'use client';
import { useState } from 'react';
import { Company, FinancialYear } from '@/lib/types';
import { getCompanyProfile, getIndustryCagr } from '@/lib/sectorModelMap';
import { runPrimaryModel, suggestAssumptions } from '@/lib/forecastUtils';
import { valuationReliability } from '@/lib/valuationReliability';
import { verdictKey } from '@/lib/verdict';
import { piotroskiFScore } from '@/lib/qualityScores';
import { Download } from '@/lib/icons';

const VERDICT_WORD: Record<string, string> = {
  'very-cheap': 'Looks very cheap', cheap: 'Looks cheap', fair: 'Fairly priced',
  expensive: 'Looks expensive', 'very-expensive': 'Looks very expensive',
};
const C = { bg: '#0A0A0B', card: '#161618', text: '#F6F5F4', muted: '#8d8b93',
  rose: '#FF5C86', gain: '#34d399', warn: '#fbbf24', loss: '#f87171', line: 'rgba(255,255,255,0.10)' };

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  const words = text.split(' '); let line = ''; let yy = y;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = t;
  }
  ctx.fillText(line, x, yy); return yy;
}

export default function ShareVerdictCard({ company, financials }: { company: Company; financials: FinancialYear[] }) {
  const [busy, setBusy] = useState(false);

  const build = (): HTMLCanvasElement => {
    const S = 1080, P = 84;
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, S, S);
    // soft rose wash top-left
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 760); g.addColorStop(0, 'rgba(255,92,134,0.12)'); g.addColorStop(1, 'rgba(255,92,134,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);

    // verdict math (same as the app)
    const profile = getCompanyProfile(company);
    let upside = 0, fair = 0, reliable = true;
    try {
      const rel = valuationReliability(company, financials); reliable = rel.reliable;
      const auto = suggestAssumptions(company, financials, getIndustryCagr(profile.sectorLabel), profile, 5);
      const r = runPrimaryModel(profile.model, financials, company, auto.revenueGrowthRate, auto.netMarginAssumption, auto.exitMultiple, 5);
      fair = Math.max(r.fairValue, 0); upside = fair > 0 && company.currentPrice > 0 ? (fair - company.currentPrice) / company.currentPrice * 100 : 0;
    } catch { reliable = false; }
    const vk = verdictKey(upside);
    const tone = !reliable ? C.warn : (vk === 'cheap' || vk === 'very-cheap') ? C.gain : vk === 'fair' ? C.warn : C.loss;
    const word = !reliable ? 'Hard to value' : VERDICT_WORD[vk];

    // wordmark
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 52px -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = C.text; ctx.fillText('rob', P, 128); const w3 = ctx.measureText('rob').width;
    ctx.fillStyle = C.rose; ctx.fillText('u', P + w3, 128);
    ctx.font = '600 26px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = C.muted;
    ctx.textAlign = 'right'; ctx.fillText('STOCK VERDICT', S - P, 124); ctx.textAlign = 'left';

    // company
    ctx.font = '700 66px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = C.text;
    const yName = wrap(ctx, company.name, P, 300, S - P * 2, 76);
    ctx.font = '500 32px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = C.muted;
    ctx.fillText(`${company.symbol} · ${profile.sectorLabel}`, P, yName + 56);

    // divider
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P, yName + 110); ctx.lineTo(S - P, yName + 110); ctx.stroke();

    // verdict
    ctx.font = '700 104px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = tone;
    ctx.fillText(word, P, yName + 250);
    if (reliable) {
      ctx.font = '700 70px -apple-system, Segoe UI, sans-serif';
      ctx.fillText(`${upside >= 0 ? '+' : ''}${upside.toFixed(0)}%`, P, yName + 340);
      ctx.font = '500 34px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = C.muted;
      ctx.fillText(`${upside >= 0 ? 'possible upside' : 'possible downside'} over 5 years`, P + ctx.measureText(`${upside >= 0 ? '+' : ''}${upside.toFixed(0)}%  `).width + 20, yName + 340);
      ctx.font = '600 38px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = C.text;
      ctx.fillText(`Worth ~₹${fair.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, P, yName + 420);
      ctx.fillStyle = C.muted; ctx.fillText(`  ·  Trading ₹${company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, P + ctx.measureText(`Worth ~₹${fair.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`).width, yName + 420);
    } else {
      ctx.font = '500 36px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = C.muted;
      wrap(ctx, "Loss-making or distorted earnings — Robu won't print a fake number here.", P, yName + 330, S - P * 2, 48);
    }

    // mini stats
    const f = piotroskiFScore(company, financials);
    const stats: [string, string][] = [
      ['P/E', company.pe > 0 ? `${company.pe.toFixed(1)}x` : '—'],
      ['ROE', company.roe > 0 ? `${company.roe.toFixed(0)}%` : '—'],
      ['Quality', f ? `${f.score}/${f.max}` : '—'],
    ];
    let sx = P; const sy = 900;
    stats.forEach(([k, v]) => {
      ctx.font = '500 28px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = C.muted; ctx.fillText(k, sx, sy);
      ctx.font = '700 50px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = C.text; ctx.fillText(v, sx, sy + 56);
      sx += 300;
    });

    // footer
    ctx.font = '500 26px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = C.muted;
    ctx.fillText('Robu — know any stock in plain English.  Research, not investment advice.', P, S - 56);
    return cv;
  };

  const share = async () => {
    setBusy(true);
    try {
      const cv = build();
      await new Promise<void>((res) => cv.toBlob(async (blob) => {
        if (!blob) return res();
        const file = new File([blob], `${company.symbol}-robu-verdict.png`, { type: 'image/png' });
        const nav = navigator as any;
        try {
          if (nav.canShare && nav.canShare({ files: [file] })) {
            await nav.share({ files: [file], title: `${company.symbol} — Robu verdict`, text: `${company.name} on Robu` });
          } else {
            const url = URL.createObjectURL(blob); const a = document.createElement('a');
            a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url);
          }
        } catch { /* user cancelled */ }
        res();
      }, 'image/png'));
    } finally { setBusy(false); }
  };

  return (
    <button onClick={share} disabled={busy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 active:scale-95 transition-all disabled:opacity-60">
      <Download size={14} />{busy ? 'Creating…' : 'Share verdict'}
    </button>
  );
}
