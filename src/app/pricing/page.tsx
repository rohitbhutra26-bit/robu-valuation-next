'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, Zap, BarChart2, Brain, FileText, Search, TrendingUp, ShieldCheck, Star } from 'lucide-react';

// ── Plan data ─────────────────────────────────────────────────────────────────
const BILLING = [
  { id: '1m',  label: '1 Month',   price: 99,   perMonth: 99,   save: null,   popular: false },
  { id: '3m',  label: '3 Months',  price: 259,  perMonth: 86,   save: '13%',  popular: false },
  { id: '6m',  label: '6 Months',  price: 499,  perMonth: 83,   save: '17%',  popular: true  },
  { id: '1y',  label: '1 Year',    price: 999,  perMonth: 83,   save: '17%',  popular: false },
] as const;

type BillingId = typeof BILLING[number]['id'];

// ── Feature rows ──────────────────────────────────────────────────────────────
const FEATURES: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  free: string | boolean;
  pro: string | boolean;
}[] = [
  {
    icon: <TrendingUp size={15} />,
    label: 'Stock Analysis',
    desc: 'Deep-dive valuation for any NSE/BSE stock',
    free: 'Unlimited',
    pro: 'Unlimited',
  },
  {
    icon: <BarChart2 size={15} />,
    label: 'Valuation Engine',
    desc: 'DCF, P/E, PEG, Earnings Yield models',
    free: 'All models',
    pro: 'All models',
  },
  {
    icon: <Search size={15} />,
    label: 'Stock Screener',
    desc: 'Filter all NSE stocks by ROE, P/E, margins & more',
    free: 'Top 5 results',
    pro: 'Full 60+ results',
  },
  {
    icon: <Brain size={15} />,
    label: 'AI Analysis',
    desc: 'Bull/Bear thesis powered by Gemini AI',
    free: 'Rule-based only',
    pro: 'Full Gemini AI',
  },
  {
    icon: <FileText size={15} />,
    label: 'Export PDF Report',
    desc: 'Download a full analysis report for any stock',
    free: false,
    pro: true,
  },
  {
    icon: <BarChart2 size={15} />,
    label: 'Historical Valuation',
    desc: 'P/E & P/B chart going back 5+ years',
    free: true,
    pro: true,
  },
  {
    icon: <ShieldCheck size={15} />,
    label: 'Peer Compare',
    desc: 'AI-identified competitors, side-by-side metrics',
    free: true,
    pro: true,
  },
  {
    icon: <Star size={15} />,
    label: 'Watchlist & Portfolio',
    desc: 'Track stocks, import from Zerodha/Groww/Kotak',
    free: true,
    pro: true,
  },
];

// ── Cell renderer ─────────────────────────────────────────────────────────────
function Cell({ value }: { value: string | boolean }) {
  if (value === true)  return <Check size={16} className="text-[#22d3a5] mx-auto" />;
  if (value === false) return <X    size={16} className="text-white/20 mx-auto" />;
  return <span className="text-sm font-medium text-white/80">{value}</span>;
}

// ── FAQ data ──────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'What payment methods are accepted?',
    a: 'UPI, Debit/Credit Card, Net Banking, and Wallets via Razorpay. All payments are in ₹ INR.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. There are no auto-renewals. You pay once and get access for the full duration you chose.',
  },
  {
    q: 'Is this SEBI registered investment advice?',
    a: 'No. Robu Terminal is a research and analysis tool for personal use. All valuations are models — not buy/sell recommendations.',
  },
  {
    q: 'What data sources does Robu use?',
    a: 'NSE Bhavcopy for live prices, Screener.in for fundamentals, and Gemini AI for analysis. All Indian stock data.',
  },
  {
    q: 'Do I need an account to use the free plan?',
    a: 'No signup needed for the free plan. Just open the app and start analysing any stock instantly.',
  },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [selected, setSelected] = useState<BillingId>('6m');
  const [openFaq, setOpenFaq]   = useState<number | null>(null);

  const plan = BILLING.find(b => b.id === selected)!;

  return (
    <div className="min-h-screen bg-[#070d16] text-white font-sans">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#070d16]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#22d3a5]/15 border border-[#22d3a5]/30 flex items-center justify-center">
              <Zap size={14} className="text-[#22d3a5]" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">Robu Terminal</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            ← Back to app
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-16 px-6 text-center">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#22d3a5]/8 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#22d3a5]/10 border border-[#22d3a5]/25 rounded-full px-4 py-1.5 text-xs font-semibold text-[#22d3a5] tracking-wide uppercase mb-6">
            <Zap size={11} />
            Simple pricing · No hidden fees
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-5">
            Free, until you&apos;re{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22d3a5] to-[#60a5fa]">
              ready to go Pro
            </span>
          </h1>

          <p className="text-white/55 text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
            Analyse any Indian stock for free. Unlock the screener, AI analysis,
            and PDF exports when you&apos;re ready to go deeper.
          </p>
        </div>
      </section>

      {/* ── Billing toggle ── */}
      <section className="px-6 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="grid grid-cols-4 gap-1 p-1 bg-white/5 border border-white/8 rounded-xl">
            {BILLING.map(b => (
              <button
                key={b.id}
                onClick={() => setSelected(b.id)}
                className={`relative py-2 rounded-lg text-xs font-semibold transition-all ${
                  selected === b.id
                    ? 'bg-[#22d3a5] text-[#070d16]'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {b.popular && selected !== b.id && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-[#60a5fa] text-[#070d16] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    BEST VALUE
                  </span>
                )}
                <div>{b.label}</div>
                {b.save && (
                  <div className={`text-[9px] font-bold mt-0.5 ${selected === b.id ? 'text-[#070d16]/70' : 'text-[#22d3a5]'}`}>
                    Save {b.save}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plan cards ── */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-4 mt-6">

          {/* Free card */}
          <div className="rounded-2xl border border-white/10 bg-white/4 p-7 flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Free</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold">₹0</span>
                <span className="text-white/40 text-sm mb-1.5">forever</span>
              </div>
              <p className="text-white/50 text-sm">Start analysing stocks right now. No signup needed.</p>
            </div>

            <div className="space-y-3 mb-8 flex-1">
              {['Unlimited stock analysis', 'All valuation models', 'Historical P/E chart', 'Peer comparison', 'Watchlist & Portfolio', 'Screener — top 5 only', 'Rule-based AI (no Gemini)'].map((f, i) => {
                const isLimited = i >= 5;
                return (
                  <div key={f} className="flex items-center gap-2.5">
                    {isLimited
                      ? <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"><X size={9} className="text-white/30" /></div>
                      : <div className="w-4 h-4 rounded-full bg-[#22d3a5]/15 flex items-center justify-center flex-shrink-0"><Check size={9} className="text-[#22d3a5]" /></div>
                    }
                    <span className={`text-sm ${isLimited ? 'text-white/35' : 'text-white/75'}`}>{f}</span>
                  </div>
                );
              })}
            </div>

            <Link
              href="/"
              className="block text-center py-3 rounded-xl border border-white/15 text-sm font-semibold text-white/70 hover:text-white hover:border-white/30 transition-all"
            >
              Start for free →
            </Link>
          </div>

          {/* Pro card */}
          <div className="relative rounded-2xl border border-[#22d3a5]/40 bg-gradient-to-b from-[#22d3a5]/8 to-transparent p-7 flex flex-col">
            {/* Glow */}
            <div className="absolute inset-0 rounded-2xl bg-[#22d3a5]/4 blur-xl pointer-events-none" />

            <div className="relative mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[#22d3a5]">Pro</p>
                <span className="text-[10px] font-bold bg-[#22d3a5]/15 text-[#22d3a5] border border-[#22d3a5]/30 px-2 py-0.5 rounded-full">
                  UNLOCK ALL
                </span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold">₹{plan.price}</span>
                <span className="text-white/40 text-sm mb-1.5">/ {plan.label.toLowerCase()}</span>
              </div>
              {plan.perMonth < 99 && (
                <p className="text-[#22d3a5] text-sm font-semibold">
                  ₹{plan.perMonth}/month · <span className="text-white/40 font-normal">Save {plan.save} vs monthly</span>
                </p>
              )}
              {plan.id === '1m' && (
                <p className="text-white/40 text-sm">Billed once, no auto-renewal</p>
              )}
            </div>

            <div className="relative space-y-3 mb-8 flex-1">
              {[
                'Unlimited stock analysis',
                'All valuation models',
                'Historical P/E chart',
                'Peer comparison (AI-powered)',
                'Watchlist & Portfolio',
                'Full screener — 60+ stocks',
                'Gemini AI analysis',
                'PDF export reports',
              ].map(f => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#22d3a5]/20 flex items-center justify-center flex-shrink-0">
                    <Check size={9} className="text-[#22d3a5]" />
                  </div>
                  <span className="text-sm text-white/80">{f}</span>
                </div>
              ))}
            </div>

            <button className="relative w-full py-3.5 rounded-xl bg-[#22d3a5] text-[#070d16] text-sm font-bold hover:bg-[#1fc998] active:scale-[0.98] transition-all shadow-lg shadow-[#22d3a5]/20">
              Get Pro — ₹{plan.price}
            </button>
            <p className="relative text-center text-[10px] text-white/30 mt-2.5">
              One-time payment · No subscription · No auto-renewal
            </p>
          </div>
        </div>
      </section>

      {/* ── Feature comparison table ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Everything in the box</h2>
          <p className="text-white/40 text-sm text-center mb-10">Free vs Pro — side by side</p>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_100px_100px] bg-white/5 border-b border-white/8 px-6 py-3">
              <span className="text-xs font-bold uppercase tracking-widest text-white/40">Feature</span>
              <span className="text-xs font-bold uppercase tracking-widest text-white/40 text-center">Free</span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#22d3a5] text-center">Pro</span>
            </div>

            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className={`grid grid-cols-[1fr_100px_100px] px-6 py-4 border-b border-white/5 last:border-0 ${
                  i % 2 === 0 ? '' : 'bg-white/2'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="text-white/40 mt-0.5 flex-shrink-0">{f.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/90 leading-tight">{f.label}</p>
                    <p className="text-[11px] text-white/35 mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <Cell value={f.free} />
                </div>
                <div className="flex items-center justify-center">
                  <Cell value={f.pro} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-white/8 py-10 px-6 mb-20">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { num: '5,000+', label: 'Stocks tracked' },
            { num: 'NSE + BSE', label: 'Exchange coverage' },
            { num: '10+ models', label: 'Valuation methods' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#22d3a5] to-[#60a5fa]">
                {s.num}
              </p>
              <p className="text-white/40 text-xs sm:text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="border border-white/10 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors"
                >
                  <span className="text-sm font-semibold text-white/85">{faq.q}</span>
                  <span className={`text-white/40 text-lg flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 border-t border-white/8">
                    <p className="text-sm text-white/50 leading-relaxed pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="relative px-6 pb-20 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-[#22d3a5]/6 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-lg mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            Start analysing smarter
          </h2>
          <p className="text-white/40 text-sm mb-8">
            Free forever for basic analysis. Go Pro when you need the full picture.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-8 py-3.5 rounded-xl bg-[#22d3a5] text-[#070d16] text-sm font-bold hover:bg-[#1fc998] transition-all shadow-lg shadow-[#22d3a5]/20"
            >
              Try for free →
            </Link>
            <button
              onClick={() => document.getElementById('billing-toggle')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3.5 rounded-xl border border-white/15 text-sm font-semibold text-white/70 hover:text-white hover:border-white/30 transition-all"
            >
              See plans
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#22d3a5]/15 border border-[#22d3a5]/30 flex items-center justify-center">
              <Zap size={11} className="text-[#22d3a5]" />
            </div>
            <span className="text-sm font-bold text-white/70">Robu Terminal</span>
          </div>
          <p className="text-xs text-white/25 text-center">
            Not SEBI registered · For personal research only · Data from NSE, Screener.in
          </p>
          <p className="text-xs text-white/25">© 2025 Robu Terminal</p>
        </div>
      </footer>

    </div>
  );
}
