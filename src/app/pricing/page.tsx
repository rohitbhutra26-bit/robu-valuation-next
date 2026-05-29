'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, Zap, BarChart2, Brain, FileText, Search, TrendingUp, ShieldCheck, Star } from 'lucide-react';

// ── Plan data ─────────────────────────────────────────────────────────────────
const BILLING = [
  { id: '1m',  label: '1 Month',  price: 99,  perMonth: 99,  save: null,  popular: false },
  { id: '3m',  label: '3 Months', price: 259, perMonth: 86,  save: '13%', popular: false },
  { id: '6m',  label: '6 Months', price: 499, perMonth: 83,  save: '17%', popular: true  },
  { id: '1y',  label: '1 Year',   price: 999, perMonth: 83,  save: '17%', popular: false },
] as const;
type BillingId = typeof BILLING[number]['id'];

const FEATURES = [
  { icon: <TrendingUp size={15}/>, label: 'Stock Analysis',     desc: 'Deep-dive valuation for any NSE/BSE stock', free: 'Unlimited',      pro: 'Unlimited' },
  { icon: <BarChart2  size={15}/>, label: 'Valuation Engine',   desc: 'DCF, P/E, PEG, Earnings Yield models',      free: 'All models',     pro: 'All models' },
  { icon: <Search     size={15}/>, label: 'Stock Screener',     desc: 'Filter all NSE stocks by ROE, P/E & more',  free: 'Top 5 results',  pro: '60+ results' },
  { icon: <Brain      size={15}/>, label: 'AI Analysis',        desc: 'Bull/Bear thesis powered by Gemini AI',     free: 'Rule-based',     pro: 'Full Gemini AI' },
  { icon: <FileText   size={15}/>, label: 'Export PDF Report',  desc: 'Download full analysis report',             free: false,            pro: true },
  { icon: <BarChart2  size={15}/>, label: 'Historical Chart',   desc: 'P/E & P/B going back 5+ years',             free: true,             pro: true },
  { icon: <ShieldCheck size={15}/>,label: 'Peer Compare',       desc: 'AI-identified competitors side-by-side',    free: true,             pro: true },
  { icon: <Star       size={15}/>, label: 'Watchlist & Portfolio', desc: 'Track stocks, import from brokers',      free: true,             pro: true },
];

const FAQS = [
  { q: 'What payment methods are accepted?', a: 'UPI, Debit/Credit Card, Net Banking, and Wallets via Razorpay. All payments are in ₹ INR.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No auto-renewals. Pay once, access for the full duration you chose.' },
  { q: 'Is this SEBI registered investment advice?', a: 'No. Robu Terminal is a research and analysis tool for personal use. All valuations are models — not buy/sell recommendations.' },
  { q: 'What data sources does Robu use?', a: 'NSE Bhavcopy for live prices, Screener.in for fundamentals, and Gemini AI for analysis. All Indian market data.' },
  { q: 'Do I need an account to use the free plan?', a: 'No signup needed for the free plan. Open the app and start analysing any stock instantly.' },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true)  return <Check size={16} className="text-[#26a69a] mx-auto" />;
  if (value === false) return <X    size={16} className="mx-auto opacity-25" />;
  return <span className="text-sm font-semibold">{value}</span>;
}

// ── Hero chart SVG (TradingView-style candlestick/line) ───────────────────────
function HeroChart() {
  return (
    <div className="relative w-full max-w-2xl mx-auto h-48 sm:h-64 mt-10 mb-2 opacity-60">
      <svg viewBox="0 0 800 220" className="w-full h-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[40, 80, 120, 160].map(y => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="currentColor" strokeWidth="0.5" className="text-[#2a2e39]" strokeDasharray="4 6"/>
        ))}
        {/* Area fill */}
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#26a69a" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#26a69a" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path
          d="M0,180 L40,165 L80,155 L120,160 L160,145 L200,130 L240,120 L280,125 L320,105 L360,90 L400,95 L440,80 L480,70 L520,75 L560,60 L600,50 L640,55 L680,40 L720,35 L760,25 L800,20 L800,220 L0,220 Z"
          fill="url(#chartGrad)"
        />
        {/* Main line */}
        <path
          d="M0,180 L40,165 L80,155 L120,160 L160,145 L200,130 L240,120 L280,125 L320,105 L360,90 L400,95 L440,80 L480,70 L520,75 L560,60 L600,50 L640,55 L680,40 L720,35 L760,25 L800,20"
          fill="none" stroke="#26a69a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        />
        {/* Glow dot at end */}
        <circle cx="800" cy="20" r="5" fill="#26a69a"/>
        <circle cx="800" cy="20" r="9" fill="#26a69a" fillOpacity="0.2"/>
        {/* Price labels */}
        <text x="10" y="38" fill="#787b86" fontSize="10" fontFamily="monospace">₹4,250</text>
        <text x="10" y="128" fill="#787b86" fontSize="10" fontFamily="monospace">₹3,800</text>
        <text x="10" y="178" fill="#787b86" fontSize="10" fontFamily="monospace">₹3,400</text>
        {/* Volume bars at bottom */}
        {[0,40,80,120,160,200,240,280,320,360,400,440,480,520,560,600,640,680,720,760].map((x, i) => (
          <rect key={x} x={x+2} y={195 + (i % 3 === 0 ? 0 : 5)} width="28" height={i % 3 === 0 ? 20 : 15}
            fill="#26a69a" fillOpacity="0.15" rx="1"/>
        ))}
      </svg>
      {/* Floating metric chips */}
      <div className="absolute top-2 right-4 flex flex-col gap-1.5">
        <div className="bg-[#1e222d] border border-[#26a69a]/30 rounded-lg px-3 py-1.5 text-xs font-bold font-mono text-[#26a69a] shadow-lg">
          +34.2% ↑
        </div>
        <div className="bg-[#1e222d] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-[#d1d4dc] shadow-lg">
          PE 22.4x
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [selected, setSelected] = useState<BillingId>('6m');
  const [openFaq, setOpenFaq]   = useState<number | null>(null);
  const plan = BILLING.find(b => b.id === selected)!;

  return (
    <div style={{
        '--pricing-bg':     '#131722',
        '--pricing-text':   '#d1d4dc',
        '--pricing-card':   '#1e222d',
        '--pricing-border': 'rgba(255,255,255,0.08)',
        '--pricing-muted':  'rgba(255,255,255,0.4)',
        '--pricing-green':  '#26a69a',
        '--pricing-blue':   '#2962ff',
        background:  'var(--pricing-bg)',
        color:       'var(--pricing-text)',
        fontFamily:  'var(--font-sans)',
        minHeight:   '100vh',
        overflowY:   'auto',
        overflowX:   'hidden',
      } as React.CSSProperties}
    >
      {/* Light mode: override CSS vars directly on root element */}
      <style>{`
        [data-theme="light"] #pricing-root {
          --pricing-bg:     #f2f3f7 !important;
          --pricing-text:   #131722 !important;
          --pricing-card:   #ffffff !important;
          --pricing-border: rgba(0,0,0,0.09) !important;
          --pricing-muted:  rgba(0,0,0,0.5) !important;
        }
        [data-theme="light"] .pricing-hero-chart { opacity: 0.35; }
        [data-theme="light"] .pricing-glow { display: none; }
        [data-theme="light"] .pricing-toggle { background: rgba(0,0,0,0.06) !important; }
        [data-theme="light"] .pricing-card-free { background: #ffffff !important; }
        [data-theme="light"] .pricing-card-pro { background: linear-gradient(135deg, #eaf3ff 0%, #f0fdf9 100%) !important; }
      `}</style>

      <div id="pricing-root">

        {/* ── Nav ────────────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-50 border-b border-white/8 pricing-footer-border"
          style={{ background: 'var(--pricing-bg)', backdropFilter: 'blur(16px)' }}>
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(41,98,255,0.15)', border: '1px solid rgba(41,98,255,0.3)' }}>
                <Zap size={14} style={{ color: '#2962ff' }} />
              </div>
              <span className="text-sm font-black tracking-tight" style={{ color: 'var(--pricing-text)' }}>Robu Terminal</span>
            </Link>
            <Link href="/" className="text-sm font-semibold transition-colors"
              style={{ color: 'var(--pricing-muted)' }}>
              ← Back to app
            </Link>
          </div>
        </nav>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-16 pb-4 px-6 text-center">
          {/* Background glow */}
          <div className="pricing-glow absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[140px]"
              style={{ background: 'radial-gradient(ellipse, rgba(41,98,255,0.12) 0%, transparent 70%)' }}/>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full blur-[100px]"
              style={{ background: 'radial-gradient(ellipse, rgba(38,166,154,0.1) 0%, transparent 70%)' }}/>
          </div>

          <div className="relative max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase mb-7 pricing-badge"
              style={{ background: 'rgba(41,98,255,0.12)', border: '1px solid rgba(41,98,255,0.25)', color: '#2962ff' }}>
              <Zap size={11}/> Simple pricing · No hidden fees
            </div>

            <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tighter mb-5">
              Free, until you&apos;re<br/>
              <span style={{ background: 'linear-gradient(135deg, #26a69a 0%, #2962ff 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                ready to go Pro
              </span>
            </h1>

            <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto font-medium"
              style={{ color: 'var(--pricing-muted)' }}>
              Analyse any Indian stock for free. Unlock the full screener,
              Gemini AI analysis, and PDF exports when you need more.
            </p>

            {/* Hero chart */}
            <div className="pricing-hero-chart">
              <HeroChart />
            </div>
          </div>
        </section>

        {/* ── Billing toggle ──────────────────────────────────────────── */}
        <section className="px-6 pb-6 pt-2">
          <div className="max-w-lg mx-auto">
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl pricing-toggle"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--pricing-border)' }}>
              {BILLING.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelected(b.id)}
                  className={`relative py-2.5 rounded-lg text-xs font-bold transition-all pricing-toggle-btn-${selected === b.id ? 'active' : 'inactive'}`}
                  style={selected === b.id
                    ? { background: '#2962ff', color: '#ffffff' }
                    : { color: 'var(--pricing-muted)' }
                  }
                >
                  {b.popular && selected !== b.id && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-black bg-[#26a69a] text-white px-1.5 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wide">
                      Best
                    </span>
                  )}
                  <div>{b.label}</div>
                  {b.save && (
                    <div className={`text-[9px] font-bold mt-0.5 pricing-toggle-btn-save`}
                      style={selected === b.id ? { color: 'rgba(255,255,255,0.7)' } : { color: '#26a69a' }}>
                      Save {b.save}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Plan cards ─────────────────────────────────────────────── */}
        <section className="px-6 pb-16">
          <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-5">

            {/* Free */}
            <div className="rounded-2xl p-7 flex flex-col pricing-card-free"
              style={{ border: '1px solid var(--pricing-border)', background: 'var(--pricing-card)' }}>
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-widest mb-3"
                  style={{ color: 'var(--pricing-muted)' }}>Free</p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-5xl font-black tracking-tighter"
                    style={{ color: 'var(--pricing-text)' }}>₹0</span>
                  <span className="text-sm font-semibold mb-2" style={{ color: 'var(--pricing-muted)' }}>forever</span>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--pricing-muted)' }}>
                  Start analysing stocks right now. No signup needed.
                </p>
              </div>

              <div className="space-y-3 mb-8 flex-1">
                {[
                  { label: 'Unlimited stock analysis', ok: true },
                  { label: 'All valuation models', ok: true },
                  { label: 'Historical P/E chart', ok: true },
                  { label: 'Peer comparison', ok: true },
                  { label: 'Watchlist & Portfolio', ok: true },
                  { label: 'Screener — top 5 only', ok: false },
                  { label: 'Rule-based AI only', ok: false },
                  { label: 'No PDF export', ok: false },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: f.ok ? 'rgba(38,166,154,0.15)' : 'rgba(128,128,128,0.1)' }}>
                      {f.ok
                        ? <Check size={9} style={{ color: '#26a69a' }} />
                        : <X    size={9} style={{ color: 'rgba(128,128,128,0.5)' }} />
                      }
                    </div>
                    <span className={`text-sm font-medium pricing-free-feat${f.ok ? '' : '-dim'}`}
                      style={{ color: f.ok ? 'var(--pricing-text)' : 'var(--pricing-muted)', opacity: f.ok ? 0.85 : 0.45 }}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              <Link href="/" className="block text-center py-3.5 rounded-xl text-sm font-bold transition-all"
                style={{ border: '1px solid var(--pricing-border)', color: 'var(--pricing-muted)' }}>
                Start for free →
              </Link>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl p-7 flex flex-col pricing-card-pro overflow-hidden"
              style={{ border: '1px solid rgba(41,98,255,0.4)',
                background: 'linear-gradient(135deg, rgba(41,98,255,0.08) 0%, rgba(38,166,154,0.05) 100%)' }}>
              <div className="pricing-glow absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
                style={{ background: 'rgba(41,98,255,0.12)' }} />

              <div className="relative mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#2962ff' }}>Pro</p>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full"
                    style={{ background: 'rgba(41,98,255,0.12)', color: '#2962ff', border: '1px solid rgba(41,98,255,0.25)' }}>
                    Unlock all
                  </span>
                </div>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-5xl font-black tracking-tighter" style={{ color: 'var(--pricing-text)' }}>
                    ₹{plan.price}
                  </span>
                  <span className="text-sm font-semibold mb-2" style={{ color: 'var(--pricing-muted)' }}>
                    / {plan.label.toLowerCase()}
                  </span>
                </div>
                {plan.perMonth < 99 ? (
                  <p className="text-sm font-bold" style={{ color: '#26a69a' }}>
                    ₹{plan.perMonth}/month ·{' '}
                    <span className="font-medium" style={{ color: 'var(--pricing-muted)' }}>
                      save {plan.save} vs monthly
                    </span>
                  </p>
                ) : (
                  <p className="text-sm font-medium" style={{ color: 'var(--pricing-muted)' }}>
                    Billed once · No auto-renewal
                  </p>
                )}
              </div>

              <div className="relative space-y-3 mb-8 flex-1">
                {[
                  'Unlimited stock analysis',
                  'All valuation models',
                  'Historical P/E chart',
                  'AI-powered peer comparison',
                  'Watchlist & Portfolio',
                  'Full screener — 60+ stocks',
                  'Gemini AI analysis',
                  'PDF export reports',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(41,98,255,0.15)' }}>
                      <Check size={9} style={{ color: '#2962ff' }} />
                    </div>
                    <span className="text-sm font-semibold pricing-pro-feat"
                      style={{ color: 'var(--pricing-text)', opacity: 0.9 }}>{f}</span>
                  </div>
                ))}
              </div>

              <button className="relative w-full py-4 rounded-xl text-sm font-black tracking-wide transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #2962ff 0%, #1565c0 100%)',
                  color: '#ffffff', boxShadow: '0 8px 32px rgba(41,98,255,0.35)' }}>
                Get Pro — ₹{plan.price}
              </button>
              <p className="relative text-center text-xs font-medium mt-2.5"
                style={{ color: 'var(--pricing-muted)' }}>
                One-time · No subscription · No auto-renewal
              </p>
            </div>
          </div>
        </section>

        {/* ── Feature table ───────────────────────────────────────────── */}
        <section className="px-6 pb-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-center mb-2"
              style={{ color: 'var(--pricing-text)' }}>Everything in the box</h2>
            <p className="text-sm font-medium text-center mb-10" style={{ color: 'var(--pricing-muted)' }}>
              Free vs Pro — side by side
            </p>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--pricing-border)' }}>
              <div className="grid grid-cols-[1fr_100px_100px] px-6 py-3"
                style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--pricing-border)' }}>
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--pricing-muted)' }}>Feature</span>
                <span className="text-xs font-black uppercase tracking-widest text-center" style={{ color: 'var(--pricing-muted)' }}>Free</span>
                <span className="text-xs font-black uppercase tracking-widest text-center" style={{ color: '#2962ff' }}>Pro</span>
              </div>
              {FEATURES.map((f, i) => (
                <div key={f.label}
                  className={`grid grid-cols-[1fr_100px_100px] px-6 py-4 pricing-table-row-alt`}
                  style={{ borderBottom: '1px solid var(--pricing-border)', background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0" style={{ color: 'var(--pricing-muted)' }}>{f.icon}</div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--pricing-text)' }}>{f.label}</p>
                      <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--pricing-muted)' }}>{f.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center" style={{ color: 'var(--pricing-text)' }}>
                    <Cell value={f.free} />
                  </div>
                  <div className="flex items-center justify-center" style={{ color: 'var(--pricing-text)' }}>
                    <Cell value={f.pro} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats bar ─────────────────────────────────────────────────── */}
        <section className="px-6 py-14 mb-4" style={{ borderTop: '1px solid var(--pricing-border)', borderBottom: '1px solid var(--pricing-border)' }}>
          <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
            {[
              { num: '5,000+', label: 'Stocks tracked' },
              { num: 'NSE + BSE', label: 'Exchange coverage' },
              { num: '10+ models', label: 'Valuation methods' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl sm:text-4xl font-black tracking-tighter pricing-stat-num"
                  style={{ background: 'linear-gradient(135deg, #26a69a 0%, #2962ff 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {s.num}
                </p>
                <p className="text-xs sm:text-sm font-semibold mt-1.5" style={{ color: 'var(--pricing-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="px-6 py-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-black tracking-tighter text-center mb-10"
              style={{ color: 'var(--pricing-text)' }}>
              Frequently asked questions
            </h2>
            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <div key={i} className="rounded-xl overflow-hidden pricing-faq"
                  style={{ border: '1px solid var(--pricing-border)' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors"
                  >
                    <span className="text-sm font-bold" style={{ color: 'var(--pricing-text)' }}>{faq.q}</span>
                    <span className="text-xl font-bold flex-shrink-0 transition-transform"
                      style={{ color: 'var(--pricing-muted)', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                      +
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--pricing-border)' }}>
                      <p className="text-sm font-medium leading-relaxed pt-4" style={{ color: 'var(--pricing-muted)' }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer CTA ───────────────────────────────────────────────── */}
        <section className="relative px-6 pb-16 pt-8 text-center overflow-hidden">
          <div className="pricing-glow absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full blur-[100px]"
              style={{ background: 'rgba(41,98,255,0.08)' }}/>
          </div>
          <div className="relative max-w-lg mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-3"
              style={{ color: 'var(--pricing-text)' }}>
              Start analysing smarter
            </h2>
            <p className="text-sm font-medium mb-8" style={{ color: 'var(--pricing-muted)' }}>
              Free forever for core analysis. Go Pro for the full picture.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/"
                className="px-8 py-4 rounded-xl text-sm font-black tracking-wide transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #2962ff 0%, #1565c0 100%)',
                  color: '#ffffff', boxShadow: '0 8px 24px rgba(41,98,255,0.3)' }}>
                Try for free →
              </Link>
              <button
                onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
                className="px-8 py-4 rounded-xl text-sm font-bold transition-all"
                style={{ border: '1px solid var(--pricing-border)', color: 'var(--pricing-muted)' }}>
                See Pro plans
              </button>
            </div>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="px-6 py-8 pricing-footer-border" style={{ borderTop: '1px solid var(--pricing-border)' }}>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'rgba(41,98,255,0.15)', border: '1px solid rgba(41,98,255,0.3)' }}>
                <Zap size={11} style={{ color: '#2962ff' }} />
              </div>
              <span className="text-sm font-black" style={{ color: 'var(--pricing-text)' }}>Robu Terminal</span>
            </div>
            <p className="text-xs font-medium text-center" style={{ color: 'var(--pricing-muted)' }}>
              Not SEBI registered · For personal research only · Data from NSE, Yahoo Finance
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--pricing-muted)' }}>© 2025 Robu Terminal</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
